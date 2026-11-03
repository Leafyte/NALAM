"""Loads the two server.py files (same file name, different folders) under unique module names."""
import importlib.util
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="session")
def it2():
    return load("it2_server", "indictrans2/server.py")


@pytest.fixture(scope="session")
def conf():
    return load("conf_server", "indicconformer/server.py")


def make_audio(path: Path, seconds: float, suffix: str = ".m4a") -> bytes:
    """Real phone-style audio (AAC in m4a) generated with ffmpeg."""
    out = path / f"tone{suffix}"
    codec = ["-c:a", "aac"] if suffix == ".m4a" else []
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i",
                    f"sine=frequency=440:sample_rate=44100:duration={seconds}", "-ac", "2", *codec, str(out)],
                   check=True)
    return out.read_bytes()
