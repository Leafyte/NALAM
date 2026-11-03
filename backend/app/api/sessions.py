import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from ..db import connect
from ..errors import api_error
from ..questionnaire import safety
from ..questionnaire.questions import QUESTIONS_BY_ID, Question
from ..questionnaire.rules import applicable_questions, next_question
from ..schemas.schemas import (AnswerIn, AnswerOut, QuestionOut, SessionCreate, SessionOut,
                               SessionState, SubmitIn, UrgentNotice)
from ..services import summary as summary_service
from ..services import translation

router = APIRouter(prefix="/api", tags=["patient sessions"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _session(conn, sid: str):
    row = conn.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
    if row is None:
        raise api_error(404, "session_not_found", "Session not found")
    return row


def _rows(conn, sid: str) -> dict:
    return {r["question_id"]: r for r in conn.execute("SELECT * FROM answers WHERE session_id=?", (sid,))}


def _flow(rows: dict) -> list:
    c = rows.get("chief_complaint")
    text = "" if c is None or c["skipped"] else f"{c['text']} {c['translated_text'] or ''}"
    return applicable_questions(text)


def _qout(q: Question, lang: str, flow: list) -> QuestionOut:
    return QuestionOut(id=q.id, text=q.text[lang], hint=(q.hint or {}).get(lang), kind=q.kind, stage=q.stage,
                       required=q.required, position=flow.index(q) + 1, total=len(flow))


def _next_out(rows: dict, lang: str):
    flow = _flow(rows)
    q = next_question(flow, set(rows))
    return flow, (_qout(q, lang, flow) if q else None)


def _translate_to_english(text: str, lang: str):
    """Returns (translated_text, provider, status). Never raises: translation is best-effort."""
    if lang == "en":
        return None, None, "not_needed"
    try:
        r = translation.translate(text, lang, "en")
        return r["translation"], r["provider"], ("mock" if r["is_mock"] else "ok")
    except (translation.TranslationUnavailable, translation.TranslationError):
        return None, None, "unavailable"


@router.post("/sessions", response_model=SessionOut, status_code=201)
def start_session(body: SessionCreate):
    """Start an intake session. Consent is mandatory; no name or phone number is collected."""
    if not body.consent:
        raise api_error(400, "consent_required", "Consent is required before collecting any information")
    sid, now = str(uuid.uuid4()), _now()
    with connect() as conn:
        conn.execute("INSERT INTO sessions (id, language, consent_at, created_at) VALUES (?,?,?,?)",
                     (sid, body.language, now, now))
    flow = applicable_questions("")
    return SessionOut(session_id=sid, language=body.language, next_question=_qout(flow[0], body.language, flow))


@router.get("/sessions/{sid}", response_model=SessionState)
def get_session(sid: str):
    """Everything the app needs to render answers, in questionnaire order (also used for review/edit)."""
    with connect() as conn:
        s = _session(conn, sid)
        rows = _rows(conn, sid)
    lang = s["language"]
    flow, nxt = _next_out(rows, lang)
    items = []
    for q in flow:
        r = rows.get(q.id)
        items.append({
            "question": _qout(q, lang, flow).model_dump(),
            "text": r["text"] if r and not r["skipped"] else None,
            "original_text": r["original_text"] if r and not r["skipped"] else None,
            "translated_text": r["translated_text"] if r else None,
            "input_mode": r["input_mode"] if r else None,
            "transcript_confidence": r["transcript_confidence"] if r else None,
            "edited": bool(r and r["edited"]),
            "skipped": bool(r and r["skipped"]),
            "answered": r is not None,
        })
    return SessionState(session_id=sid, language=lang, status=s["status"], items=items, next_question=nxt)


@router.get("/sessions/{sid}/next", response_model=SessionOut)
def get_next_question(sid: str):
    with connect() as conn:
        s = _session(conn, sid)
        rows = _rows(conn, sid)
    _, nxt = _next_out(rows, s["language"])
    return SessionOut(session_id=sid, language=s["language"], next_question=nxt)


@router.post("/sessions/{sid}/answers", response_model=AnswerOut)
def submit_answer(sid: str, body: AnswerIn):
    """Save or EDIT an answer. The first version is kept in original_text and never overwritten."""
    q = QUESTIONS_BY_ID.get(body.question_id)
    if q is None:
        raise api_error(422, "unknown_question", "Unknown question id")
    with connect() as conn:
        s = _session(conn, sid)
        if s["status"] != "in_progress":
            raise api_error(409, "already_submitted", "This session was already submitted and can no longer be edited")
        rows = _rows(conn, sid)
        if q.id not in {x.id for x in _flow(rows)}:
            raise api_error(422, "question_not_applicable", "This question does not apply to the current answers")
        if body.skipped and q.required:
            raise api_error(422, "required_question", "This question cannot be skipped")
        lang = body.language or s["language"]
        text = body.text
        if q.kind == "severity" and not body.skipped:
            sev = summary_service.parse_severity(text)
            if sev is None:
                raise api_error(422, "invalid_severity", "Severity must be a number from 0 to 10")
            text = str(sev)

        existing = rows.get(q.id)
        original = existing["original_text"] if existing else text
        edited = 1 if (existing and text != original and not body.skipped) else (existing["edited"] if existing else 0)

        translated, provider, status = None, None, "not_needed"
        if not body.skipped:
            if body.translated_text and lang != "en":
                translated, provider, status = body.translated_text.strip(), "client", "ok"
            elif q.kind == "severity":
                status = "not_needed"
            else:
                translated, provider, status = _translate_to_english(text, lang)

        conn.execute(
            """INSERT INTO answers (session_id, question_id, text, original_text, language, input_mode,
                  translated_text, translation_provider, transcript_confidence, edited, skipped, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(session_id, question_id) DO UPDATE SET
                  text=excluded.text, language=excluded.language, input_mode=excluded.input_mode,
                  translated_text=excluded.translated_text, translation_provider=excluded.translation_provider,
                  transcript_confidence=excluded.transcript_confidence, edited=excluded.edited,
                  skipped=excluded.skipped, updated_at=excluded.updated_at""",
            (sid, q.id, "" if body.skipped else text, "" if body.skipped else original, lang, body.input_mode,
             translated, provider, body.transcript_confidence, edited, int(body.skipped), _now()))
        rows = _rows(conn, sid)

    urgent = None
    if not body.skipped:
        hits = [f for src in (text, translated or "") for f in safety.scan(src) if not f["negated"]]
        if hits:
            urgent = UrgentNotice(message=safety.URGENT_MESSAGE[s["language"]],
                                  matched=sorted({h["label"] for h in hits}))
    _, nxt = _next_out(rows, s["language"])
    return AnswerOut(question_id=q.id, text=text, original_text=original, translated_text=translated,
                     translation_status=status, edited=bool(edited), urgent_notice=urgent,
                     next_question=nxt, complete=nxt is None)


@router.post("/sessions/{sid}/submit")
def submit_session(sid: str, body: SubmitIn):
    """Patient confirms accuracy; the structured summary is generated and stored."""
    if not body.confirmed:
        raise api_error(400, "not_confirmed", "The patient must confirm the answers are accurate")
    with connect() as conn:
        s = _session(conn, sid)
        if s["status"] == "submitted":
            row = conn.execute("SELECT summary_json FROM summaries WHERE session_id=?", (sid,)).fetchone()
            return json.loads(row["summary_json"])
        rows = _rows(conn, sid)
        flow = _flow(rows)
        missing = [q.id for q in flow if q.id not in rows]
        if missing:
            raise api_error(409, "incomplete", f"Unanswered questions: {', '.join(missing)}")
        # retry translation for Kannada answers that have none yet
        for qid, r in rows.items():
            if not r["skipped"] and r["language"] != "en" and not r["translated_text"] and QUESTIONS_BY_ID[qid].kind != "severity":
                t, prov, _ = _translate_to_english(r["text"], r["language"])
                if t:
                    conn.execute("UPDATE answers SET translated_text=?, translation_provider=? WHERE session_id=? AND question_id=?",
                                 (t, prov, sid, qid))
        rows = _rows(conn, sid)
        summary = summary_service.build_summary(s, rows, flow)
        now = _now()
        conn.execute("INSERT INTO summaries (session_id, summary_json, created_at) VALUES (?,?,?)",
                     (sid, json.dumps(summary, ensure_ascii=False), now))
        conn.execute("UPDATE sessions SET status='submitted', submitted_at=? WHERE id=?", (now, sid))
    return summary


@router.get("/sessions/{sid}/summary")
def get_summary(sid: str):
    with connect() as conn:
        _session(conn, sid)
        row = conn.execute("SELECT summary_json FROM summaries WHERE session_id=?", (sid,)).fetchone()
    if row is None:
        raise api_error(404, "summary_not_ready", "No summary yet: submit the session first")
    return json.loads(row["summary_json"])
