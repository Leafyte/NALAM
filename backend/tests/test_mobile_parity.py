"""Fails if the backend and the mobile app disagree about which languages exist."""
import re
from pathlib import Path

from app.languages import LANGUAGES

MOBILE = Path(__file__).resolve().parents[2] / "mobile" / "constants"


def test_mobile_registry_matches_backend():
    src = (MOBILE / "languages.ts").read_text(encoding="utf-8")
    mobile = {m.group(1): (m.group(2), m.group(3) == "true") for m in
              re.finditer(r"code: '(\w+)', native: '([^']+)'.*?draft: (true|false)", src)}
    assert set(mobile) == set(LANGUAGES)
    for code, lang in LANGUAGES.items():
        assert mobile[code] == (lang.native, lang.draft), code


def test_mobile_has_strings_for_every_language():
    src = (MOBILE / "strings.ts").read_text(encoding="utf-8")
    for code in LANGUAGES:
        assert f"const {code}" in src, f"no UI strings for {code}"
        assert re.search(rf"strings: Record<Language, Strings> = \{{[^}}]*\b{code}\b", src), code


def test_every_backend_flag_label_is_translated_on_mobile():
    from app.questionnaire.safety import RED_FLAGS
    src = (MOBILE / "strings.ts").read_text(encoding="utf-8")
    labels = list(RED_FLAGS) + ["very high self-rated severity"]
    assert src.count("flag: {") == len(LANGUAGES)
    for label in labels:
        assert src.count(f"'{label}': '") == len(LANGUAGES), f"flag label {label!r} missing in some language"
