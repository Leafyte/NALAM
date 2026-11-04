import type { DetailCase, IntakeCase, TeamMember } from './types';

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    initials: 'AR',
    name: 'Dr. Ananya Rao, MD',
    role: 'Triage Lead & Emergency',
    status: 'online',
    statusLabel: 'On Duty'
  },
  {
    id: '2',
    initials: 'RK',
    name: 'Dr. Rajesh Kumar, MBBS',
    role: 'Internal Medicine',
    status: 'busy',
    statusLabel: 'Reviewing'
  },
  {
    id: '3',
    initials: 'KM',
    name: 'Sister Kavitha M.',
    role: 'Lead Triage Nurse',
    status: 'online',
    statusLabel: 'Available'
  },
  {
    id: '4',
    initials: 'VS',
    name: 'Dr. Vignesh S., MS',
    role: 'Trauma & Acute Care',
    status: 'oncall',
    statusLabel: 'On Call'
  }
];

export const SYNTHETIC_CASES: IntakeCase[] = [
  {
    session_id: 'intake-8842-kn',
    status: 'pending_review',
    submitted_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    language: 'kn',
    main_concern: 'ಎದೆ ನೋವು ಇದೆ, ನಿನ್ನೆಯಿಂದ ಉಸಿರಾಡಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ (Chest pain with breathing difficulty)',
    urgent: true
  },
  {
    session_id: 'intake-7193-hi',
    status: 'pending_review',
    submitted_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    language: 'hi',
    main_concern: 'मुझे तीन दिन से तेज बुखार और सिरदर्द है (High fever and severe headache for 3 days)',
    urgent: false
  },
  {
    session_id: 'intake-6401-ta',
    status: 'pending_review',
    submitted_at: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
    language: 'ta',
    main_concern: 'வயிற்று வலி மற்றும் தொடர்ந்து வாந்தி வருகிறது (Severe abdominal pain and recurrent vomiting)',
    urgent: false
  },
  {
    session_id: 'intake-5519-en',
    status: 'reviewed',
    submitted_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    language: 'en',
    main_concern: 'Persistent dry cough with mild throat tickle and fatigue since last Thursday',
    urgent: false
  },
  {
    session_id: 'intake-4920-kn',
    status: 'corrected',
    submitted_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    language: 'kn',
    main_concern: 'ತೀವ್ರ ರಕ್ತಸ್ರಾವ ಮತ್ತು ಸುಸ್ತು (Bleeding and extreme exhaustion)',
    urgent: true
  },
  {
    session_id: 'intake-3211-ta',
    status: 'reviewed',
    submitted_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    language: 'ta',
    main_concern: 'மூட்டு வலி மற்றும் காலை நேரத்தில் விறைப்பு (Joint pain and morning stiffness in both knees)',
    urgent: false
  }
];

export const MOCK_DETAILS: Record<string, DetailCase> = {
  'intake-8842-kn': {
    session_id: 'intake-8842-kn',
    status: 'pending_review',
    system_summary: {
      language: 'kn',
      main_concern: 'ಎದೆ ನೋವು ಇದೆ, ನಿನ್ನೆಯಿಂದ ಉಸಿರಾಡಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ',
      onset: 'ನಿನ್ನೆ ಮಧ್ಯಾಹ್ನ (Yesterday afternoon around 2 PM)',
      duration: 'ಸುಮಾರು 24 ಗಂಟೆಗಳು (About 24 hours continuous)',
      severity: '8/10',
      reported_symptoms: [
        'ಎದೆ ಬಿಗಿತ (Chest tightness)',
        'ಉಸಿರಾಟದ ತೊಂದರೆ (Shortness of breath)',
        'ಬೆವರುವುದು (Excessive cold sweating)',
        'ಎಡ ಭುಜಕ್ಕೆ ಹರಡುವ ನೋವು (Pain radiating to left shoulder)'
      ],
      additional_info: 'Patient has history of mild hypertension, takes Amlodipine 5mg. Non-smoker.',
      urgent_flags: [
        { label: 'chest pain', question_id: 'chief_complaint', snippet: 'ಎದೆ ನೋವು ಇದೆ' },
        { label: 'shortness of breath', question_id: 'chief_complaint', snippet: 'ಉಸಿರಾಡಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ' }
      ],
      uncertainty_notes: [
        'Voice input confidence: 0.96 (Kannada IndicConformer)',
        'Deterministic safety scan triggered RED FLAG: chest pain + dyspnea pattern.',
        'Machine-translated from Kannada via IndicTrans2; confirmed with clinical lexicon.'
      ],
      responses: [
        {
          question_en: 'What is your main health concern?',
          question_id: 'chief_complaint',
          original_text: 'ಎದೆ ನೋವು ಇದೆ, ನಿನ್ನೆಯಿಂದ ಉಸಿರಾಡಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ',
          translated_text: 'I have chest pain and have been having difficulty breathing since yesterday.',
          input_mode: 'voice',
          transcript_confidence: 0.96
        },
        {
          question_en: 'When did this problem begin?',
          question_id: 'onset',
          original_text: 'ನಿನ್ನೆ ಮಧ್ಯಾಹ್ನ ಊಟದ ನಂತರ ಶುರುವಾಯಿತು',
          translated_text: 'It started yesterday afternoon after lunch.',
          input_mode: 'voice',
          transcript_confidence: 0.94
        },
        {
          question_en: 'How long has it been lasting?',
          question_id: 'duration',
          original_text: 'ರಾತ್ರಿಯಿಡೀ ಇತ್ತು, ಈಗಲೂ ಹಾಗೇ ಇದೆ',
          translated_text: 'It was there all night and continues right now.',
          input_mode: 'text'
        },
        {
          question_en: 'How severe is it on a scale of 0 to 10?',
          question_id: 'severity',
          original_text: '8',
          translated_text: '8/10 (Severe)',
          input_mode: 'voice',
          transcript_confidence: 0.98
        }
      ]
    },
    corrected_summary: null
  }
};

