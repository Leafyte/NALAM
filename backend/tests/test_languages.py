"""Every registered language must be complete, and Hindi/Tamil must behave safely."""
import pytest

from app.languages import LANGUAGES
from app.questionnaire.questions import QUESTIONS
from app.questionnaire.rules import FOLLOWUP_TRIGGERS, applicable_questions
from app.questionnaire.safety import URGENT_MESSAGE, scan
from .conftest import answer, finish_flow, start

CODES = sorted(LANGUAGES)


def test_registry_contains_expected_languages():
    assert {"en", "kn", "hi", "ta"} <= set(CODES)
    assert LANGUAGES["en"].draft is False
    assert all(LANGUAGES[c].draft for c in ("kn", "hi", "ta"))   # nothing is clinician-reviewed yet


@pytest.mark.parametrize("code", CODES)
def test_every_question_and_message_exists_in_every_language(code):
    for q in QUESTIONS:
        assert q.text.get(code, "").strip(), f"{q.id} missing text for {code}"
        if q.hint:
            assert q.hint.get(code, "").strip(), f"{q.id} missing hint for {code}"
    assert URGENT_MESSAGE[code].strip() and "112" in URGENT_MESSAGE[code]


@pytest.mark.parametrize("code", CODES)
def test_translated_questions_are_not_just_english_copies(code):
    if code == "en":
        return
    for q in QUESTIONS:
        assert q.text[code] != q.text["en"], f"{q.id} not translated for {code}"


@pytest.mark.parametrize("text,qid", [
    ("मुझे बुखार है", "fever_detail"), ("पेट में दर्द", "pain_detail"), ("खांसी और जुकाम", "cough_detail"),
    ("उल्टी हो रही है", "gi_detail"),
    ("எனக்கு காய்ச்சல்", "fever_detail"), ("தலைவலி", "pain_detail"), ("இருமல்", "cough_detail"),
    ("வாந்தி வருகிறது", "gi_detail"), ("bukhar hai", "fever_detail"), ("kaichal", "fever_detail"),
])
def test_hindi_and_tamil_followup_triggers(text, qid):
    assert qid in [q.id for q in applicable_questions(text)]


def test_every_followup_trigger_list_has_hindi_and_tamil_terms():
    def has(script, terms):
        return any(any(script[0] <= ord(ch) <= script[1] for ch in t) for t in terms)
    for qid, terms in FOLLOWUP_TRIGGERS.items():
        assert has((0x0900, 0x097F), terms), f"{qid}: no Devanagari trigger"
        assert has((0x0B80, 0x0BFF), terms), f"{qid}: no Tamil trigger"


@pytest.mark.parametrize("text,label", [
    ("मुझे सीने में दर्द है", "chest pain"),
    ("मुझे सीने में तेज़ दर्द हो रहा है", "chest pain"),
    ("seene mein dard hai", "chest pain"),
    ("सांस लेने में तकलीफ हो रही है", "difficulty breathing"),
    ("वह बेहोश हो गया", "loss of consciousness"),
    ("मैं मरना चाहता हूँ", "thoughts of self-harm"),
    ("साँप ने काट लिया", "snake or animal bite"),
    ("खून की उल्टी हुई", "severe bleeding"),
    ("மார்பு வலி உள்ளது", "chest pain"),
    ("நெஞ்சு வலி இருக்கிறது", "chest pain"),
    ("மூச்சு விட சிரமமாக உள்ளது", "difficulty breathing"),
    ("அவருக்கு வலிப்பு வந்தது", "seizure"),
    ("தற்கொலை செய்ய தோன்றுகிறது", "thoughts of self-harm"),
    ("இரத்த வாந்தி எடுத்தேன்", "severe bleeding"),
])
def test_hindi_tamil_red_flags_detected(text, label):
    assert (label, False) in [(f["label"], f["negated"]) for f in scan(text)]


@pytest.mark.parametrize("text,label", [
    ("सीने में दर्द नहीं है", "chest pain"),
    ("seene mein dard nahi hai", "chest pain"),
    ("सांस लेने में तकलीफ नहीं है", "difficulty breathing"),
    ("बुखार है लेकिन सीने में दर्द नहीं", "chest pain"),
    ("நெஞ்சு வலி இல்லை", "chest pain"),
    ("நெஞ்சு வலியில்லை", "chest pain"),
    ("மூச்சு விட சிரமம் இல்லை", "difficulty breathing"),
    ("காய்ச்சல் இருக்கிறது ஆனால் நெஞ்சு வலி இல்லை", "chest pain"),
])
def test_hindi_tamil_negation(text, label):
    assert [(f["label"], f["negated"]) for f in scan(text)] == [(label, True)]


