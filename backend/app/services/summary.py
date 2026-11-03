"""Rule-based summary generation. It only restates what the patient said.
Nothing is inferred, diagnosed, or filled in: missing fields are 'Not provided.'

To add AI summarisation later, implement another function with the same signature as
build_summary() and call it from the submit endpoint; keep the rule-based one as the fallback.
"""
import re
from datetime import datetime, timezone

from ..config import get_settings
from ..languages import LANGUAGES
from ..questionnaire import safety
from ..questionnaire.questions import QUESTIONS_BY_ID

NOT_PROVIDED = "Not provided."
NOTICE = ("This summary only restates what the patient reported through a self-service app. It is not a "
          "diagnosis, not medical advice, and may contain transcription or translation errors. It must be "
          "reviewed and verified by a qualified healthcare professional.")
_KN_DIGITS = str.maketrans("೦೧೨೩೪೫೬೭೮೯", "0123456789")

_NUMBER_WORDS = {
    # English
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "none": 0,
    # Kannada
    "ಸೊನ್ನೆ": 0, "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5,
    "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9, "ಹತ್ತು": 10,
    "sonne": 0, "ondu": 1, "eradu": 2, "mooru": 3, "naalku": 4, "aidu": 5,
    "aaru": 6, "elu": 7, "entu": 8, "ombattu": 9, "hattu": 10,
    # Hindi
    "शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "shunya": 0, "ek": 1, "do": 2, "teen": 3, "chaar": 4, "paanch": 5,
    "chhah": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    # Tamil
    "பூஜ்ஜியம்": 0, "ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5,
    "ஆறு": 6, "ஏழு": 7, "எட்டு": 8, "ஒன்பது": 9, "பத்து": 10,
    "ondru": 1, "irandu": 2, "moondru": 3, "naangu": 4, "aindhu": 5,
    "aaru": 6, "ezhu": 7, "ettu": 8, "onbadhu": 9, "pathu": 10,
}


def parse_severity(text: str):
    """Return int 0-10 if the text contains one (digits, Kannada numerals, or spoken words), else None."""
    if not text:
        return None
    raw = text.strip().lower()
    m = re.search(r"\b(10|[0-9])\b", raw.translate(_KN_DIGITS))
    if m:
        return int(m.group(1))
    for word, val in _NUMBER_WORDS.items():
        if word.isascii():
            if re.search(rf"\b{word}\b", raw):
                return val
        else:
            if word in raw:
                return val
    return None


def _display(row):
    """What the structured field shows: English translation if we have it, else the patient's text."""
    if row is None or row["skipped"]:
        return None
    value = (row["translated_text"] or row["text"] or "").strip()
    return value or None


def build_summary(session, rows: dict, flow: list) -> dict:
    s = get_settings()
    lang = session["language"]
    notes, urgent, negated, responses = [], [], [], []
    seen_urgent = set()
    lang_info = LANGUAGES[lang]
    if lang_info.draft:
        notes.append(f"The {lang_info.english} questions, urgent-care message and red-flag keyword list are an UNREVIEWED DRAFT "
                     f"(not checked by a native-speaking clinician). Red-flag detection may miss symptoms: read the original answers.")

    for q in flow:
        row = rows.get(q.id)
        skipped = row is None or bool(row["skipped"])
        item = {
            "question_id": q.id,
            "question": q.text[lang],
            "question_en": q.text["en"],
            "original_text": None if skipped else row["original_text"],
            "current_text": None if skipped else row["text"],
            "translated_text": None if skipped else row["translated_text"],
            "language": None if row is None else row["language"],
            "input_mode": None if row is None else row["input_mode"],
            "edited": bool(row and row["edited"]),
            "skipped": skipped,
            "transcript_confidence": None if row is None else row["transcript_confidence"],
            "translation_provider": None if row is None else row["translation_provider"],
        }
        responses.append(item)
        if skipped:
            continue

        if row["input_mode"] == "voice":
            c = row["transcript_confidence"]
            if c is None:
                notes.append(f"'{q.id}': voice transcript has no confidence score; verify against the patient.")
            elif c < s.stt_low_confidence:
                notes.append(f"'{q.id}': low speech-recognition confidence ({c:.2f}); verify with the patient.")
        if row["language"] != "en":
            lang_obj = LANGUAGES.get(row["language"])
            src_lang_name = lang_obj.english if lang_obj else row["language"]
            if row["translated_text"]:
                if row["translation_provider"] == "mock":
                    notes.append(f"'{q.id}': translation is a MOCK placeholder, not a real translation.")
                else:
                    notes.append(f"'{q.id}': machine-translated from {src_lang_name}; check against the original.")
            else:
                notes.append(f"'{q.id}': no translation available; shown in the patient's original language.")
        if row["edited"]:
            notes.append(f"'{q.id}': the patient edited this answer after first entering it.")

        for source in (row["text"], row["translated_text"] or ""):
            for f in safety.scan(source):
                key = (f["label"], q.id, f["negated"])
                if key in seen_urgent:
                    continue
                seen_urgent.add(key)
                entry = {"label": f["label"], "question_id": q.id, "snippet": f["snippet"]}
                (negated if f["negated"] else urgent).append(entry)

    def field(qid):
        return _display(rows.get(qid)) or NOT_PROVIDED

    sev_row = rows.get("severity")
    sev_text = _display(sev_row)
    if sev_text:
        n = parse_severity(sev_text)
        severity = f"{n}/10" if n is not None else sev_text
        if n is not None and n >= 9:
            urgent.append({"label": "very high self-rated severity", "question_id": "severity",
                           "snippet": f"{n}/10"})
    else:
        severity = NOT_PROVIDED

    symptom_labels = [("chief_complaint", "Main concern"), ("fever_detail", "Fever details"),
                      ("pain_detail", "Pain details"), ("cough_detail", "Cough/breathing details"),
                      ("gi_detail", "Vomiting/stomach details"), ("other_symptoms", "Other symptoms")]
    symptoms = [f"{label}: {_display(rows.get(qid))}" for qid, label in symptom_labels
                if qid in {q.id for q in flow} and _display(rows.get(qid))]

    return {
        "language": lang,
        "main_concern": field("chief_complaint"),
        "reported_symptoms": symptoms,
        "onset": field("onset"),
        "duration": field("duration"),
        "severity": severity,
        "additional_info": field("additional_info"),
        "urgent_flags": urgent,
        "negated_mentions": negated,
        "responses": responses,
        "uncertainty_notes": notes,
        "notice": NOTICE,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
