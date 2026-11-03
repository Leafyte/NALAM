export type Language = 'en' | 'kn' | 'hi' | 'ta';

export interface Question {
  id: string;
  text: string;
  hint?: string | null;
  kind: 'text' | 'severity';
  stage: 'core' | 'followup';
  required: boolean;
  position: number;
  total: number;
}

export interface UrgentNotice { message: string; matched: string[] }

export interface AnswerItem {
  question: Question;
  text: string | null;
  original_text: string | null;
  translated_text: string | null;
  input_mode: string | null;
  transcript_confidence: number | null;
  edited: boolean;
  skipped: boolean;
  answered: boolean;
}

export interface SessionState {
  session_id: string;
  language: Language;
  status: string;
  items: AnswerItem[];
  next_question: Question | null;
}

export interface AnswerPayload {
  text: string;
  input_mode: 'text' | 'voice';
  transcript_confidence?: number | null;
  skipped?: boolean;
}

export interface AnswerResult {
  question_id: string;
  text: string;
  original_text: string;
  translated_text: string | null;
  translation_status: 'not_needed' | 'ok' | 'mock' | 'unavailable';
  edited: boolean;
  urgent_notice: UrgentNotice | null;
  next_question: Question | null;
  complete: boolean;
}

export interface Flag { label: string; question_id: string; snippet: string }

export interface ResponseItem {
  question_id: string;
  question: string;
  question_en: string;
  original_text: string | null;
  current_text: string | null;
  translated_text: string | null;
  language: string | null;
  input_mode: string | null;
  edited: boolean;
  skipped: boolean;
  transcript_confidence: number | null;
  translation_provider: string | null;
}

export interface Summary {
  language: Language;
  main_concern: string;
  reported_symptoms: string[];
  onset: string;
  duration: string;
  severity: string;
  additional_info: string;
  urgent_flags: Flag[];
  negated_mentions: Flag[];
  responses: ResponseItem[];
  uncertainty_notes: string[];
  notice: string;
  generated_at: string;
}

export interface ServicesStatus {
  speech_to_text: { available: boolean; provider: string; languages?: string[] };
  translation: { available: boolean; provider: string };
}

export interface TranscribeResult { text: string; confidence: number | null; provider: string; is_mock: boolean; low_confidence: boolean }
