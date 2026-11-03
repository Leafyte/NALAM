import * as Speech from 'expo-speech';
import { LANGUAGES } from '../constants/languages';
import type { Language } from '../types';

/** Reads text aloud with the phone's own voices. Kannada voices are often NOT installed,
 * so we check first and report 'no_voice' instead of failing silently. */
export async function speak(text: string, language: Language): Promise<'spoken' | 'no_voice'> {
  const want = language;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const has = voices.some((v) => v.language?.toLowerCase().replace('_', '-').startsWith(want));
    if (!has) return 'no_voice';
  } catch {
    return 'no_voice';
  }
  await Speech.stop();
  Speech.speak(text, { language: LANGUAGES[language].locale });
  return 'spoken';
}
export const stopSpeaking = () => Speech.stop();
