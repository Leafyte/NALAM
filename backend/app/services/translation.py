"""Translation service interface.

Providers (TRANSLATION_PROVIDER):
  none              -> unavailable (app still works, answers stay in the original language)
  google            -> Google Cloud Translation v2 REST (needs GOOGLE_TRANSLATE_API_KEY)
  indictrans2_http  -> YOUR OWN IndicTrans2 server at INDICTRANS2_URL. Contract:
                       POST {url}  JSON {"text": "...", "source": "kn", "target": "en"}   (+ header X-API-Key if INDICTRANS2_API_KEY is set)
                       -> 200 JSON {"translation": "..."}
  mock              -> fake output prefixed with [MOCK TRANSLATION]; for demos/tests ONLY
"""
import httpx

from ..config import get_settings

from ..languages import LANGUAGES

LANGS = set(LANGUAGES)


class TranslationUnavailable(Exception):
    pass


class TranslationError(Exception):
    pass


def provider_name() -> str:
    return get_settings().translation_provider


def is_available() -> bool:
    s = get_settings()
    p = s.translation_provider
    if p == "mock":
        return True
    if p == "google":
        return bool(s.google_translate_api_key)
    if p == "indictrans2_http":
        return bool(s.indictrans2_url)
    return False


def translate(text: str, source: str, target: str) -> dict:
    """Returns {"translation": str, "provider": str, "is_mock": bool}."""
    if source not in LANGS or target not in LANGS:
        raise TranslationError("Unsupported language pair")
    if source == target:
        return {"translation": text, "provider": "none", "is_mock": False}
    if not is_available():
        raise TranslationUnavailable("No translation provider is configured")
    s = get_settings()
    p = s.translation_provider
    try:
        if p == "mock":
            return {"translation": f"[MOCK TRANSLATION {source}->{target}] {text}", "provider": "mock", "is_mock": True}
        if p == "google":
            r = httpx.post("https://translation.googleapis.com/language/translate/v2",
                           params={"key": s.google_translate_api_key},
                           json={"q": text, "source": source, "target": target, "format": "text"}, timeout=20)
            r.raise_for_status()
            return {"translation": r.json()["data"]["translations"][0]["translatedText"],
                    "provider": "google", "is_mock": False}
        if p == "indictrans2_http":
            headers = {"X-API-Key": s.indictrans2_api_key} if s.indictrans2_api_key else {}
            r = httpx.post(s.indictrans2_url, json={"text": text, "source": source, "target": target},
                           headers=headers, timeout=90)
            r.raise_for_status()
            return {"translation": r.json()["translation"], "provider": "indictrans2_http", "is_mock": False}
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        # Do not include the text in the error: it is health information.
        raise TranslationError(f"Translation provider failed ({type(exc).__name__})") from exc
    raise TranslationUnavailable("Unknown translation provider")
