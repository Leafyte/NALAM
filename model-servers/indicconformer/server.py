"""IndicConformer speech-to-text server (AI4Bharat) for the Multilingual Healthcare Assistant.

The healthcare backend calls this over HTTP (STT_PROVIDER=indicconformer_http). Contract:

    POST /transcribe   multipart: file=<audio, any format ffmpeg reads (m4a from phones is fine)>, language=<hi|kn|ta|...>
                       (+ header X-API-Key if API_KEY is set)
    -> 200 {"text": "...", "confidence": null}

IndicConformer covers 22 Indian languages and does NOT cover English. It returns no confidence score, so
"confidence" is always null and the healthcare app flags every transcript for the patient to double-check.

Run:      uvicorn server:app --host 127.0.0.1 --port 8002
Smoke:    ENGINE=fake uvicorn server:app --port 8002      (no model: converts the audio and reports its length)

Setup notes:
  * The model is GATED on Hugging Face. Create an account, open
    https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual and accept the conditions, then run
    `huggingface-cli login` (or set HF_TOKEN) on this machine before starting the server.
  * Install ffmpeg (Ubuntu: apt install ffmpeg | macOS: brew install ffmpeg | Windows: winget install ffmpeg).
Environment (all optional): ENGINE=hf|fake, MODEL_ID, DECODER=ctc|rnnt (default ctc), PRELOAD=1, API_KEY, MAX_AUDIO_MB=10.
This server never logs transcripts.
"""
import hmac
import io
import os
import subprocess
import tempfile
import threading
import wave
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

# Language codes from the model card. Konkani is `kok` there; `gom` is accepted as an alias.
SUPPORTED = {"as", "bn", "brx", "doi", "gu", "hi", "kn", "kok", "ks", "mai", "ml", "mni", "mr", "ne", "or", "pa",
             "sa", "sat", "sd", "ta", "te", "ur"}
ALIASES = {"gom": "kok"}


class ModelUnavailable(Exception):
    pass


class AudioError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def to_wav16k(data: bytes, suffix: str = ".m4a") -> bytes:
    """Convert any audio to 16 kHz, mono, 16-bit PCM WAV with ffmpeg."""
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, "in" + (suffix or ".bin")), os.path.join(d, "out.wav")
        with open(src, "wb") as f:
            f.write(data)
        try:
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000",
                            "-sample_fmt", "s16", "-f", "wav", dst], check=True, capture_output=True, timeout=90)
        except FileNotFoundError:
            raise AudioError("ffmpeg_missing", "ffmpeg is not installed on the server")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            raise AudioError("audio_decode_failed", "Could not read the audio file")
        with open(dst, "rb") as f:
            return f.read()


def wav_seconds(wav_bytes: bytes) -> float:
    with wave.open(io.BytesIO(wav_bytes)) as w:
        return w.getnframes() / float(w.getframerate())


class FakeEngine:
    name = "fake"

    def transcribe(self, wav_bytes: bytes, lang: str, decoder: str) -> str:
        return f"[FAKE TRANSCRIPT {lang}/{decoder}] received {wav_seconds(wav_bytes):.1f}s of 16 kHz audio"

    def info(self):
        return {"engine": "fake", "loaded": False}


class HFEngine:
    name = "hf"

    def __init__(self):
        self._lock = threading.Lock()
        self._model = None
        self.model_id = os.environ.get("MODEL_ID", "ai4bharat/indic-conformer-600m-multilingual")

    def _load(self):
        if self._model is not None:
            return self._model
        try:
            from transformers import AutoModel
            import numpy, torch  # noqa: F401
        except ImportError as exc:
            raise ModelUnavailable(f"Missing package ({exc}). Run: pip install -r requirements.txt") from exc
        try:
            self._model = AutoModel.from_pretrained(self.model_id, trust_remote_code=True)
        except (OSError, RuntimeError, ValueError) as exc:
            raise ModelUnavailable(
                f"Could not load {self.model_id} ({type(exc).__name__}). This model is gated: accept its conditions on "
                "Hugging Face and log in (huggingface-cli login, or set HF_TOKEN). Also check disk space and memory.") from exc
        return self._model

    def preload(self):
        with self._lock:
            self._load()

    def transcribe(self, wav_bytes: bytes, lang: str, decoder: str) -> str:
        import numpy as np
        import torch
        with wave.open(io.BytesIO(wav_bytes)) as w:           # already 16 kHz mono int16 thanks to ffmpeg
            frames = w.readframes(w.getnframes())
        audio = torch.from_numpy(np.frombuffer(frames, dtype=np.int16).astype("float32") / 32768.0).unsqueeze(0)
        with self._lock:
            model = self._load()
            result = model(audio, lang, decoder)               # model card: model(wav, "hi", "ctc")
        if isinstance(result, (list, tuple)):
            result = " ".join(str(r) for r in result)
        return str(result).strip()

    def info(self):
        return {"engine": "hf", "loaded": self._model is not None, "model": self.model_id}


def make_engine():
    return FakeEngine() if os.environ.get("ENGINE", "hf").lower() == "fake" else HFEngine()


def err(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def create_app(engine=None) -> FastAPI:
    eng = engine or make_engine()

    @asynccontextmanager
    async def lifespan(_app):
        if os.environ.get("PRELOAD") == "1" and hasattr(eng, "preload"):
            eng.preload()
        yield

    app = FastAPI(title="IndicConformer server", version="0.1.0", lifespan=lifespan)

    def auth(x_api_key: str = Header(default="")):
        key = os.environ.get("API_KEY", "")
        if key and not hmac.compare_digest(x_api_key.encode(), key.encode()):
            raise err(401, "unauthorized", "Missing or wrong X-API-Key")

    @app.get("/health")
    def health():
        return {"status": "ok", **eng.info(), "languages": sorted(SUPPORTED)}

    @app.post("/transcribe", dependencies=[Depends(auth)])
    async def transcribe(file: UploadFile = File(...), language: str = Form(...), decoder: str = Form("")):
        lang = ALIASES.get(language, language)
        if lang not in SUPPORTED:
            raise err(422, "unsupported_language",
                      f"IndicConformer does not support '{language}'. Supported: {sorted(SUPPORTED)}")
        decoder = (decoder or os.environ.get("DECODER", "ctc")).lower()
        if decoder not in ("ctc", "rnnt"):
            raise err(422, "bad_decoder", "decoder must be 'ctc' or 'rnnt'")
        data = await file.read()
        if not data:
            raise err(422, "empty_audio", "The audio file is empty")
        if len(data) > int(os.environ.get("MAX_AUDIO_MB", "10")) * 1024 * 1024:
            raise err(413, "audio_too_large", "Audio file is too large")
        try:
            wav = to_wav16k(data, os.path.splitext(file.filename or "")[1])
            if wav_seconds(wav) < 0.2:
                raise AudioError("audio_too_short", "The recording is too short")
            text = eng.transcribe(wav, lang, decoder)
        except AudioError as exc:
            status = 500 if exc.code == "ffmpeg_missing" else 422
            raise err(status, exc.code, exc.message)
        except ModelUnavailable as exc:
            raise err(503, "model_unavailable", str(exc))
        except Exception as exc:                              # never put audio-derived text into an error message
            raise err(500, "transcription_failed", f"Transcription failed ({type(exc).__name__})")
        return {"text": text, "confidence": None, "language": lang, "decoder": decoder, "engine": eng.name}

    return app


app = create_app()
