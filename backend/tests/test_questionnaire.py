from app.questionnaire.rules import applicable_questions


def ids(text):
    return [q.id for q in applicable_questions(text)]


def test_base_flow_only_for_headache_without_pain_word_changes():
    assert ids("tired") == ["chief_complaint", "onset", "duration", "severity", "other_symptoms", "additional_info"]


def test_followups_selected_by_keywords():
    assert "fever_detail" in ids("I have fever")
    assert "cough_detail" in ids("bad cough")
    assert "gi_detail" in ids("vomiting since morning")
    assert "pain_detail" in ids("my knee hurts")
    assert "cough_detail" not in ids("headache")


def test_kannada_and_transliterated_triggers():
    assert "fever_detail" in ids("ನನಗೆ ಜ್ವರ ಇದೆ")
    assert "fever_detail" in ids("jwara ide")
    assert "pain_detail" in ids("ತಲೆನೋವು")
    assert "gi_detail" in ids("ಹೊಟ್ಟೆ ಸರಿಯಿಲ್ಲ")
