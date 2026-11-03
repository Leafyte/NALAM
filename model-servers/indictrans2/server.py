"""IndicTrans2 translation server (AI4Bharat) for the Multilingual Healthcare Assistant.

The healthcare backend calls this over HTTP (TRANSLATION_PROVIDER=indictrans2_http). Contract:

    POST /translate   {"text": "...", "source": "hi", "target": "en"}   (+ header X-API-Key if API_KEY is set)
    -> 200 {"translation": "..."}

Run:      uvicorn server:app --host 127.0.0.1 --port 8001
Smoke:    ENGINE=fake uvicorn server:app --port 8001      (no models, no downloads: only checks the wiring)

Environment (all optional):
    ENGINE=hf|fake              default hf
    INDICTRANS2_INDIC_EN        model id for Indic -> English   (default ai4bharat/indictrans2-indic-en-dist-200M)
    INDICTRANS2_EN_INDIC        model id for English -> Indic   (default ai4bharat/indictrans2-en-indic-dist-200M)
                                use the "-1B" checkpoints for better quality if you have the memory
    DEVICE=cpu|cuda             default: cuda if available
    NUM_BEAMS=5                 lower (1-2) is faster on CPU
    PRELOAD=1                   load the Indic->English model at startup instead of on the first request
    API_KEY=...                 if set, requests need the header  X-API-Key: <value>
Health text is sensitive: this server never logs request text.
"""
import hmac
import os
import re
import threading
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

# App language code -> FLORES code used by IndicTrans2. Covers all 22 scheduled languages + English, so adding a
# language to the healthcare app needs no change here. (Check the model card of YOUR checkpoint: a few
# checkpoints list a different script for some languages, e.g. Sindhi.)
FLORES = {
    "en": "eng_Latn", "as": "asm_Beng", "bn": "ben_Beng", "brx": "brx_Deva", "doi": "doi_Deva", "gu": "guj_Gujr",
    "hi": "hin_Deva", "kn": "kan_Knda", "kok": "gom_Deva", "gom": "gom_Deva", "ks": "kas_Arab", "mai": "mai_Deva",
    "ml": "mal_Mlym", "mni": "mni_Mtei", "mr": "mar_Deva", "ne": "npi_Deva", "or": "ory_Orya", "pa": "pan_Guru",
    "sa": "san_Deva", "sat": "sat_Olck", "sd": "snd_Arab", "ta": "tam_Taml", "te": "tel_Telu", "ur": "urd_Arab",
}
ENGLISH = "eng_Latn"


class ModelUnavailable(Exception):
    """The model could not be loaded (missing package, download failure, out of memory)."""


# ----------------------------------------------------------------------------- text helpers
_SENT_END = re.compile(r"(?<=[.!?।॥])\s+")


def split_text(text: str, max_chars: int = 350) -> list:
    """Split long answers into sentence groups: the models work best on short inputs."""
    parts = [p.strip() for p in _SENT_END.split(text.strip()) if p.strip()]
    chunks, cur = [], ""
    for p in parts:
        if cur and len(cur) + 1 + len(p) > max_chars:
            chunks.append(cur)
            cur = p
        else:
            cur = f"{cur} {p}".strip()
    if cur:
        chunks.append(cur)
    out = []
    for c in chunks:
        while len(c) > max_chars * 2:                       # one huge "sentence" with no punctuation
            cut = c.rfind(" ", 0, max_chars * 2)
            cut = cut if cut > 0 else max_chars * 2
            out.append(c[:cut].strip())
            c = c[cut:].strip()
        out.append(c)
    return out or [text.strip()]


# ----------------------------------------------------------------------------- engines
class FakeEngine:
    """No model. Output is clearly labelled so nobody mistakes it for a real translation."""
    name = "fake"

    def translate(self, texts, src, tgt):
        return [f"[FAKE {src}->{tgt}] {t}" for t in texts]

    def info(self):
        return {"engine": "fake", "loaded": [], "device": "none"}


