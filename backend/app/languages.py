"""Language registry: the ONE place that says which languages the app supports.

Adding a language = add an entry here, add its text to questionnaire/questions.py, red-flag terms to
questionnaire/safety.py, follow-up triggers to questionnaire/rules.py, and the mobile pack
(mobile/constants/{languages,strings,suggestions}.ts). tests/test_languages.py fails if a piece is missing.

draft=True means the wording was drafted by an AI and has NOT been checked by a native-speaking clinician.
Draft languages are labelled as such in the app and in every summary.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Lang:
    code: str        # ISO 639-1; also sent to speech/translation providers
    native: str
    english: str
    script: str
    locale: str      # BCP-47 tag used for on-device read-aloud
    draft: bool
    rtl: bool = False


LANGUAGES = {l.code: l for l in [
    Lang("en", "English", "English", "Latn", "en-IN", draft=False),
    Lang("kn", "ಕನ್ನಡ", "Kannada", "Knda", "kn-IN", draft=True),
    Lang("hi", "हिन्दी", "Hindi", "Deva", "hi-IN", draft=True),
    Lang("ta", "தமிழ்", "Tamil", "Taml", "ta-IN", draft=True),
]}


def is_supported(code: str) -> bool:
    return code in LANGUAGES


def as_dicts() -> list:
    return [vars(l) for l in LANGUAGES.values()]
