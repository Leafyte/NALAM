"""Multilingual General Healthcare Assistant - backend (educational prototype).
Run:  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000     (docs at /docs)"""
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import clinician, language, sessions
from .config import get_settings
from .db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Nalam - Clinical Intake & Triage API",
    version="1.0.0",
    description="Multilingual patient-reported intake for healthcare professional review. "
                "Does NOT diagnose, prescribe, or replace medical care. Prototype: use synthetic data only.",
    lifespan=lifespan,
)

static_path = Path(__file__).resolve().parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

origins = get_settings().cors_origins
# Fall back to standard local dev ports if CORS_ORIGINS is not set so Expo Web / dev tools can connect
effective_origins = origins if origins else [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:19006",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=effective_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"], include_in_schema=False)
def health():
    return {"status": "ok"}


app.include_router(sessions.router)
app.include_router(language.router)
app.include_router(clinician.router)
