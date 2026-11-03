"""Conservative red-flag scanner. It can only ADD caution; it never says a patient is safe.

Matching is by lowercase substring, in English, Kannada/Hindi/Tamil script and Roman-script spellings.
Two mechanisms:
  RED_FLAGS  exact phrases
  PAIRS      a body-part word + a symptom word in the same clause (catches inflected or reordered
             phrasing such as "सीने में तेज़ दर्द" = "sharp pain in the chest")

Limits (see README): keyword based, simple negation handling, spelling variants are not exhaustive,
and the non-English term lists are an unreviewed draft. A human must always review.
"""
import re

# label -> exact phrases
RED_FLAGS = {
    "chest pain": [
        "chest pain", "chest tightness", "pain in my chest", "pain in the chest", "chest hurts",
        "ಎದೆ ನೋ", "ಎದೆನೋ", "ಎದೆಯಲ್ಲಿ ನೋ", "ಎದೆ ಬಿಗಿ", "ede nov", "edenov", "ede bigi",
        "सीने में दर्द", "सीने का दर्द", "छाती में दर्द", "छाती का दर्द", "सीने में जकड़न", "छाती में जकड़न",
        "सीने में भारीपन", "seene mein dard", "seene me dard", "chhati mein dard", "chhati me dard",
        "chest mein dard", "seene mein jakdan",
        "நெஞ்சு வலி", "நெஞ்சில் வலி", "மார்பு வலி", "மார்பில் வலி", "நெஞ்சு இறுக்க", "nenju vali", "nenjil vali",
        "marbu vali"],
    "difficulty breathing": [
        "difficulty breathing", "difficulty in breathing", "trouble breathing", "can't breathe",
        "cannot breathe", "cant breathe", "hard to breathe", "short of breath", "shortness of breath",
        "breathless", "gasping",
        "ಉಸಿರಾಟದ ತೊಂದರೆ", "ಉಸಿರಾಟದಲ್ಲಿ ತೊಂದರೆ", "ಉಸಿರಾಡಲು ತೊಂದರೆ", "ಉಸಿರಾಡಲು ಕಷ್ಟ",
        "ಉಸಿರಾಟ ಕಷ್ಟ", "ಉಸಿರು ಕಟ್ಟ",
        "usirata tondare", "usiradalu tondare", "usiradalu kashta", "usiru katt",
        "सांस लेने में तकलीफ", "साँस लेने में तकलीफ", "सांस लेने में दिक्कत", "साँस लेने में दिक्कत",
        "सांस फूल", "साँस फूल", "दम घुट", "दम फूल", "सांस नहीं ले", "साँस नहीं ले", "सांस रुक", "साँस रुक",
        "saans lene mein", "sans lene mein", "saans phool", "dam ghut",
        "மூச்சு விட முடியவில்லை", "மூச்சு திணறல்", "மூச்சுத் திணறல்", "மூச்சு விட சிரம", "moochu thinaral",
        "moochu vida"],
    "loss of consciousness": [
        "unconscious", "passed out", "lost consciousness", "fainted", "blacked out",
        "ಪ್ರಜ್ಞೆ ತಪ್ಪ", "ಪ್ರಜ್ಞಾಹೀನ", "ಮೂರ್ಛೆ", "ಮೂರ್ಚೆ", "prajne tapp", "murche",
        "बेहोश", "होश खो", "होश नहीं", "behosh", "behoshi",
        "மயங்கி", "நினைவிழ", "நினைவு இழ", "மயக்கமடை", "mayangi"],
    "seizure": [
        "seizure", "convulsion", "had a fit", "epilep",
        "ಅಪಸ್ಮಾರ", "ಫಿಟ್ಸ್", "ಸೆಳವು", "apasmara",
        "दौरा पड़", "मिर्गी", "झटके", "daura pad", "mirgi",
        "வலிப்பு", "valippu"],
    "severe bleeding": [
        "severe bleeding", "heavy bleeding", "bleeding a lot", "vomiting blood", "vomited blood",
        "coughing blood", "coughing up blood", "blood in vomit", "blood in my vomit",
        "ತೀವ್ರ ರಕ್ತಸ್ರಾವ", "ರಕ್ತಸ್ರಾವ", "ರಕ್ತ ವಾಂತಿ", "ರಕ್ತದ ವಾಂತಿ", "ಕೆಮ್ಮಿನಲ್ಲಿ ರಕ್ತ",
        "rakta vanti", "raktasrava",
        "बहुत खून", "ज्यादा खून", "ज़्यादा खून", "खून की उल्टी", "खून बह", "रक्तस्राव", "khoon ki ulti", "bahut khoon",
        "இரத்தப்போக்கு", "ரத்தப்போக்கு", "இரத்த வாந்தி", "ரத்த வாந்தி", "இரத்தம் கொட்ட", "ரத்தம் கொட்ட"],
    "possible stroke": [
        "stroke", "face drooping", "drooping face", "slurred speech", "weakness on one side",
        "one side weak", "paralysis", "paralysed", "paralyzed",
        "ಪಾರ್ಶ್ವವಾಯು", "ಲಕ್ವ", "ಮಾತು ತೊದಲ", "pakshavata", "lakwa",
        "लकवा", "पैरालिसिस", "मुंह टेढ़ा", "मुँह टेढ़ा", "चेहरा टेढ़ा", "बोलने में दिक्कत", "जुबान लड़खड़", "lakwa",
        "பக்கவாதம்", "முகம் கோணல்", "பேச்சு குளறல்", "பேச்சு தடுமாற்றம்", "pakkavatham"],
    "thoughts of self-harm": [
        "suicid", "kill myself", "want to die", "end my life", "hurt myself", "harm myself",
        "ಆತ್ಮಹತ್ಯೆ", "ಸಾಯಬೇಕು", "ಸಾಯಲು ಬಯಸ", "atmahatye",
        "आत्महत्या", "खुदकुशी", "मरना चाहता", "मरना चाहती", "जान दे", "खुद को नुकसान", "atmahatya", "khudkushi",
        "marna chahta", "marna chahti",
        "தற்கொலை", "சாக வேண்டும்", "சாகப் போகிறேன்", "என்னை நானே காயப்படுத்த", "tharkolai"],
    "poisoning or overdose": [
        "poison", "overdose", "drank pesticide", "swallowed pesticide",
        "ವಿಷ ಕುಡಿ", "ವಿಷ ಸೇವ", "vishavannu kudi",
        "ज़हर", "जहर", "कीटनाशक पी", "zeher", "jahar", "ओवरडोज़", "ओवरडोज",
        "விஷம்", "பூச்சிமருந்து", "அதிக மாத்திரை", "visham"],
    "severe allergic reaction": [
        "swelling of face", "swelling of throat", "throat swelling", "face swelling", "anaphyla",
        "ಮುಖ ಊತ", "ಗಂಟಲು ಊತ",
        "चेहरे पर सूजन", "गले में सूजन", "चेहरा सूज", "होंठ सूज",
        "முகம் வீங்க", "முகம் வீக்கம்", "தொண்டை வீக்கம்", "தொண்டை வீங்க"],
    "snake or animal bite": [
        "snake bite", "snakebite", "bitten by a snake", "dog bite", "bitten by a dog",
        "ಹಾವು ಕಚ್ಚ", "ಹಾವು ಕಡಿ", "ನಾಯಿ ಕಚ್ಚ", "havu kacch", "havu kadi",
        "सांप ने काट", "साँप ने काट", "सांप काट", "साँप काट", "कुत्ते ने काट", "saanp ne kaat", "kutte ne kaat",
        "பாம்பு கடி", "பாம்பு கடித்த", "நாய் கடி", "நாய் கடித்த", "paambu kadi"],
}

