/**
 * Nalam - Clinical Dashboard Type Definitions
 */

export type LanguageCode = 'en' | 'kn' | 'hi' | 'ta' | string;

export type CaseStatus = 'pending_review' | 'reviewed' | 'corrected';

export type TriageFilter = 'all' | 'urgent' | 'pending' | 'reviewed';

export interface UrgentFlag {
  label: string;
  question_id?: string;
  snippet?: string;
}

export interface ResponseQA {
  question_en: string;
  question_id?: string;
  original_text: string;
  translated_text?: string;
  input_mode?: 'text' | 'voice';
  transcript_confidence?: number | null;
  edited?: boolean;
}

export interface SystemSummary {
  language: LanguageCode;
  main_concern: string;
  onset: string;
  duration: string;
  severity: string;
  reported_symptoms: string[];
  additional_info: string;
  urgent_flags: UrgentFlag[];
  negated_mentions?: string[];
  uncertainty_notes: string[];
  responses: ResponseQA[];
  clinician_notes?: string;
}

export interface SummaryCorrection {
  main_concern: string;
  onset: string;
  duration: string;
  severity: string;
  reported_symptoms: string[];
  additional_info: string;
  clinician_notes: string;
}

export interface IntakeCase {
  session_id: string;
  status: CaseStatus;
  submitted_at: string;
  language: LanguageCode;
  main_concern: string;
  urgent: boolean;
}

export interface DetailCase {
  session_id: string;
  status: CaseStatus;
  system_summary: SystemSummary;
  corrected_summary: SummaryCorrection | null;
}

export interface TeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'oncall' | 'offline';
  statusLabel: string;
}

export interface ServicesStatus {
  speech_to_text: {
    available: boolean;
    provider: string;
    languages: string[];
  };
  translation: {
    available: boolean;
    provider: string;
  };
}

export interface DashboardMetrics {
  activeCases: number;
  urgentCases: number;
  translationParity: string;
  avgTriageTime: string;
  verifiedCount: number;
  pendingCount: number;
  escalatedCount: number;
  completionRate: number;
}

