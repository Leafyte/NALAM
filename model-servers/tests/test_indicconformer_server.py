import io
import wave

import pytest
from fastapi.testclient import TestClient

from .conftest import make_audio


class RecordingEngine:
    name = "recording"

    def __init__(self):
        self.calls = []

    def transcribe(self, wav, lang, decoder):
        self.calls.append((lang, decoder))
        return "हेलो"

    def info(self):
        return {"engine": "recording"}


def post(c, audio, language="hi", name="a.m4a", **extra):
    return c.post("/transcribe", files={"file": (name, audio)}, data={"language": language, **extra})


def test_supported_languages_match_model_card(conf):
    assert {"hi", "kn", "ta", "te", "ml", "bn", "mr", "ur", "sat", "kok"} <= conf.SUPPORTED
    assert "en" not in conf.SUPPORTED and len(conf.SUPPORTED) == 22


def test_ffmpeg_converts_phone_audio_to_16k_mono_pcm(conf, tmp_path):
    wav = conf.to_wav16k(make_audio(tmp_path, 1.5), ".m4a")
    with wave.open(io.BytesIO(wav)) as w:
        assert (w.getnchannels(), w.getframerate(), w.getsampwidth()) == (1, 16000, 2)
    assert 1.3 < conf.wav_seconds(wav) < 1.8


def test_transcribe_end_to_end_with_real_audio(conf, tmp_path):
    eng = RecordingEngine()
    r = post(TestClient(conf.create_app(eng)), make_audio(tmp_path, 1.0), "hi")
    assert r.status_code == 200
    assert r.json() == {"text": "हेलो", "confidence": None, "language": "hi", "decoder": "ctc", "engine": "recording"}
    assert eng.calls == [("hi", "ctc")]


def test_decoder_choice_and_konkani_alias(conf, tmp_path):
    eng = RecordingEngine()
    c = TestClient(conf.create_app(eng))
    audio = make_audio(tmp_path, 1.0)
    assert post(c, audio, "gom", decoder="rnnt").status_code == 200
    assert eng.calls == [("kok", "rnnt")]
    assert post(c, audio, "hi", decoder="beam").json()["detail"]["code"] == "bad_decoder"


def test_english_is_rejected_because_the_model_has_no_english(conf, tmp_path):
    r = post(TestClient(conf.create_app(RecordingEngine())), make_audio(tmp_path, 1.0), "en")
    assert r.status_code == 422 and r.json()["detail"]["code"] == "unsupported_language"


def test_bad_audio(conf, tmp_path):
    c = TestClient(conf.create_app(RecordingEngine()))
    assert post(c, b"this is not audio at all", "hi").json()["detail"]["code"] == "audio_decode_failed"
    assert post(c, b"", "hi").json()["detail"]["code"] == "empty_audio"
    assert post(c, make_audio(tmp_path, 0.05, ".wav"), "hi", name="a.wav").json()["detail"]["code"] == "audio_too_short"


def test_size_limit(conf, tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_AUDIO_MB", "0")
    assert post(TestClient(conf.create_app(RecordingEngine())), make_audio(tmp_path, 1.0), "hi").status_code == 413


def test_api_key(conf, tmp_path, monkeypatch):
    monkeypatch.setenv("API_KEY", "s3cret")
    c = TestClient(conf.create_app(RecordingEngine()))
    audio = make_audio(tmp_path, 1.0)
    assert post(c, audio).status_code == 401
    r = c.post("/transcribe", files={"file": ("a.m4a", audio)}, data={"language": "hi"}, headers={"X-API-Key": "s3cret"})
    assert r.status_code == 200


def test_model_unavailable_and_internal_errors_do_not_leak(conf, tmp_path):
    class Gated(RecordingEngine):
        def transcribe(self, *a):
            raise conf.ModelUnavailable("This model is gated")

    class Boom(RecordingEngine):
        def transcribe(self, *a):
            raise RuntimeError("secret transcript text")

    audio = make_audio(tmp_path, 1.0)
    assert post(TestClient(conf.create_app(Gated())), audio).status_code == 503
    r = post(TestClient(conf.create_app(Boom())), audio)
    assert r.status_code == 500 and "secret transcript text" not in r.text


def test_fake_engine_reports_audio_length(conf, tmp_path):
    r = post(TestClient(conf.create_app(conf.FakeEngine())), make_audio(tmp_path, 2.0), "ta").json()
    assert r["text"].startswith("[FAKE TRANSCRIPT ta/ctc]") and "2.0s" in r["text"]


def test_health_lists_languages(conf):
    h = TestClient(conf.create_app(RecordingEngine())).get("/health").json()
    assert h["status"] == "ok" and "hi" in h["languages"]
