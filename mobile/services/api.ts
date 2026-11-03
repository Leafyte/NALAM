import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AnswerPayload, AnswerResult, Language, ServicesStatus, SessionState, Summary, TranscribeResult } from '../types';

/** Never assume `localhost` means your computer when running on a physical phone. */
export function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0]; // dev machine IP seen by Expo Go
  if (host) return `http://${host}:8000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}
export const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = body?.detail;
      const message = typeof d === 'string' ? d : d?.message ?? (Array.isArray(d) ? 'Invalid input' : 'Request failed');
      throw new ApiError(d?.code ?? 'http_error', message, res.status);
    }
    return body as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('network', 'Cannot reach the server');
  } finally {
    clearTimeout(timer);
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export const api = {
  startSession: (language: Language, consent: boolean) =>
    request<{ session_id: string }>('/api/sessions', json('POST', { language, consent })),
  getSession: (id: string) => request<SessionState>(`/api/sessions/${id}`),
  submitAnswer: (id: string, body: AnswerPayload & { question_id: string; language: Language }) =>
    request<AnswerResult>(`/api/sessions/${id}/answers`, json('POST', body)),
  submit: (id: string) => request<Summary>(`/api/sessions/${id}/submit`, json('POST', { confirmed: true })),
  servicesStatus: () => request<ServicesStatus>('/api/services/status', {}, 8000),
  translate: (text: string, source: Language, target: Language) =>
    request<{ translation: string; is_mock: boolean }>('/api/translate', json('POST', { text, source, target })),
  transcribe: async (uri: string, language: Language) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      try {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        form.append('file', blob, 'recording.m4a');
      } catch {
        form.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob);
      }
    } else {
      form.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob);
    }
    form.append('language', language);
    return request<TranscribeResult>('/api/transcribe', { method: 'POST', body: form }, 120000);
  },
};

export function errorMessage(e: unknown): { code: string; message: string } {
  if (e instanceof ApiError) return { code: e.code, message: e.message };
  return { code: 'unknown', message: 'Something went wrong' };
}
