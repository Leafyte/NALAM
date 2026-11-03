import asyncio
from fastapi import APIRouter, File, Form, UploadFile

from ..config import get_settings
from ..errors import api_error
from ..languages import LANGUAGES, as_dicts
from ..schemas.schemas import TranslateIn
from ..services import stt, translation

router = APIRouter(prefix="/api", tags=["language services"])


@router.get("/languages")
def list_languages():
    """Supported languages. draft=true means the wording has not been clinician-reviewed."""
    return as_dicts()


@router.get("/services/status")
def services_status():
    """Lets the app know which optional services really work (no secrets are returned)."""
    return {"speech_to_text": {"available": stt.is_available(), "provider": stt.provider_name(),
                          "languages": stt.supported_languages()},
            "translation": {"available": translation.is_available(), "provider": translation.provider_name()}}


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = Form(...)):
    if language not in LANGUAGES:
        raise api_error(422, "unsupported_language", f"language must be one of {sorted(LANGUAGES)}")
    data = await file.read()
    if not data:
        raise api_error(422, "empty_audio", "The audio file is empty")
    if len(data) > get_settings().max_audio_mb * 1024 * 1024:
        raise api_error(413, "audio_too_large", "Audio file is too large")
    try:
        result = await asyncio.to_thread(stt.transcribe, data, file.filename or "audio.m4a", language)
    except stt.SttUnavailable:
        raise api_error(503, "stt_unavailable", "Speech recognition is not configured on this server. Please type your answer.")
    except stt.SttError as exc:
        raise api_error(502, "stt_failed", str(exc))
    low = result["confidence"] is None or result["confidence"] < get_settings().stt_low_confidence
    return {**result, "low_confidence": low}


@router.post("/translate")
def translate_text(body: TranslateIn):
    try:
        result = translation.translate(body.text, body.source, body.target)
    except translation.TranslationUnavailable:
        raise api_error(503, "translation_unavailable", "Translation is not configured on this server")
    except translation.TranslationError as exc:
        raise api_error(502, "translation_failed", str(exc))
    return result
