"""Deterministic follow-up selection. No AI is involved in choosing questions."""
from typing import Optional

from .questions import QUESTIONS_BY_ID, Question

# Keywords (English, Kannada script, and Roman-script Kannada). Lowercase substrings.
FOLLOWUP_TRIGGERS = {
    "fever_detail": ["fever", "temperature", "chills", "ಜ್ವರ", "jwara", "jvara", "jwar",
                     "बुखार", "बुख़ार", "ज्वर", "bukhar", "bukhaar", "காய்ச்சல்", "ஜுரம்", "kaichal", "kaaichal", "juram"],
    "pain_detail": ["pain", "ache", "hurt", "ನೋವ", "ನೋವಿ", "novu", "nov ",
                    "दर्द", "पीड़ा", "dard", "வலி", "vali"],
    "cough_detail": ["cough", "cold", "breath", "ಕೆಮ್ಮ", "ಉಸಿರ", "kemmu", "usir",
                     "खांसी", "खाँसी", "सर्दी", "जुकाम", "सांस", "साँस", "khansi", "khaansi", "zukam",
                     "இருமல்", "சளி", "மூச்சு", "irumal", "moochu"],
    "gi_detail": ["vomit", "nausea", "diarrh", "loose motion", "stomach", "ವಾಂತಿ", "ಬೇಧಿ", "ಹೊಟ್ಟೆ",
                  "vanti", "bedhi", "hotte",
                  "उल्टी", "दस्त", "पेट", "मतली", "ulti", "dast", "pet dard", "pet mein", "pet me ",
                  "வாந்தி", "வயிற்று", "வயிறு", "மயக்கம்", "vaanthi", "vayiru", "vayitru"],
}

ORDER_AFTER_CORE = ["fever_detail", "pain_detail", "cough_detail", "gi_detail"]
ALWAYS_LAST = ["other_symptoms", "additional_info"]
CORE = ["chief_complaint", "onset", "duration", "severity"]


def applicable_questions(chief_complaint_text: str) -> list:
    """Return the ordered list of questions that apply, given the chief complaint."""
    text = (chief_complaint_text or "").lower()
    ids = list(CORE)
    for qid in ORDER_AFTER_CORE:
        if any(k in text for k in FOLLOWUP_TRIGGERS[qid]):
            ids.append(qid)
    ids += ALWAYS_LAST
    return [QUESTIONS_BY_ID[i] for i in ids]


def next_question(flow: list, answered_ids: set) -> Optional[Question]:
    for q in flow:
        if q.id not in answered_ids:
            return q
    return None