# (label, body-part words, symptom words): flagged when one of each appears in the same clause.
PAIRS = [
    ("chest pain",
     ["chest", "ಎದೆ", "सीने", "सीना", "छाती", "நெஞ்சு", "நெஞ்சில்", "மார்பு", "மார்பில்", "seene", "chhati", "ede ", "nenju"],
     ["pain", "hurt", "tight", "pressure", "ache", "ನೋ", "ಬಿಗಿ", "दर्द", "जकड़न", "भारी", "दबाव", "வலி", "இறுக்க",
      "அழுத்த", "dard", "novu", "vali"]),
    ("difficulty breathing",
     ["breath", "ಉಸಿರ", "सांस", "साँस", "श्वास", "மூச்சு", "usir", "saans", "moochu"],
     ["difficult", "trouble", "hard", "short", "cannot", "can't", "cant", "stop", "struggl", "ತೊಂದರೆ", "ಕಷ್ಟ",
      "ಕಟ್ಟ", "तकलीफ", "दिक्कत", "परेशानी", "कठिन", "मुश्किल", "रुक", "फूल", "சிரம", "கஷ்ட", "தொந்தரவு",
      "முடியவில்லை", "திணறல்", "tondare", "kashta", "takleef", "dikkat", "mushkil"]),
    ("severe bleeding",
     ["vomit", "cough", "ವಾಂತಿ", "ಕೆಮ್ಮ", "उल्टी", "खांसी", "खाँसी", "வாந்தி", "இருமல்", "ulti", "khansi"],
     ["blood", "ರಕ್ತ", "खून", "रक्त", "இரத்த", "ரத்த", "khoon", "rakta"]),
]

