"""Tiny SQLite layer using only the standard library.

To move to PostgreSQL later: keep these three tables, swap this module for
SQLAlchemy/psycopg, and replace `?` placeholders with the driver's style.
"""
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

from .config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  submitted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

CREATE TABLE IF NOT EXISTS answers (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL,
  original_text TEXT NOT NULL,
  language TEXT NOT NULL,
  input_mode TEXT NOT NULL,
  translated_text TEXT,
  translation_provider TEXT,
  transcript_confidence REAL,
  edited INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id);

CREATE TABLE IF NOT EXISTS summaries (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  summary_json TEXT NOT NULL,
  corrected_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_summaries_status ON summaries(status);
"""

_INITIALIZED_PATHS = set()
_INIT_LOCK = threading.Lock()


def init_db(db_path: str | None = None):
    target = Path(db_path or get_settings().db_path).resolve()
    target_str = str(target)
    if target_str in _INITIALIZED_PATHS:
        return
    with _INIT_LOCK:
        if target_str in _INITIALIZED_PATHS:
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(target) as conn:
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)
        _INITIALIZED_PATHS.add(target_str)


@contextmanager
def connect():
    path = Path(get_settings().db_path).resolve()
    path_str = str(path)
    if path_str not in _INITIALIZED_PATHS:
        init_db(path_str)
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
