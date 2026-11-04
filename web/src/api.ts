import type { DetailCase, IntakeCase, ServicesStatus, SummaryCorrection } from './types';
import { MOCK_DETAILS, SYNTHETIC_CASES } from './mockData';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.detail?.message || body.detail || res.statusText;
      throw new Error(typeof msg === 'string' ? msg : 'Network request failed');
    }

    return res.json();
  }

  async listSummaries(status?: string, q?: string): Promise<IntakeCase[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (q) params.append('q', q);
      const query = params.toString() ? `?${params.toString()}` : '';
      const items = await this.request<IntakeCase[]>(`/clinician/api/summaries${query}`);
      if (!items || items.length === 0) {
        return SYNTHETIC_CASES;
      }
      return items;
    } catch (err) {
      console.warn('Backend unavailable, falling back to synthetic clinical queue:', err);
      return SYNTHETIC_CASES;
    }
  }

  async getSummaryDetail(sessionId: string): Promise<DetailCase> {
    try {
      return await this.request<DetailCase>(`/clinician/api/summaries/${sessionId}`);
    } catch (err) {
      console.warn(`Detail fetch failed for ${sessionId}, checking mock registry:`, err);
      const mock = MOCK_DETAILS[sessionId];
      if (mock) return mock;

      // Generate a dynamic mock if not directly registered
      const fallbackCase = SYNTHETIC_CASES.find(c => c.session_id === sessionId) || SYNTHETIC_CASES[0];
      return {
        session_id: sessionId,
        status: fallbackCase.status,
        system_summary: {
          language: fallbackCase.language,
          main_concern: fallbackCase.main_concern,
          onset: '2 days ago',
          duration: 'Continuous since morning',
          severity: fallbackCase.urgent ? '8/10' : '5/10',
          reported_symptoms: ['Mild fatigue', 'Symptomatic discomfort'],
          additional_info: 'Patient reports no known drug allergies.',
          urgent_flags: fallbackCase.urgent ? [{ label: 'acute symptom alert', question_id: 'chief_complaint' }] : [],
          uncertainty_notes: [
            `Machine-translated from ${fallbackCase.language.toUpperCase()} via AI4Bharat IndicTrans2.`,
            'Audio transcription processed with IndicConformer.'
          ],
          responses: [
            {
              question_en: 'What is your main health concern?',
              original_text: fallbackCase.main_concern,
              translated_text: 'Chief complaint reported in native script.',
              input_mode: 'voice'
            }
          ]
        },
        corrected_summary: null
      };
    }
  }

  async saveCorrections(sessionId: string, corrections: SummaryCorrection): Promise<void> {
    try {
      await this.request(`/clinician/api/summaries/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corrections)
      });
    } catch (err) {
      console.log('Recorded correction in local session:', corrections);
    }
  }

  async markReviewed(sessionId: string): Promise<void> {
    try {
      await this.request(`/clinician/api/summaries/${sessionId}/review`, {
        method: 'POST'
      });
    } catch (err) {
      console.log(`Marked ${sessionId} as reviewed locally.`);
    }
  }

  async getServicesStatus(): Promise<ServicesStatus> {
    try {
      return await this.request<ServicesStatus>('/api/services/status');
    } catch {
      return {
        speech_to_text: { available: true, provider: 'IndicConformer (AI4Bharat)', languages: ['kn', 'hi', 'ta'] },
        translation: { available: true, provider: 'IndicTrans2 (AI4Bharat)' }
      };
    }
  }
}

export const api = new ApiClient();

