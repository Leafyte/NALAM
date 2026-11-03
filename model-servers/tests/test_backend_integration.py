"""Starts BOTH servers (fake engines, real HTTP) and drives them through the real healthcare backend.
Proves the wiring (URLs, API keys, multipart upload, language codes, error mapping) without downloading any model."""
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from .conftest import make_audio

ROOT = Path(__file__).resolve().parents[1]
KEY = "integration-test-key"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start(folder: str, port: int, extra_env=None):
    import os
    env = {**os.environ, "ENGINE": "fake", "API_KEY": KEY, **(extra_env or {})}
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "server:app", "--app-dir", str(ROOT / folder),
                             "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning"],
                            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        try:
            if httpx.get(f"http://127.0.0.1:{port}/health", timeout=1).status_code == 200:
                return proc
        except httpx.HTTPError:
            time.sleep(0.25)
    proc.kill()
    raise RuntimeError(f"{folder} server did not start")


@pytest.fixture(scope="module")
def servers():
    p1, p2 = free_port(), free_port()
    a, b = start("indictrans2", p1), start("indicconformer", p2)
    yield {"mt": f"http://127.0.0.1:{p1}/translate", "stt": f"http://127.0.0.1:{p2}/transcribe"}
    for p in (a, b):
        p.terminate()
        p.wait(timeout=10)


@pytest.fixture()
def client(servers, tmp_path, monkeypatch):
    from app.main import app
    for k, v in {"HEALTH_DB_PATH": str(tmp_path / "t.db"), "CLINICIAN_PASSWORD": "x",
                 "TRANSLATION_PROVIDER": "indictrans2_http", "INDICTRANS2_URL": servers["mt"], "INDICTRANS2_API_KEY": KEY,
                 "STT_PROVIDER": "indicconformer_http", "INDICCONFORMER_URL": servers["stt"],
                 "INDICCONFORMER_API_KEY": KEY, "STT_ENGLISH_PROVIDER": "none"}.items():
        monkeypatch.setenv(k, v)
    return TestClient(app)


def test_status_reports_real_providers_and_languages(client):
    st = client.get("/api/services/status").json()
    assert st["translation"] == {"available": True, "provider": "indictrans2_http"}
    assert st["speech_to_text"]["provider"] == "indicconformer_http"
    assert set(st["speech_to_text"]["languages"]) == {"kn", "hi", "ta"}      # no English: IndicConformer has none


@pytest.mark.parametrize("code,flores", [("hi", "hin_Deva"), ("ta", "tam_Taml"), ("kn", "kan_Knda")])
def test_translate_through_backend(client, code, flores):
    r = client.post("/api/translate", json={"text": "test text", "source": code, "target": "en"})
    assert r.status_code == 200
    assert r.json() == {"translation": f"[FAKE {flores}->eng_Latn] test text", "provider": "indictrans2_http", "is_mock": False}


def test_english_to_indian_language(client):
    r = client.post("/api/translate", json={"text": "fever", "source": "en", "target": "hi"})
    assert r.json()["translation"] == "[FAKE eng_Latn->hin_Deva] fever"


def test_wrong_api_key_is_a_clean_502(client, monkeypatch):
    monkeypatch.setenv("INDICTRANS2_API_KEY", "wrong")
    r = client.post("/api/translate", json={"text": "x", "source": "hi", "target": "en"})
    assert r.status_code == 502 and r.json()["detail"]["code"] == "translation_failed" and "x" not in r.json()["detail"]["message"].split("(")[0]


def test_server_down_is_a_clean_502(client, monkeypatch):
    monkeypatch.setenv("INDICTRANS2_URL", f"http://127.0.0.1:{free_port()}/translate")
    assert client.post("/api/translate", json={"text": "x", "source": "hi", "target": "en"}).status_code == 502


@pytest.mark.parametrize("code", ["hi", "ta", "kn"])
def test_phone_audio_through_backend_to_conformer(client, tmp_path, code):
    r = client.post("/api/transcribe", files={"file": ("recording.m4a", make_audio(tmp_path, 1.0))}, data={"language": code})
    body = r.json()
    assert r.status_code == 200 and body["provider"] == "indicconformer_http" and not body["is_mock"]
    assert body["text"].startswith(f"[FAKE TRANSCRIPT {code}/ctc]") and "1.0s" in body["text"]
    assert body["confidence"] is None and body["low_confidence"] is True     # no confidence score: always double-check


def test_english_speech_needs_a_fallback_provider(client, tmp_path, monkeypatch):
    audio = make_audio(tmp_path, 1.0)
    r = client.post("/api/transcribe", files={"file": ("a.m4a", audio)}, data={"language": "en"})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "stt_unavailable"
    monkeypatch.setenv("STT_ENGLISH_PROVIDER", "mock")
    r = client.post("/api/transcribe", files={"file": ("a.m4a", audio)}, data={"language": "en"})
    assert r.status_code == 200 and r.json()["provider"] == "mock"
    assert "en" in client.get("/api/services/status").json()["speech_to_text"]["languages"]


def test_garbage_audio_is_a_clean_502(client):
    r = client.post("/api/transcribe", files={"file": ("a.m4a", b"not audio")}, data={"language": "hi"})
    assert r.status_code == 502 and r.json()["detail"]["code"] == "stt_failed"


def test_full_hindi_questionnaire_uses_the_translation_server(client):
    sid = client.post("/api/sessions", json={"language": "hi", "consent": True}).json()["session_id"]
    answer = lambda q, **kw: client.post(f"/api/sessions/{sid}/answers", json={"question_id": q, **kw})
    answer("chief_complaint", text="मुझे बुखार है")
    while (nq := client.get(f"/api/sessions/{sid}/next").json()["next_question"]) is not None:   # synthetic answers only
        if nq["kind"] == "severity":
            answer(nq["id"], text="5")
        elif nq["required"]:
            answer(nq["id"], text="कल से")
        else:
            answer(nq["id"], skipped=True)
    s = client.post(f"/api/sessions/{sid}/submit", json={"confirmed": True}).json()
    r0 = s["responses"][0]
    assert r0["original_text"] == "मुझे बुखार है"                       # original preserved
    assert r0["translated_text"] == "[FAKE hin_Deva->eng_Latn] मुझे बुखार है"
    assert r0["translation_provider"] == "indictrans2_http"
    assert any("machine-translated" in n for n in s["uncertainty_notes"])
    assert any("UNREVIEWED DRAFT" in n for n in s["uncertainty_notes"])