_CONJ = {"but", "however", "although", "though", "and", "except", "yet", "aadre", "adre",
         "ಆದರೆ", "ಮತ್ತು", "ಆದ್ರೆ", "mattu",
         "लेकिन", "मगर", "और", "lekin", "magar", "aur",
         "ஆனால்", "மற்றும்", "மேலும்", "aanal", "matrum"}
_NEG_BEFORE = {"no", "not", "never", "without", "denies", "denied", "deny", "none", "nil",
               "don't", "dont", "doesn't", "doesnt", "didn't", "didnt", "haven't", "havent",
               "hasn't", "hasnt", "isn't", "isnt", "wasn't", "wasnt", "ain't",
               "बिना", "बगैर", "bina"}
_NEG_AFTER_EXACT = {"illa", "alla", "illade", "illadhe", "ಇಲ್ಲ", "ಅಲ್ಲ", "ಇಲ್ಲವೇ", "ಇರಲಿಲ್ಲ", "ಆಗಿಲ್ಲ", "ಇಲ್ಲದೆ",
                    "नहीं", "नही", "नहि", "nahi", "nahin", "nahee",
                    "இல்லை", "இல்ல", "இல்லாமல்", "illai", "illamal"}
_NEG_AFTER_SUFFIX = ("illa", "ಿಲ್ಲ", "illai", "ில்லை")


def _normalise(text: str) -> str:
    return text.replace("\u200c", "").replace("\u200d", "").lower()


def _clauses(text: str) -> list:
    clauses = []
    for part in re.split(r"[.,;:!?\n।]+", _normalise(text)):
        current = []
        for word in part.split():
            if word in _CONJ:
                if current:
                    clauses.append(current)
                current = []
            else:
                current.append(word)
        if current:
            clauses.append(current)
    return clauses


def _is_negated(before_words: list, after_words: list) -> bool:
    if any(w in _NEG_BEFORE for w in before_words[-3:]):
        return True
    for w in after_words[:3]:
        if w in _NEG_AFTER_EXACT or w.endswith(_NEG_AFTER_SUFFIX):
            return True
    return False


def _first(clause: str, terms: list):
    best = None
    for t in terms:
        i = clause.find(t)
        if i >= 0 and (best is None or i < best[0]):
            best = (i, i + len(t))
    return best


def scan(text: str) -> list:
    """Return findings: [{label, term, negated, snippet}].

    Conservative by design: negation only applies within one clause, and clauses are
    split on punctuation and words like 'and'/'but' (so 'no fever and chest pain' is flagged).
    """
    findings, seen = [], set()

    def add(label, term, start, end, clause):
        negated = _is_negated(clause[:start].split(), clause[end:].split())
        key = (label, negated, clause)
        if key in seen:
            return
        seen.add(key)
        findings.append({"label": label, "term": term, "negated": negated, "snippet": clause[:140]})

    for words in _clauses(text or ""):
        clause = " ".join(words)
        for label, terms in RED_FLAGS.items():
            for term in terms:
                pos = clause.find(term)
                if pos >= 0:
                    add(label, term, pos, pos + len(term), clause)
        for label, parts, symptoms in PAIRS:
            a, b = _first(clause, parts), _first(clause, symptoms)
            if a and b and a != b:
                add(label, "pair", min(a[0], b[0]), max(a[1], b[1]), clause)
    return findings


URGENT_MESSAGE = {
    "en": ("Some of what you described can be serious. Please seek urgent medical care now: call 112 "
           "(India emergency number) or go to the nearest hospital. This app cannot assess emergencies "
           "and does not replace a doctor."),
    "kn": ("ನೀವು ವಿವರಿಸಿದ ಕೆಲವು ಲಕ್ಷಣಗಳು ಗಂಭೀರವಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ಈಗಲೇ ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ: "
           "112 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಿ. ಈ ಆ್ಯಪ್ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಲು "
           "ಸಾಧ್ಯವಿಲ್ಲ ಮತ್ತು ವೈದ್ಯರಿಗೆ ಪರ್ಯಾಯವಲ್ಲ."),
    "hi": ("आपने जो बताया उसमें से कुछ गंभीर हो सकता है। कृपया अभी तुरंत चिकित्सा सहायता लें: 112 पर कॉल करें "
           "या नज़दीकी अस्पताल जाएँ। यह ऐप आपात स्थिति का आकलन नहीं कर सकता और डॉक्टर का विकल्प नहीं है।"),
    "ta": ("நீங்கள் கூறியவற்றில் சில தீவிரமாக இருக்கலாம். தயவுசெய்து உடனே அவசர மருத்துவ உதவியை நாடுங்கள்: "
           "112 ஐ அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும். இந்த ஆப் அவசர நிலையை மதிப்பிட "
           "முடியாது, மருத்துவருக்கு மாற்றும் அல்ல."),
}
