import pytest
from .conftest import CLIN, answer, finish_flow, start


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_consent_required_and_language_validated(client):
    assert client.post("/api/sessions", json={"language": "en", "consent": False}).status_code == 400
    assert client.post("/api/sessions", json={"language": "fr", "consent": True}).status_code == 422
    assert client.post("/api/sessions", json={"language": "en"}).status_code == 422


def test_unknown_session_and_question(client):
    assert client.get("/api/sessions/nope").status_code == 404
    sid = start(client)
    assert answer(client, sid, "bogus", "x").status_code == 422


def test_empty_answer_rejected_and_required_cannot_be_skipped(client):
    sid = start(client)
    assert answer(client, sid, "chief_complaint", "   ").status_code == 422
    r = answer(client, sid, "chief_complaint", skipped=True)
    assert r.status_code == 422 and r.json()["detail"]["code"] == "required_question"


def test_severity_validation(client):
    sid = start(client)
    answer(client, sid, "chief_complaint", "headache")
    assert answer(client, sid, "severity", "very bad").status_code == 422
    assert answer(client, sid, "severity", "7").json()["text"] == "7"


def test_full_english_flow_and_summary_does_not_invent(client):
    sid = start(client)
    finish_flow(client, sid, complaint="fever and cough", skip_severity=True)
    state = client.get(f"/api/sessions/{sid}").json()
    qids = [i["question"]["id"] for i in state["items"]]
    assert "fever_detail" in qids and "cough_detail" in qids and "gi_detail" not in qids
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["main_concern"] == "fever and cough"
    assert s["severity"] == "Not provided."
    assert s["additional_info"] == "Not provided."
    assert "reviewed" in s["notice"] and "not a diagnosis" in s["notice"]
    assert client.get(f"/api/sessions/{sid}/summary").json()["main_concern"] == "fever and cough"


def test_submit_requires_confirmation_and_completion(client):
    sid = start(client)
    answer(client, sid, "chief_complaint", "headache")
    assert client.post(f"/api/sessions/{sid}/submit", json={"confirmed": False}).status_code == 400
    r = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "incomplete"
    assert client.get(f"/api/sessions/{sid}/summary").status_code == 404


def test_edit_preserves_original_and_changes_flow(client):
    sid = start(client)
    answer(client, sid, "chief_complaint", "headache")
    r = answer(client, sid, "chief_complaint", "headache and fever").json()
    assert r["original_text"] == "headache" and r["text"] == "headache and fever" and r["edited"] is True
    state = client.get(f"/api/sessions/{sid}").json()
    assert "fever_detail" in [i["question"]["id"] for i in state["items"]]
    # editing the complaint back removes the follow-up from the flow
    answer(client, sid, "chief_complaint", "headache")
    state = client.get(f"/api/sessions/{sid}").json()
    assert "fever_detail" not in [i["question"]["id"] for i in state["items"]]


def test_cannot_answer_inapplicable_question_or_edit_after_submit(client):
    sid = start(client)
    answer(client, sid, "chief_complaint", "headache")
    assert answer(client, sid, "cough_detail", "x").status_code == 422
    finish_flow(client, sid)
    client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True})
    assert answer(client, sid, "onset", "later").status_code == 409


def test_urgent_notice_on_red_flag_and_not_on_negation(client):
    sid = start(client)
    r = answer(client, sid, "chief_complaint", "severe chest pain").json()
    assert r["urgent_notice"] and "112" in r["urgent_notice"]["message"]
    sid2 = start(client, "kn")
    r2 = answer(client, sid2, "chief_complaint", "ಎದೆ ನೋವು ಇದೆ").json()
    assert r2["urgent_notice"] and "ಗಂಭೀರ" in r2["urgent_notice"]["message"]
    sid3 = start(client)
    assert answer(client, sid3, "chief_complaint", "headache, no chest pain").json()["urgent_notice"] is None


def test_summary_lists_urgent_and_negated(client):
    sid = start(client)
    finish_flow(client, sid, complaint="headache, no chest pain")
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["urgent_flags"] == []
    assert [n["label"] for n in s["negated_mentions"]] == ["chest pain"]


def test_high_severity_flagged(client):
    sid = start(client)
    answer(client, sid, "chief_complaint", "headache")
    answer(client, sid, "onset", "today"); answer(client, sid, "duration", "hours")
    answer(client, sid, "severity", "10")
    for q in ("pain_detail", "other_symptoms", "additional_info"):
        answer(client, sid, q, skipped=True)
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["severity"] == "10/10" and s["urgent_flags"]


