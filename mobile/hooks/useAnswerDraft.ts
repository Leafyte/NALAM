import { useCallback, useEffect, useState } from 'react';
import { tr } from '../constants/strings';
import { api, errorMessage } from '../services/api';
import { parseSeverity } from '../services/format';
import { speak } from '../services/speech';
import type { AnswerPayload, Language, Question, ServicesStatus } from '../types';
import { useRecorder } from './useRecorder';

/** State for answering ONE question: text, voice recording, transcript confidence, quick options. */
export function useAnswerDraft(question: Question | null, language: Language, initial: string, services: ServicesStatus | null) {
  const t = tr(language);
  const [text, setText] = useState(initial);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [low, setLow] = useState(false);
  const [mock, setMock] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { start, stop } = useRecorder();
  const qid = question?.id;

  useEffect(() => {
    setText(initial); setMode('text'); setConfidence(null); setLow(false); setMock(false); setNote(null); setPreview(null);
  }, [qid, initial]);

  // The mic only appears for languages the server can really transcribe (IndicConformer, for example, has no English).
  const stt = services?.speech_to_text;
  const sttOk = !!stt?.available && (stt.languages ? stt.languages.includes(language) : true);

  const toggleRecord = useCallback(async () => {
    setNote(null);
    try {
      if (phase === 'idle') {
        if (!(await start())) { setNote(t.micDenied); return; }
        setPhase('recording');
        return;
      }
      if (phase === 'recording') {
        setPhase('transcribing');
        const uri = await stop();
        if (!uri) throw new Error('no audio');
        const r = await api.transcribe(uri, language);
        let finalText = r.text;
        if (question?.kind === 'severity') {
          const parsed = parseSeverity(r.text);
          if (parsed !== null) finalText = String(parsed);
        }
        setText(finalText); setMode('voice'); setConfidence(r.confidence); setLow(r.low_confidence); setMock(r.is_mock);
        setNote(t.checkTranscript);
        if (language !== 'en' && services?.translation.available) {
          try { setPreview((await api.translate(r.text, language, 'en')).translation); } catch { setPreview(null); }
        }
      }
    } catch (e) {
      setNote(errorMessage(e).code === 'stt_unavailable' ? t.voiceUnavailable : t.serverProblem);
    } finally {
      setPhase((p) => (p === 'recording' ? 'recording' : 'idle'));
    }
  }, [phase, start, stop, language, services, t]);

  const readAloud = useCallback(async () => {
    if (!question) return;
    if ((await speak(question.text, language)) === 'no_voice') setNote(t.noVoice);
  }, [question, language, t]);

  /** Quick-option tap: multi = add to the text, otherwise replace it. */
  const pick = useCallback((option: string, multi: boolean) => {
    setText((prev) => {
      if (!multi || !prev.trim()) return option;
      if (prev.toLowerCase().includes(option.toLowerCase())) return prev;
      return `${prev.trim().replace(/[,\s]+$/, '')}, ${option}`;
    });
  }, []);

  const canSend = text.trim().length > 0 && phase === 'idle' && !!question;
  const payload = useCallback((): AnswerPayload => ({
    text: text.trim(), input_mode: mode, transcript_confidence: mode === 'voice' ? confidence : null,
  }), [text, mode, confidence]);

  return { text, setText, phase, note, low, mock, preview, mode, sttOk, canSend, payload, toggleRecord, readAloud, pick };
}
export type Draft = ReturnType<typeof useAnswerDraft>;
