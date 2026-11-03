import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api';
import type { AnswerPayload, AnswerResult, SessionState } from '../types';
import { useSession } from './useSession';

/** Loads the questionnaire state from the backend and saves/edits answers. */
export function useIntake() {
  const { sessionId, language, setUrgent } = useSession();
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return null;
    try {
      const s = await api.getSession(sessionId);
      setState(s); setError(null);
      return s;
    } catch (e) { setError(errorMessage(e)); return null; }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (questionId: string, payload: AnswerPayload): Promise<AnswerResult | null> => {
    if (!sessionId) return null;
    setSaving(true);
    try {
      const r = await api.submitAnswer(sessionId, { question_id: questionId, language, ...payload });
      if (r.urgent_notice) setUrgent(r.urgent_notice);
      setEditingId(null);
      await refresh();
      return r;
    } catch (e) { setError(errorMessage(e)); return null; }
    finally { setSaving(false); }
  }, [sessionId, language, refresh, setUrgent]);

  return { state, loading, saving, error, editingId, setEditingId, save, refresh, sessionId };
}
