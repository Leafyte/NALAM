"""Multilingual General Healthcare Assistant - backend (educational prototype).
Run:  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000     (docs at /docs)"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import clinician, language, sessions
from .config import get_settings
from .db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Multilingual Healthcare Assistant API",
    version="0.1.0",
    description="Collects patient-reported information for healthcare professional review. "
                "Does NOT diagnose, prescribe, or replace medical care. Prototype: use synthetic data only.",
    lifespan=lifespan,
)

origins = get_settings().cors_origins
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"], include_in_schema=False)
def health():
    return {"status": "ok"}


app.include_router(sessions.router)
app.include_router(language.router)
app.include_router(clinician.router)
