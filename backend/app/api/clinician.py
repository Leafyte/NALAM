"""Clinician review interface (LOCAL PROTOTYPE). Protected with HTTP Basic auth.
Disabled until CLINICIAN_PASSWORD is set. Do NOT deploy with real patient data."""
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from ..config import get_settings
from ..db import connect
from ..errors import api_error
from ..schemas.schemas import SummaryCorrection

basic = HTTPBasic(auto_error=False)
router = APIRouter(prefix="/clinician", tags=["clinician (local prototype)"])


def require_clinician(creds: HTTPBasicCredentials = Depends(basic)) -> str:
    s = get_settings()
    if not s.clinician_password:
        raise api_error(503, "clinician_disabled", "Clinician interface is disabled: set CLINICIAN_PASSWORD in backend/.env")
    ok = creds is not None \
        and secrets.compare_digest(creds.username.encode(), s.clinician_username.encode()) \
        and secrets.compare_digest(creds.password.encode(), s.clinician_password.encode())
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail={"code": "unauthorized", "message": "Invalid credentials"},
                            headers={"WWW-Authenticate": 'Basic realm="clinician"'})
    return creds.username


@router.get("", include_in_schema=False)
def clinician_page(_: str = Depends(require_clinician)):
    return FileResponse(Path(__file__).resolve().parent.parent / "static" / "clinician.html")


@router.get("/api/summaries")
def list_summaries(
    status: str | None = None,
    q: str | None = None,
    _: str = Depends(require_clinician)
):
    with connect() as conn:
        rows = conn.execute("""SELECT su.session_id, su.status, su.summary_json, su.created_at
                               FROM summaries su ORDER BY su.created_at DESC""").fetchall()
    out = []
    q_lower = q.lower().strip() if q else None
    for r in rows:
        if status and r["status"] != status:
            continue
        s = json.loads(r["summary_json"])
        if q_lower:
            haystack = f"{r['session_id']} {s.get('main_concern', '')} {s.get('language', '')}".lower()
            if q_lower not in haystack:
                continue
        out.append({"session_id": r["session_id"], "status": r["status"], "submitted_at": r["created_at"],
                    "language": s["language"], "main_concern": s["main_concern"],
                    "urgent": bool(s["urgent_flags"])})
    return out


def _load(conn, sid):
    r = conn.execute("SELECT * FROM summaries WHERE session_id=?", (sid,)).fetchone()
    if r is None:
        raise api_error(404, "summary_not_found", "Summary not found")
    return r


@router.get("/api/summaries/{sid}")
def get_summary(sid: str, _: str = Depends(require_clinician)):
    with connect() as conn:
        r = _load(conn, sid)
    return {"session_id": sid, "status": r["status"], "reviewed_at": r["reviewed_at"], "reviewed_by": r["reviewed_by"],
            "system_summary": json.loads(r["summary_json"]),
            "corrected_summary": json.loads(r["corrected_json"]) if r["corrected_json"] else None}


@router.put("/api/summaries/{sid}")
def correct_summary(sid: str, body: SummaryCorrection, user: str = Depends(require_clinician)):
    """Save a clinician-corrected copy. The system-generated summary is never overwritten."""
    with connect() as conn:
        r = _load(conn, sid)
        if r["status"] == "reviewed":
            raise api_error(409, "already_reviewed", "This summary is already marked reviewed")
        conn.execute("UPDATE summaries SET corrected_json=?, status='corrected' WHERE session_id=?",
                     (json.dumps(body.model_dump(), ensure_ascii=False), sid))
        r = _load(conn, sid)
    return {"session_id": sid, "status": r["status"]}


@router.post("/api/summaries/{sid}/review")
def mark_reviewed(sid: str, user: str = Depends(require_clinician)):
    with connect() as conn:
        _load(conn, sid)
        conn.execute("UPDATE summaries SET status='reviewed', reviewed_at=?, reviewed_by=? WHERE session_id=?",
                     (datetime.now(timezone.utc).isoformat(), user, sid))
    return {"session_id": sid, "status": "reviewed"}