def test_kannada_without_translation_provider_keeps_original(client):
    sid = start(client, "kn")
    r = answer(client, sid, "chief_complaint", "ತಲೆನೋವು").json()
    assert r["translation_status"] == "unavailable" and r["translated_text"] is None
    finish_flow(client, sid, complaint="ತಲೆನೋವು")
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["main_concern"] == "ತಲೆನೋವು"
    assert any("no translation available" in n for n in s["uncertainty_notes"])
    assert s["responses"][0]["original_text"] == "ತಲೆನೋವು"


def test_kannada_with_mock_translation_is_labelled_mock(client, monkeypatch):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "mock")
    sid = start(client, "kn")
    r = answer(client, sid, "chief_complaint", "ತಲೆನೋವು").json()
    assert r["translation_status"] == "mock" and r["translated_text"].startswith("[MOCK TRANSLATION")
    finish_flow(client, sid, complaint="ತಲೆನೋವು")
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert s["responses"][0]["original_text"] == "ತಲೆನೋವು"          # original preserved
    assert s["responses"][0]["translated_text"].startswith("[MOCK")
    assert any("MOCK" in n for n in s["uncertainty_notes"])


def test_voice_low_confidence_is_flagged(client):
    sid = start(client)
    finish_flow(client, sid, input_mode="voice", transcript_confidence=0.3)
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    assert any("low speech-recognition confidence" in n for n in s["uncertainty_notes"])


def test_service_status_and_unavailable_behaviour(client):
    st = client.get("/api/services/status").json()
    assert st["speech_to_text"]["available"] is False and st["translation"]["available"] is False
    r = client.post("/api/transcribe", files={"file": ("a.m4a", b"abc")}, data={"language": "en"})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "stt_unavailable"
    r = client.post("/api/translate", json={"text": "hi", "source": "en", "target": "kn"})
    assert r.status_code == 503


def test_transcribe_validation_and_mock(client, monkeypatch):
    monkeypatch.setenv("STT_PROVIDER", "mock")
    assert client.post("/api/transcribe", files={"file": ("a.m4a", b"abc")}, data={"language": "xx"}).status_code == 422
    assert client.post("/api/transcribe", files={"file": ("a.m4a", b"")}, data={"language": "en"}).status_code == 422
    r = client.post("/api/transcribe", files={"file": ("a.m4a", b"abc")}, data={"language": "kn"}).json()
    assert r["is_mock"] and r["low_confidence"] is True and r["text"].startswith("[MOCK TRANSCRIPT]")


def test_clinician_requires_password_config_and_credentials(client, monkeypatch):
    assert client.get("/clinician/api/summaries").status_code == 401
    assert client.get("/clinician/api/summaries", headers={"Authorization": "Basic ZG9jOndyb25n"}).status_code == 401
    monkeypatch.setenv("CLINICIAN_PASSWORD", "")
    assert client.get("/clinician/api/summaries", headers=CLIN).status_code == 503


def test_clinician_review_workflow(client):
    sid = start(client)
    finish_flow(client, sid, complaint="fever")
    client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True})
    lst = client.get("/clinician/api/summaries", headers=CLIN).json()
    assert len(lst) == 1 and lst[0]["status"] == "pending_review"
    d = client.get(f"/clinician/api/summaries/{sid}", headers=CLIN).json()
    fix = {k: d["system_summary"][k] for k in ("main_concern", "onset", "duration", "severity", "additional_info", "reported_symptoms")}
    fix["main_concern"] = "fever (clinician-corrected)"
    assert client.put(f"/clinician/api/summaries/{sid}", json=fix, headers=CLIN).status_code == 200
    d = client.get(f"/clinician/api/summaries/{sid}", headers=CLIN).json()
    assert d["corrected_summary"]["main_concern"].endswith("(clinician-corrected)")
    assert d["system_summary"]["main_concern"] == "fever"          # system copy untouched
    assert client.post(f"/clinician/api/summaries/{sid}/review", headers=CLIN).json()["status"] == "reviewed"
    assert client.put(f"/clinician/api/summaries/{sid}", json=fix, headers=CLIN).status_code == 409
    assert client.get("/clinician", headers=CLIN).status_code == 200
