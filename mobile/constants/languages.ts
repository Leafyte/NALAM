import type { Language } from '../types';

/** Mirror of backend/app/languages.py. draft=true: wording not yet checked by a native-speaking clinician. */
export interface LangInfo { code: Language; native: string; english: string; locale: string; draft: boolean }

export const LANGUAGE_LIST: LangInfo[] = [
  { code: 'en', native: 'English', english: 'English', locale: 'en-IN', draft: false },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', locale: 'kn-IN', draft: true },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', locale: 'hi-IN', draft: true },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', locale: 'ta-IN', draft: true },
];
export const LANGUAGES = Object.fromEntries(LANGUAGE_LIST.map((l) => [l.code, l])) as Record<Language, LangInfo>;
