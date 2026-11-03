import base64
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HEALTH_DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("CLINICIAN_USERNAME", "doc")
    monkeypatch.setenv("CLINICIAN_PASSWORD", "test-pass-123")
    monkeypatch.setenv("STT_PROVIDER", "none")
    monkeypatch.setenv("TRANSLATION_PROVIDER", "none")
    return TestClient(app)


CLIN = {"Authorization": "Basic " + base64.b64encode(b"doc:test-pass-123").decode()}


def start(client, lang="en"):
    r = client.post("/api/sessions", json={"language": lang, "consent": True})
    assert r.status_code == 201
    return r.json()["session_id"]


def answer(client, sid, qid, text="", **kw):
    return client.post(f"/api/sessions/{sid}/answers", json={"question_id": qid, "text": text, **kw})


def finish_flow(client, sid, complaint="headache", skip_severity=False, **first_kwargs):
    """Synthetic data only. Answers whatever question comes next until complete."""
    answer(client, sid, "chief_complaint", complaint, **first_kwargs)
    while True:
        nxt = client.get(f"/api/sessions/{sid}/next").json()["next_question"]
        if nxt is None:
            return
        if nxt["id"] == "severity":
            (answer(client, sid, "severity", skipped=True) if skip_severity else answer(client, sid, "severity", "6"))
        elif nxt["required"]:
            answer(client, sid, nxt["id"], "since yesterday")
        else:
            answer(client, sid, nxt["id"], skipped=True)
