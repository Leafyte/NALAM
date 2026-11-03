"""Fixed questionnaire. Kannada wording should be reviewed by a native speaker
(ideally a clinician) before any real-world use."""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Question:
    id: str
    kind: str          # "text" | "severity"
    stage: str         # "core" (screen 2) | "followup" (screen 3 chat)
    required: bool
    text: dict         # {"en": ..., "kn": ...}
    hint: Optional[dict] = None


QUESTIONS = [
    Question("chief_complaint", "text", "core", True,
             {"en": "What is your main health concern today? Please describe it in your own words.",
              "kn": "ಇಂದು ನಿಮ್ಮ ಮುಖ್ಯ ಆರೋಗ್ಯ ಸಮಸ್ಯೆ ಏನು? ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ವಂತ ಮಾತುಗಳಲ್ಲಿ ವಿವರಿಸಿ.",
              "hi": "आज आपकी मुख्य स्वास्थ्य समस्या क्या है? कृपया अपने शब्दों में बताइए।",
              "ta": "இன்று உங்கள் முக்கிய உடல்நலப் பிரச்சினை என்ன? தயவுசெய்து உங்கள் சொந்த வார்த்தைகளில் விவரிக்கவும்."},
             {"en": "For example: headache, fever, stomach pain, cough.",
              "kn": "ಉದಾಹರಣೆ: ತಲೆನೋವು, ಜ್ವರ, ಹೊಟ್ಟೆ ನೋವು, ಕೆಮ್ಮು.",
              "hi": "उदाहरण: सिरदर्द, बुखार, पेट दर्द, खांसी।",
              "ta": "எடுத்துக்காட்டு: தலைவலி, காய்ச்சல், வயிற்று வலி, இருமல்."}),
    Question("onset", "text", "core", True,
             {"en": "When did this problem start?",
              "kn": "ಈ ಸಮಸ್ಯೆ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು?",
              "hi": "यह समस्या कब शुरू हुई?",
              "ta": "இந்தப் பிரச்சினை எப்போது தொடங்கியது?"},
             {"en": "For example: yesterday morning, 3 days ago, last month.",
              "kn": "ಉದಾಹರಣೆ: ನಿನ್ನೆ ಬೆಳಿಗ್ಗೆ, 3 ದಿನಗಳ ಹಿಂದೆ, ಕಳೆದ ತಿಂಗಳು.",
              "hi": "उदाहरण: कल सुबह, 3 दिन पहले, पिछले महीने।",
              "ta": "எடுத்துக்காட்டு: நேற்று காலை, 3 நாட்களுக்கு முன், கடந்த மாதம்."}),
    Question("duration", "text", "core", True,
             {"en": "How long have you had it? Is it constant, or does it come and go?",
              "kn": "ಇದು ಎಷ್ಟು ಸಮಯದಿಂದ ಇದೆ? ಇದು ನಿರಂತರವಾಗಿದೆಯೇ ಅಥವಾ ಬಂದುಹೋಗುತ್ತದೆಯೇ?",
              "hi": "यह कितने समय से है? क्या यह लगातार रहती है या आती-जाती रहती है?",
              "ta": "இது எவ்வளவு காலமாக இருக்கிறது? தொடர்ந்து இருக்கிறதா அல்லது வந்து போகிறதா?"}),
    Question("severity", "severity", "core", False,
             {"en": "On a scale of 0 (none) to 10 (worst imaginable), how severe is it right now?",
              "kn": "0 (ಇಲ್ಲ) ರಿಂದ 10 (ಅತ್ಯಂತ ತೀವ್ರ) ವರೆಗೆ, ಈಗ ಇದು ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ?",
              "hi": "0 (कुछ नहीं) से 10 (सबसे ज़्यादा) के पैमाने पर, अभी यह कितनी तेज़ है?",
              "ta": "0 (இல்லை) முதல் 10 (மிகக் கடுமை) வரை, இப்போது இது எவ்வளவு கடுமையாக உள்ளது?"}),
    # ---- conditional follow-ups (chosen by keyword rules in rules.py) ----
    Question("fever_detail", "text", "followup", False,
             {"en": "Have you measured your temperature? If so, what was it? Do you have chills or sweating?",
              "kn": "ನೀವು ದೇಹದ ಉಷ್ಣತೆಯನ್ನು ಅಳೆದಿದ್ದೀರಾ? ಹೌದಾದರೆ ಎಷ್ಟಿತ್ತು? ಚಳಿ ಅಥವಾ ಬೆವರು ಇದೆಯೇ?",
              "hi": "क्या आपने बुखार नापा है? अगर हाँ, तो कितना था? क्या ठंड लगना या पसीना आना है?",
              "ta": "உடல் வெப்பநிலையை அளந்தீர்களா? அளந்திருந்தால் எவ்வளவு இருந்தது? குளிர் அல்லது வியர்வை உள்ளதா?"}),
    Question("pain_detail", "text", "followup", False,
             {"en": "Where exactly is the pain, and does it spread anywhere else?",
              "kn": "ನೋವು ನಿಖರವಾಗಿ ಎಲ್ಲಿದೆ, ಮತ್ತು ಬೇರೆ ಕಡೆ ಹರಡುತ್ತದೆಯೇ?",
              "hi": "दर्द ठीक किस जगह है, और क्या यह कहीं और भी फैलता है?",
              "ta": "வலி சரியாக எங்கு உள்ளது, வேறு இடங்களுக்கும் பரவுகிறதா?"}),
    Question("cough_detail", "text", "followup", False,
             {"en": "Is your cough dry or with phlegm? Is there any blood in it, or any trouble breathing?",
              "kn": "ನಿಮ್ಮ ಕೆಮ್ಮು ಒಣಕೆಮ್ಮೋ ಅಥವಾ ಕಫದೊಂದಿಗೆ ಇದೆಯೇ? ಅದರಲ್ಲಿ ರಕ್ತ ಇದೆಯೇ ಅಥವಾ ಉಸಿರಾಡಲು ತೊಂದರೆ ಇದೆಯೇ?",
              "hi": "आपकी खांसी सूखी है या बलगम वाली? क्या उसमें खून आता है, या सांस लेने में कोई तकलीफ है?",
              "ta": "உங்கள் இருமல் வறட்டு இருமலா அல்லது சளியுடன் உள்ளதா? அதில் இரத்தம் வருகிறதா அல்லது மூச்சு விடுவதில் சிரமம் உள்ளதா?"}),
    Question("gi_detail", "text", "followup", False,
             {"en": "How many times have you vomited or had loose stools in the last day? Are you able to drink fluids?",
              "kn": "ಕಳೆದ ಒಂದು ದಿನದಲ್ಲಿ ಎಷ್ಟು ಬಾರಿ ವಾಂತಿ ಅಥವಾ ಸಡಿಲ ಮಲ ಆಯಿತು? ನೀವು ದ್ರವ ಪದಾರ್ಥಗಳನ್ನು ಕುಡಿಯಲು ಸಾಧ್ಯವೇ?",
              "hi": "पिछले एक दिन में कितनी बार उल्टी या पतले दस्त हुए? क्या आप तरल पदार्थ पी पा रहे हैं?",
              "ta": "கடந்த ஒரு நாளில் எத்தனை முறை வாந்தி அல்லது தளர்வான மலம் ஏற்பட்டது? திரவங்களை குடிக்க முடிகிறதா?"}),
    # ---- always asked at the end ----
    Question("other_symptoms", "text", "followup", False,
             {"en": "Have you noticed any other symptoms?",
              "kn": "ನೀವು ಗಮನಿಸಿದ ಬೇರೆ ಯಾವುದೇ ಲಕ್ಷಣಗಳಿವೆಯೇ?",
              "hi": "क्या आपने कोई और लक्षण महसूस किए हैं?",
              "ta": "வேறு ஏதேனும் அறிகுறிகளை கவனித்தீர்களா?"}),
    Question("additional_info", "text", "followup", False,
             {"en": "Is there anything else the healthcare professional should know (for example medicines you take, allergies, or existing conditions)?",
              "kn": "ಆರೋಗ್ಯ ಸೇವಾ ವೃತ್ತಿಪರರಿಗೆ ತಿಳಿಸಬೇಕಾದ ಬೇರೆ ಏನಾದರೂ ಇದೆಯೇ (ಉದಾಹರಣೆಗೆ ನೀವು ತೆಗೆದುಕೊಳ್ಳುವ ಔಷಧಿಗಳು, ಅಲರ್ಜಿಗಳು, ಅಥವಾ ಈಗಾಗಲೇ ಇರುವ ಕಾಯಿಲೆಗಳು)?",
              "hi": "क्या कोई और बात है जो स्वास्थ्य कर्मी को पता होनी चाहिए (जैसे आप जो दवाइयाँ लेते हैं, एलर्जी, या पहले से मौजूद बीमारियाँ)?",
              "ta": "சுகாதார நிபுணர் தெரிந்து கொள்ள வேண்டிய வேறு ஏதேனும் உள்ளதா (எடுத்துக்காட்டாக, நீங்கள் உட்கொள்ளும் மருந்துகள், ஒவ்வாமைகள் அல்லது ஏற்கனவே உள்ள நோய்கள்)?"}),
]

QUESTIONS_BY_ID = {q.id: q for q in QUESTIONS}
