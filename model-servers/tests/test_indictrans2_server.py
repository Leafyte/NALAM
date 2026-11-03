import pytest
from fastapi.testclient import TestClient


class RecordingEngine:
    name = "recording"

    def __init__(self):
        self.calls = []

    def translate(self, texts, src, tgt):
        self.calls.append((list(texts), src, tgt))
        return [f"<{src}>{t}" for t in texts]

    def info(self):
        return {"engine": "recording"}


def client(it2, engine=None):
    return TestClient(it2.create_app(engine or RecordingEngine()))


def test_language_map_covers_all_22_scheduled_languages_and_english(it2):
    scheduled = {"as", "bn", "brx", "doi", "gu", "hi", "kn", "kok", "ks", "mai", "ml", "mni", "mr", "ne", "or", "pa",
                 "sa", "sat", "sd", "ta", "te", "ur"}
    assert scheduled | {"en"} <= set(it2.FLORES)
    assert it2.FLORES["hi"] == "hin_Deva" and it2.FLORES["ta"] == "tam_Taml" and it2.FLORES["kn"] == "kan_Knda"
    assert it2.FLORES["en"] == "eng_Latn"


def test_split_text(it2):
    assert it2.split_text("मुझे बुखार है।") == ["मुझे बुखार है।"]
    long = " ".join(f"Sentence number {i} is here." for i in range(40))
    chunks = it2.split_text(long, max_chars=100)
    assert len(chunks) > 5 and all(len(c) <= 100 for c in chunks)
    assert " ".join(chunks) == long                           # nothing lost
    huge = "word " * 400                                        # no punctuation at all
    assert all(len(c) <= 700 for c in it2.split_text(huge, max_chars=350))
    assert it2.split_text("   ") == [""] or it2.split_text("   ")  # never crashes


def test_translate_to_english(it2):
    eng = RecordingEngine()
    r = client(it2, eng).post("/translate", json={"text": "मुझे बुखार है।", "source": "hi", "target": "en"})
    assert r.status_code == 200 and r.json()["translation"] == "<hin_Deva>मुझे बुखार है।"
    assert eng.calls == [(["मुझे बुखार है।"], "hin_Deva", "eng_Latn")]


def test_translate_from_english(it2):
    eng = RecordingEngine()
    r = client(it2, eng).post("/translate", json={"text": "I have a fever.", "source": "en", "target": "ta"})
    assert r.status_code == 200 and eng.calls[0][1:] == ("eng_Latn", "tam_Taml")


def test_long_text_is_chunked_and_rejoined(it2):
    eng = RecordingEngine()
    text = " ".join(f"வாக்கியம் {i} இங்கே உள்ளது." for i in range(60))
    r = client(it2, eng).post("/translate", json={"text": text, "source": "ta", "target": "en"})
    assert r.status_code == 200 and r.json()["chunks"] > 1 and len(eng.calls) == 1
    assert r.json()["translation"].count("<tam_Taml>") == r.json()["chunks"]   # every chunk was translated, then rejoined
    assert "வாக்கியம் 59" in r.json()["translation"]


def test_indic_to_indic_pivots_through_english(it2):
    eng = RecordingEngine()
    r = client(it2, eng).post("/translate", json={"text": "ನನಗೆ ಜ್ವರ ಇದೆ", "source": "kn", "target": "hi"})
    assert r.status_code == 200
    assert [(c[1], c[2]) for c in eng.calls] == [("kan_Knda", "eng_Latn"), ("eng_Latn", "hin_Deva")]


@pytest.mark.parametrize("src,tgt", [("en", "en"), ("hi", "hi"), ("kok", "gom")])
def test_same_language_is_passthrough(it2, src, tgt):
    eng = RecordingEngine()
    r = client(it2, eng).post("/translate", json={"text": "hello", "source": src, "target": tgt})
    assert r.json()["translation"] == "hello" and eng.calls == []


def test_validation(it2):
    c = client(it2)
    assert c.post("/translate", json={"text": "x", "source": "fr", "target": "en"}).status_code == 422
    assert c.post("/translate", json={"text": "x", "source": "en", "target": "xx"}).json()["detail"]["code"] == "unsupported_language"
    assert c.post("/translate", json={"text": "", "source": "hi", "target": "en"}).status_code == 422
    assert c.post("/translate", json={"text": "x" * 4001, "source": "hi", "target": "en"}).status_code == 422
    assert c.post("/translate", json={"text": "x"}).status_code == 422


def test_api_key(it2, monkeypatch):
    monkeypatch.setenv("API_KEY", "s3cret")
    c = client(it2)
    body = {"text": "x", "source": "hi", "target": "en"}
    assert c.post("/translate", json=body).status_code == 401
    assert c.post("/translate", json=body, headers={"X-API-Key": "wrong"}).status_code == 401
    assert c.post("/translate", json=body, headers={"X-API-Key": "s3cret"}).status_code == 200
    assert c.get("/health").status_code == 200                # health stays open for load balancers


def test_errors_never_echo_the_patient_text(it2):
    secret = "मेरे सीने में दर्द है और मेरा नाम राम है"

    class Boom(RecordingEngine):
        def translate(self, *a):
            raise RuntimeError(secret)

    r = client(it2, Boom()).post("/translate", json={"text": secret, "source": "hi", "target": "en"})
    assert r.status_code == 500 and secret not in r.text and r.json()["detail"]["code"] == "translation_failed"


def test_model_unavailable_is_503(it2):
    class Missing(RecordingEngine):
        def translate(self, *a):
            raise it2.ModelUnavailable("Could not load model")

    r = client(it2, Missing()).post("/translate", json={"text": "x", "source": "hi", "target": "en"})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "model_unavailable"


def test_fake_engine_is_clearly_labelled(it2):
    assert it2.FakeEngine().translate(["a"], "hin_Deva", "eng_Latn") == ["[FAKE hin_Deva->eng_Latn] a"]


def test_requirements_pin_transformers_below_5():
    from pathlib import Path
    req = (Path(__file__).resolve().parents[1] / "indictrans2" / "requirements.txt").read_text()
    assert "transformers>=4.44,<4.50" in req and "IndicTransToolkit" in req


def test_review_sheet_tool_writes_a_reviewable_csv(tmp_path):
    """tools/review_sheet.py against a real running fake server."""
    import csv, os, subprocess, sys, time
    import httpx
    from .test_backend_integration import ROOT, free_port, start
    port = free_port()
    proc = start("indictrans2", port, {"API_KEY": ""})
    try:
        out = tmp_path / "review.csv"
        r = subprocess.run([sys.executable, str(ROOT / "tools" / "review_sheet.py"), str(ROOT / "tools" / "sample_sentences.txt"),
                            str(out), "--url", f"http://127.0.0.1:{port}/translate"], capture_output=True, text=True)
        assert r.returncode == 0, r.stderr
        rows = list(csv.reader(open(out, encoding="utf-8-sig")))
        assert rows[0] == ["language", "original", "machine_translation", "reviewer_ok", "reviewer_correction"]
        assert len(rows) == 9 and rows[1][2].startswith("[FAKE hin_Deva->eng_Latn]") and rows[1][3:] == ["", ""]
    finally:
        proc.terminate()
        proc.wait(timeout=10)
