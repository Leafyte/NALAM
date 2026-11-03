"""Settings are read from environment variables on every call (easy to test)."""
import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass


@dataclass(frozen=True)
class Settings:
    db_path: str
    clinician_username: str
    clinician_password: str
    stt_provider: str
    translation_provider: str
    openai_api_key: str
    openai_stt_model: str
    local_whisper_model: str
    google_translate_api_key: str
    indictrans2_url: str
    indicconformer_url: str
    indictrans2_api_key: str
    indicconformer_api_key: str
    stt_english_provider: str
    cors_origins: list
    stt_low_confidence: float
    max_audio_mb: int


def get_settings() -> Settings:
    e = os.environ.get
    return Settings(
        db_path=e("HEALTH_DB_PATH", "./data/health.db"),
        clinician_username=e("CLINICIAN_USERNAME", "clinician"),
        clinician_password=e("CLINICIAN_PASSWORD", ""),
        stt_provider=e("STT_PROVIDER", "none").lower(),
        translation_provider=e("TRANSLATION_PROVIDER", "none").lower(),
        openai_api_key=e("OPENAI_API_KEY", ""),
        openai_stt_model=e("OPENAI_STT_MODEL", "whisper-1"),
        local_whisper_model=e("LOCAL_WHISPER_MODEL", "small"),
        google_translate_api_key=e("GOOGLE_TRANSLATE_API_KEY", ""),
        indictrans2_url=e("INDICTRANS2_URL", ""),
        indicconformer_url=e("INDICCONFORMER_URL", ""),
        indictrans2_api_key=e("INDICTRANS2_API_KEY", ""),
        indicconformer_api_key=e("INDICCONFORMER_API_KEY", ""),
        stt_english_provider=e("STT_ENGLISH_PROVIDER", "none").lower(),
        cors_origins=[o.strip() for o in e("CORS_ORIGINS", "").split(",") if o.strip()],
        stt_low_confidence=float(e("STT_LOW_CONFIDENCE", "0.6")),
        max_audio_mb=int(e("MAX_AUDIO_MB", "10")),
    )
