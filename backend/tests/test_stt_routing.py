"""STT provider routing + API-key headers (no network: httpx.post is faked)."""
import pytest

from app.services import stt, translation


class FakeResp:
    def __init__(self, data):
        self._d = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._d


@pytest.fixture()
def captured(monkeypatch):
    calls = []

    def fake_post(url, **kw):
        calls.append({"url": url, **kw})
        return FakeResp({"text": "ok", "confidence": None, "translation": "ok"})
    monkeypatch.setattr("httpx.post", fake_post)
    return calls


def test_indicconformer_languages_exclude_english(monkeypatch):
    monkeypatch.setenv("STT_PROVIDER", "indicconformer_http")
    monkeypatch.setenv("INDICCONFORMER_URL", "http://x/transcribe")
    monkeypatch.setenv("STT_ENGLISH_PROVIDER", "none")
    assert stt.supported_languages() == ["kn", "hi", "ta"] and stt.is_available()
    monkeypatch.setenv("STT_ENGLISH_PROVIDER", "mock")
    assert stt.supported_languages() == ["en", "kn", "hi", "ta"]


def test_indicconformer_without_url_is_unavailable(monkeypatch):
    monkeypatch.setenv("STT_PROVIDER", "indicconformer_http")
    monkeypatch.setenv("INDICCONFORMER_URL", "")
    assert stt.supported_languages() == [] and not stt.is_available()
    with pytest.raises(stt.SttUnavailable):
        stt.transcribe(b"abc", "a.m4a", "hi")


def test_whisper_and_mock_cover_every_language(monkeypatch):
    monkeypatch.setenv("STT_PROVIDER", "mock")
    assert set(stt.supported_languages()) == {"en", "kn", "hi", "ta"}
    monkeypatch.setenv("STT_PROVIDER", "none")
    assert stt.supported_languages() == []


def test_conformer_request_has_key_language_and_file(monkeypatch, captured):
    monkeypatch.setenv("STT_PROVIDER", "indicconformer_http")
    monkeypatch.setenv("INDICCONFORMER_URL", "http://x/transcribe")
    monkeypatch.setenv("INDICCONFORMER_API_KEY", "k1")
    r = stt.transcribe(b"abc", "rec.m4a", "ta")
    c = captured[0]
    assert c["headers"] == {"X-API-Key": "k1"} and c["data"] == {"language": "ta"} and c["files"]["file"][0] == "rec.m4a"
    assert r["provider"] == "indicconformer_http" and r["confidence"] is None


def test_no_key_header_when_not_configured(monkeypatch, captured):
    monkeypatch.setenv("STT_PROVIDER", "indicconformer_http")
    monkeypatch.setenv("INDICCONFORMER_URL", "http://x/transcribe")
    monkeypatch.setenv("INDICCONFORMER_API_KEY", "")
    stt.transcribe(b"abc", "rec.m4a", "hi")
    assert captured[0]["headers"] == {}


def test_english_is_routed_to_the_fallback_provider(monkeypatch, captured):
    monkeypatch.setenv("STT_PROVIDER", "indicconformer_http")
    monkeypatch.setenv("INDICCONFORMER_URL", "http://x/transcribe")
    monkeypatch.setenv("STT_ENGLISH_PROVIDER", "mock")
    r = stt.transcribe(b"abc", "rec.m4a", "en")
    assert r["provider"] == "mock" and captured == []            # the conformer server was NOT called


def test_translation_request_carries_the_key(monkeypatch, captured):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "indictrans2_http")
    monkeypatch.setenv("INDICTRANS2_URL", "http://x/translate")
    monkeypatch.setenv("INDICTRANS2_API_KEY", "k2")
    translation.translate("hi", "hi", "en")
    assert captured[0]["headers"] == {"X-API-Key": "k2"} and captured[0]["json"] == {"text": "hi", "source": "hi", "target": "en"}