@pytest.mark.parametrize("text", [
    "मुझे बुखार है और सीने में दर्द है",          # 'और' (and) ends negation scope: stay conservative
    "காய்ச்சல் இல்லை மற்றும் நெஞ்சு வலி உள்ளது",
])
def test_hindi_tamil_ambiguous_negation_stays_flagged(text):
    assert any(not f["negated"] for f in scan(text))


@pytest.mark.parametrize("text", ["मुझे सिरदर्द है", "सिरदर्द और बुखार है", "எனக்கு தலைவலி உள்ளது",
                                  "தலைவலி மற்றும் காய்ச்சல்"])
def test_ordinary_hindi_tamil_complaints_not_flagged(text):
    assert scan(text) == []


@pytest.mark.parametrize("code,complaint,urgent_word", [
    ("hi", "सीने में दर्द है", "गंभीर"), ("ta", "நெஞ்சு வலி இருக்கிறது", "தீவிர")])
def test_urgent_notice_is_in_patient_language(client, code, complaint, urgent_word):
    sid = start(client, code)
    r = answer(client, sid, "chief_complaint", complaint).json()
    assert r["urgent_notice"] and urgent_word in r["urgent_notice"]["message"] and "112" in r["urgent_notice"]["message"]


@pytest.mark.parametrize("code,complaint", [("hi", "बुखार और खांसी"), ("ta", "காய்ச்சல் மற்றும் இருமல்")])
def test_full_flow_original_preserved_and_draft_flagged(client, monkeypatch, code, complaint):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "mock")
    sid = start(client, code)
    nq = client.get(f"/api/sessions/{sid}/next").json()["next_question"]
    assert nq["text"] and nq["text"] != [q for q in QUESTIONS if q.id == nq["id"]][0].text["en"]
    finish_flow(client, sid, complaint=complaint)
    state = client.get(f"/api/sessions/{sid}").json()
    ids = [i["question"]["id"] for i in state["items"]]
    assert "fever_detail" in ids and "cough_detail" in ids
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["responses"][0]["original_text"] == complaint
    assert s["responses"][0]["translated_text"].startswith("[MOCK TRANSLATION")
    assert s["responses"][0]["question"] != s["responses"][0]["question_en"]
    assert any("UNREVIEWED DRAFT" in n for n in s["uncertainty_notes"])


def test_english_summary_has_no_draft_note(client):
    sid = start(client, "en")
    finish_flow(client, sid)
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert not any("UNREVIEWED DRAFT" in n for n in s["uncertainty_notes"])


def test_hindi_without_translation_provider_keeps_original(client):
    sid = start(client, "hi")
    r = answer(client, sid, "chief_complaint", "सिरदर्द").json()
    assert r["translation_status"] == "unavailable" and r["text"] == "सिरदर्द"


def test_unsupported_language_rejected(client):
    assert client.post("/api/sessions", json={"language": "fr", "consent": True}).status_code == 422
    assert client.post("/api/sessions", json={"language": "xx", "consent": True}).status_code == 422
    assert client.post("/api/translate", json={"text": "hi", "source": "en", "target": "fr"}).status_code == 422


def test_languages_endpoint(client):
    langs = {l["code"]: l for l in client.get("/api/languages").json()}
    assert set(langs) == set(CODES) and langs["hi"]["native"] == "हिन्दी" and langs["ta"]["draft"] is True


@pytest.mark.parametrize("code", ["hi", "ta"])
def test_mock_stt_and_translation_for_new_languages(client, monkeypatch, code):
    monkeypatch.setenv("STT_PROVIDER", "mock"); monkeypatch.setenv("TRANSLATION_PROVIDER", "mock")
    r = client.post("/api/transcribe", files={"file": ("a.m4a", b"abc")}, data={"language": code}).json()
    assert r["is_mock"] and r["text"].startswith("[MOCK TRANSCRIPT]") and len(r["text"]) > 25
    t = client.post("/api/translate", json={"text": "x", "source": code, "target": "en"}).json()
    assert t["is_mock"] and f"{code}->en" in t["translation"]
