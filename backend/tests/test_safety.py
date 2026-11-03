import pytest
from app.questionnaire.safety import scan


def flags(t):
    return [(f["label"], f["negated"]) for f in scan(t)]


@pytest.mark.parametrize("text,label", [
    ("I have chest pain", "chest pain"),
    ("I can't breathe properly", "difficulty breathing"),
    ("he passed out this morning", "loss of consciousness"),
    ("ಎದೆ ನೋವು ಇದೆ", "chest pain"),
    ("ede novu ide", "chest pain"),
    ("ಉಸಿರಾಡಲು ತೊಂದರೆ ಆಗುತ್ತಿದೆ", "difficulty breathing"),
    ("I feel suicidal", "thoughts of self-harm"),
])
def test_red_flags_detected_not_negated(text, label):
    assert (label, False) in flags(text)


@pytest.mark.parametrize("text,label", [
    ("no chest pain", "chest pain"),
    ("I don't have chest pain", "chest pain"),
    ("ಎದೆ ನೋವು ಇಲ್ಲ", "chest pain"),
    ("ede novu illa", "chest pain"),
    ("ಎದೆನೋವಿಲ್ಲ", "chest pain"),
])
def test_negated_mentions_are_marked_negated(text, label):
    assert flags(text) == [(label, True)]


@pytest.mark.parametrize("text", [
    "no fever but chest pain",
    "no fever and chest pain",   # ambiguous scope: stay conservative
    "chest pain, no relief",
])
def test_conservative_when_negation_scope_is_unclear(text):
    assert ("chest pain", False) in flags(text)


def test_ordinary_complaint_has_no_flags():
    assert scan("headache since yesterday") == []
