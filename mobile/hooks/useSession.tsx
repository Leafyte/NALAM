import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Language, ServicesStatus, Summary, UrgentNotice } from '../types';

interface Ctx {
  language: Language;
  setLanguage: (l: Language) => void;
  sessionId: string | null;
  begin: () => Promise<void>;
  reset: () => void;
  urgent: UrgentNotice | null;
  setUrgent: (u: UrgentNotice | null) => void;
  summary: Summary | null;
  setSummary: (s: Summary | null) => void;
  services: ServicesStatus | null;
  refreshServices: () => Promise<void>;
}
const SessionContext = createContext<Ctx | null>(null);

/** Everything is kept in memory only: no patient data is written to the phone's storage. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [urgent, setUrgent] = useState<UrgentNotice | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [services, setServices] = useState<ServicesStatus | null>(null);

  const refreshServices = useCallback(async () => {
    try { setServices(await api.servicesStatus()); } catch { setServices(null); }
  }, []);
  useEffect(() => { refreshServices(); }, [refreshServices]);

  const begin = useCallback(async () => {
    const r = await api.startSession(language, true); // only called after the consent box is ticked
    setSessionId(r.session_id); setUrgent(null); setSummary(null);
  }, [language]);
  const reset = useCallback(() => { setSessionId(null); setUrgent(null); setSummary(null); }, []);

  const value = useMemo(() => ({ language, setLanguage, sessionId, begin, reset, urgent, setUrgent, summary, setSummary, services, refreshServices }),
    [language, sessionId, begin, reset, urgent, summary, services, refreshServices]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const c = useContext(SessionContext);
  if (!c) throw new Error('useSession must be used inside SessionProvider');
  return c;
}
