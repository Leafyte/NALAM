"""Speech-to-text service interface.

Providers (STT_PROVIDER):
  none    -> unavailable (the app hides/disables the microphone)
  openai  -> OpenAI Whisper API (needs OPENAI_API_KEY)
  local   -> faster-whisper on this machine (pip install faster-whisper; downloads a model)
  indicconformer_http -> YOUR OWN AI4Bharat IndicConformer server at INDICCONFORMER_URL (better for Indian languages; no English:
                       English is routed to STT_ENGLISH_PROVIDER). See ../model-servers. Contract:
                       POST {url} multipart: file=<audio>, language=<iso code> -> 200 JSON {"text": "...", "confidence": 0-1 or null}
  mock    -> fixed fake transcript prefixed with [MOCK TRANSCRIPT]; demos/tests ONLY
Whisper's Kannada accuracy is limited, so every transcript carries a confidence value and the
patient must be able to correct it.
"""
import math
import os
import tempfile
import threading

import httpx

from ..config import get_settings
from ..languages import LANGUAGES

LANG_NAMES = {c: c for c in LANGUAGES}

_LOCAL_MODELS = {}
_LOCAL_MODEL_LOCK = threading.Lock()


def _get_local_model(model_name: str):
    if model_name not in _LOCAL_MODELS:
        with _LOCAL_MODEL_LOCK:
            if model_name not in _LOCAL_MODELS:
                from faster_whisper import WhisperModel
                _LOCAL_MODELS[model_name] = WhisperModel(model_name, compute_type="int8")
    return _LOCAL_MODELS[model_name]

MOCK_TEXT = {
    "en": "I have had a headache since yesterday",
    "kn": "ನನಗೆ ನಿನ್ನೆಯಿಂದ ತಲೆನೋವು ಇದೆ",
    "hi": "मुझे कल से सिरदर्द है",
    "ta": "எனக்கு நேற்றிலிருந்து தலைவலி உள்ளது",
}


class SttUnavailable(Exception):
    pass


class SttError(Exception):
    pass


def provider_name() -> str:
    return get_settings().stt_provider


def _provider_ok(provider: str) -> bool:
    s = get_settings()
    if provider == "mock":
        return True
    if provider == "openai":
        return bool(s.openai_api_key)
    if provider == "indicconformer_http":
        return bool(s.indicconformer_url)
    if provider == "local":
        try:
            import faster_whisper  # noqa: F401
            return True
        except ImportError:
            return False
    return False


def _effective_provider(language: str) -> str:
    """IndicConformer has no English, so English can be routed to a different provider."""
    s = get_settings()
    if s.stt_provider == "indicconformer_http" and language == "en":
        return s.stt_english_provider or "none"
    return s.stt_provider


def is_available_for(language: str) -> bool:
    return _provider_ok(_effective_provider(language))


def supported_languages() -> list:
    """Languages for which the microphone can really work with the current configuration."""
    return [code for code in LANGUAGES if is_available_for(code)]


def is_available() -> bool:
    return bool(supported_languages())


def _confidence_from_logprobs(logprobs: list):
    if not logprobs:
        return None
    return max(0.0, min(1.0, math.exp(sum(logprobs) / len(logprobs))))


def transcribe(audio: bytes, filename: str, language: str) -> dict:
    """Returns {"text", "confidence" (0-1 or None), "provider", "is_mock"}."""
    if language not in LANG_NAMES:
        raise SttError("Unsupported language")
    provider = _effective_provider(language)
    if not _provider_ok(provider):
        raise SttUnavailable("No speech-to-text provider is configured for this language")
    s = get_settings()
    try:
        if provider == "mock":
            text = "[MOCK TRANSCRIPT] " + MOCK_TEXT[language]
            return {"text": text, "confidence": None, "provider": "mock", "is_mock": True}
        if provider == "indicconformer_http":
            headers = {"X-API-Key": s.indicconformer_api_key} if s.indicconformer_api_key else {}
            r = httpx.post(s.indicconformer_url, data={"language": language}, headers=headers,
                           files={"file": (filename or "audio.m4a", audio)}, timeout=180)
            r.raise_for_status()
            body = r.json()
            return {"text": body["text"].strip(), "confidence": body.get("confidence"),
                    "provider": "indicconformer_http", "is_mock": False}
        if provider == "openai":
            r = httpx.post("https://api.openai.com/v1/audio/transcriptions",
                           headers={"Authorization": f"Bearer {s.openai_api_key}"},
                           data={"model": s.openai_stt_model, "language": language,
                                 "response_format": "verbose_json"},
                           files={"file": (filename or "audio.m4a", audio)}, timeout=120)
            r.raise_for_status()
            body = r.json()
            logprobs = [seg["avg_logprob"] for seg in body.get("segments", []) if "avg_logprob" in seg]
            return {"text": body.get("text", "").strip(), "confidence": _confidence_from_logprobs(logprobs),
                    "provider": "openai", "is_mock": False}
        if provider == "local":
            suffix = os.path.splitext(filename or "")[1] or ".m4a"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                tmp.write(audio)
                tmp.flush()
                model = _get_local_model(s.local_whisper_model)
                segments, _info = model.transcribe(tmp.name, language=language)
                segments = list(segments)
            text = " ".join(seg.text.strip() for seg in segments).strip()
            return {"text": text, "confidence": _confidence_from_logprobs([seg.avg_logprob for seg in segments]),
                    "provider": "local", "is_mock": False}
    except (httpx.HTTPError, KeyError, ValueError, RuntimeError) as exc:
        raise SttError(f"Speech recognition failed ({type(exc).__name__})") from exc
    raise SttUnavailable("Unknown speech-to-text provider")
