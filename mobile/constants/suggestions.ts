import type { Language } from '../types';

// Tap-to-fill quick options (helpful when typing is slow). `multi` = tapping adds to the text.
// Keep wording compatible with the backend keyword rules (e.g. "Fever" / "ಜ್ವರ" / "बुखार" / "காய்ச்சல்" trigger the fever follow-up).
// Typed as Record<Language, string[]> so the compiler fails if a language is missing.
interface Entry extends Record<Language, string[]> { }
const S: Record<string, { multi: boolean; opts: Entry }> = {
  chief_complaint: { multi: true, opts: {
    en: ['Headache', 'Fever', 'Cough', 'Stomach pain', 'Body pain', 'Cold', 'Vomiting'],
    kn: ['ತಲೆನೋವು', 'ಜ್ವರ', 'ಕೆಮ್ಮು', 'ಹೊಟ್ಟೆ ನೋವು', 'ಮೈ ಕೈ ನೋವು', 'ಶೀತ', 'ವಾಂತಿ'],
    hi: ['सिरदर्द', 'बुखार', 'खांसी', 'पेट दर्द', 'बदन दर्द', 'सर्दी-जुकाम', 'उल्टी'],
    ta: ['தலைவலி', 'காய்ச்சல்', 'இருமல்', 'வயிற்று வலி', 'உடல் வலி', 'சளி', 'வாந்தி'] } },
  onset: { multi: false, opts: {
    en: ['Today', 'Yesterday', '2–3 days ago', 'A week ago', 'More than a month ago'],
    kn: ['ಇಂದು', 'ನಿನ್ನೆ', '2–3 ದಿನಗಳ ಹಿಂದೆ', 'ಒಂದು ವಾರದ ಹಿಂದೆ', 'ಒಂದು ತಿಂಗಳಿಗಿಂತ ಹಿಂದೆ'],
    hi: ['आज', 'कल', '2–3 दिन पहले', 'एक हफ़्ते पहले', 'एक महीने से ज़्यादा पहले'],
    ta: ['இன்று', 'நேற்று', '2–3 நாட்களுக்கு முன்', 'ஒரு வாரத்திற்கு முன்', 'ஒரு மாதத்திற்கு மேல்'] } },
  duration: { multi: false, opts: {
    en: ['A few hours', '1–2 days', 'About a week', 'Weeks or longer', 'Constant', 'Comes and goes'],
    kn: ['ಕೆಲವು ಗಂಟೆಗಳು', '1–2 ದಿನಗಳು', 'ಸುಮಾರು ಒಂದು ವಾರ', 'ವಾರಗಳಿಂದ', 'ನಿರಂತರ', 'ಬಂದುಹೋಗುತ್ತದೆ'],
    hi: ['कुछ घंटे', '1–2 दिन', 'लगभग एक हफ़्ता', 'हफ़्तों से', 'लगातार', 'आता-जाता रहता है'],
    ta: ['சில மணி நேரம்', '1–2 நாட்கள்', 'சுமார் ஒரு வாரம்', 'வாரங்களாக', 'தொடர்ந்து', 'வந்து போகிறது'] } },
  fever_detail: { multi: true, opts: {
    en: ['Not measured', 'Chills', 'Sweating'], kn: ['ಅಳೆದಿಲ್ಲ', 'ಚಳಿ', 'ಬೆವರು'],
    hi: ['नापा नहीं', 'ठंड लगना', 'पसीना आना'], ta: ['அளக்கவில்லை', 'குளிர்', 'வியர்வை'] } },
  pain_detail: { multi: true, opts: {
    en: ['Head', 'Stomach', 'Back', 'Joints', 'Chest'], kn: ['ತಲೆ', 'ಹೊಟ್ಟೆ', 'ಬೆನ್ನು', 'ಕೀಲುಗಳು', 'ಎದೆ'],
    hi: ['सिर', 'पेट', 'पीठ', 'जोड़', 'सीना'], ta: ['தலை', 'வயிறு', 'முதுகு', 'மூட்டுகள்', 'நெஞ்சு'] } },
  cough_detail: { multi: true, opts: {
    en: ['Dry cough', 'Cough with phlegm', 'Trouble breathing'], kn: ['ಒಣಕೆಮ್ಮು', 'ಕಫದೊಂದಿಗೆ ಕೆಮ್ಮು', 'ಉಸಿರಾಡಲು ತೊಂದರೆ'],
    hi: ['सूखी खांसी', 'बलगम वाली खांसी', 'सांस लेने में तकलीफ'], ta: ['வறட்டு இருமல்', 'சளியுடன் இருமல்', 'மூச்சு விடச் சிரமம்'] } },
  gi_detail: { multi: true, opts: {
    en: ['Vomiting', 'Loose stools', "Can't drink fluids"], kn: ['ವಾಂತಿ', 'ಸಡಿಲ ಮಲ', 'ದ್ರವ ಕುಡಿಯಲು ಆಗುತ್ತಿಲ್ಲ'],
    hi: ['उल्टी', 'पतले दस्त', 'तरल नहीं पी पा रहा/रही'], ta: ['வாந்தி', 'தளர்வான மலம்', 'திரவம் குடிக்க முடியவில்லை'] } },
  other_symptoms: { multi: true, opts: {
    en: ['None', 'Body ache', 'Tiredness', 'Loss of appetite'], kn: ['ಯಾವುದೂ ಇಲ್ಲ', 'ಮೈ ಕೈ ನೋವು', 'ಆಯಾಸ', 'ಹಸಿವಿಲ್ಲ'],
    hi: ['कोई नहीं', 'बदन दर्द', 'थकान', 'भूख न लगना'], ta: ['எதுவும் இல்லை', 'உடல் வலி', 'சோர்வு', 'பசியின்மை'] } },
  additional_info: { multi: true, opts: {
    en: ['Nothing else', 'I take regular medicines', 'I have allergies'],
    kn: ['ಬೇರೇನೂ ಇಲ್ಲ', 'ನಾನು ನಿಯಮಿತ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ', 'ನನಗೆ ಅಲರ್ಜಿ ಇದೆ'],
    hi: ['और कुछ नहीं', 'मैं नियमित दवाइयाँ लेता/लेती हूँ', 'मुझे एलर्जी है'],
    ta: ['வேறு எதுவும் இல்லை', 'நான் தொடர்ந்து மருந்து எடுக்கிறேன்', 'எனக்கு ஒவ்வாமை உள்ளது'] } },
};

export function suggestionsFor(questionId: string, language: Language): { multi: boolean; options: string[] } | null {
  const e = S[questionId];
  return e ? { multi: e.multi, options: e.opts[language] } : null;
}