class HFEngine:
    """Real IndicTrans2 via Hugging Face transformers. Models load lazily, one per direction."""
    name = "hf"

    def __init__(self):
        self._lock = threading.Lock()      # one generation at a time; also protects lazy loading
        self._loaded = {}                  # direction -> (tokenizer, model)
        self.models = {
            "to_en": os.environ.get("INDICTRANS2_INDIC_EN", "ai4bharat/indictrans2-indic-en-dist-200M"),
            "from_en": os.environ.get("INDICTRANS2_EN_INDIC", "ai4bharat/indictrans2-en-indic-dist-200M"),
        }
        self.device = None

    def _load(self, direction: str):
        if direction in self._loaded:
            return self._loaded[direction]
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            from IndicTransToolkit import IndicProcessor  # noqa: F401  (fail early with a clear message)
        except ImportError as exc:
            raise ModelUnavailable(
                f"Missing or incompatible package ({exc}). Run: pip install -r requirements.txt "
                "(transformers must be 4.x, below 4.50).") from exc
        self.device = os.environ.get("DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
        model_id = self.models[direction]
        try:
            tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_id, trust_remote_code=True, low_cpu_mem_usage=True)
            model = model.to(self.device)
            model.eval()
        except (OSError, RuntimeError, ValueError, MemoryError) as exc:
            raise ModelUnavailable(
                f"Could not load {model_id} ({type(exc).__name__}). Check internet access, disk space and memory; "
                "the 200M distilled checkpoints are the lightest.") from exc
        self._loaded[direction] = (tok, model)
        return self._loaded[direction]

    def preload(self):
        with self._lock:
            self._load("to_en")

    def translate(self, texts, src, tgt):
        direction = "to_en" if tgt == ENGLISH else "from_en"
        if direction == "from_en" and src != ENGLISH:
            raise ValueError("this checkpoint only translates to or from English")
        with self._lock:
            tok, model = self._load(direction)
            import torch
            from IndicTransToolkit import IndicProcessor
            # IndicProcessor is STATEFUL: preprocess_batch() queues placeholder maps that postprocess_batch() consumes.
            # A fresh instance per call means a failed request can never poison the next one.
            ip = IndicProcessor(inference=True)
            batch = ip.preprocess_batch(texts, src_lang=src, tgt_lang=tgt)
            inputs = tok(batch, truncation=True, padding="longest", return_tensors="pt",
                         return_attention_mask=True).to(self.device)
            with torch.inference_mode():
                generated = model.generate(**inputs, use_cache=True, min_length=0, max_length=256,
                                           num_beams=int(os.environ.get("NUM_BEAMS", "5")), num_return_sequences=1)
            decoded = tok.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=True)
            return ip.postprocess_batch(decoded, lang=tgt)

    def info(self):
        return {"engine": "hf", "loaded": sorted(self._loaded), "device": self.device or "not loaded yet",
                "models": self.models}


def make_engine():
    return FakeEngine() if os.environ.get("ENGINE", "hf").lower() == "fake" else HFEngine()


# ----------------------------------------------------------------------------- translation logic
def translate_text(engine, text: str, source: str, target: str):
    """Returns (translation, number_of_chunks). Indic -> Indic pivots through English (two hops, lower quality)."""
    if source == target:
        return text, 0
    src, tgt = FLORES[source], FLORES[target]
    if src == tgt:                                           # e.g. kok and gom are the same language
        return text, 0
    chunks = split_text(text)
    if src != ENGLISH and tgt != ENGLISH:
        out = engine.translate(engine.translate(chunks, src, ENGLISH), ENGLISH, tgt)
    else:
        out = engine.translate(chunks, src, tgt)
    return " ".join(x.strip() for x in out).strip(), len(chunks)


def err(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    source: str
    target: str


def create_app(engine=None) -> FastAPI:
    eng = engine or make_engine()

    @asynccontextmanager
    async def lifespan(_app):
        if os.environ.get("PRELOAD") == "1" and hasattr(eng, "preload"):
            eng.preload()
        yield

    app = FastAPI(title="IndicTrans2 server", version="0.1.0", lifespan=lifespan)

    def auth(x_api_key: str = Header(default="")):
        key = os.environ.get("API_KEY", "")
        if key and not hmac.compare_digest(x_api_key.encode(), key.encode()):
            raise err(401, "unauthorized", "Missing or wrong X-API-Key")

    @app.get("/health")
    def health():
        return {"status": "ok", **eng.info()}

    @app.get("/languages", dependencies=[Depends(auth)])
    def languages():
        return sorted(FLORES)

    @app.post("/translate", dependencies=[Depends(auth)])
    def translate(body: TranslateIn):
        for code in (body.source, body.target):
            if code not in FLORES:
                raise err(422, "unsupported_language", f"Unsupported language '{code}'. Supported: {sorted(FLORES)}")
        try:
            result, chunks = translate_text(eng, body.text, body.source, body.target)
        except ModelUnavailable as exc:
            raise err(503, "model_unavailable", str(exc))
        except Exception as exc:                              # never put the text into an error message
            raise err(500, "translation_failed", f"Translation failed ({type(exc).__name__})")
        return {"translation": result, "source": body.source, "target": body.target, "chunks": chunks,
                "engine": eng.name}

    return app


app = create_app()
