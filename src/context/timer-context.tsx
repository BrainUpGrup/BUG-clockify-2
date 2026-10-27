'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Company } from '@/types/database';

export interface TimerContextType {
  activeCompany: Company | null;
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  setActiveCompany: (company: Company | null) => void;
  isTimerRunning: boolean;
  startTimeIso: string | null;
  activeDescription: string;
  setActiveDescription: (desc: string) => void;
  startTimer: (companyId?: string) => void;
  startTimerWithEntry: (companyId: string, description: string) => void;
  stopTimer: () => { durationSeconds: number; startTimeIso: string | null; endTimeIso: string };
  resetTimer: () => void;
  getElapsedSeconds: () => number;
}

const TimerStateContext = createContext<TimerContextType | undefined>(undefined);
const TimerSecondsContext = createContext<number>(0);

const TIMER_STORAGE_KEY_RUNNING = 'bug_clockify_timer_running';
const TIMER_STORAGE_KEY_START_TS = 'bug_clockify_timer_start_ts';
const TIMER_STORAGE_KEY_START_ISO = 'bug_clockify_timer_start_iso';
const TIMER_STORAGE_KEY_COMPANY = 'bug_clockify_active_company_id';
const TIMER_STORAGE_KEY_DESC = 'bug_clockify_active_timer_desc';

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>('');
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [startTimeIso, setStartTimeIso] = useState<string | null>(null);
  const [activeDescription, setActiveDescriptionState] = useState<string>('');

  const startTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restaurar estado inicial desde localStorage
  useEffect(() => {
    try {
      const savedCompanyId = localStorage.getItem(TIMER_STORAGE_KEY_COMPANY);
      if (savedCompanyId) {
        setActiveCompanyIdState(savedCompanyId);
      }

      const savedDesc = localStorage.getItem(TIMER_STORAGE_KEY_DESC);
      if (savedDesc) {
        setActiveDescriptionState(savedDesc);
      }

      const wasRunning = localStorage.getItem(TIMER_STORAGE_KEY_RUNNING) === 'true';
      const savedStartTs = localStorage.getItem(TIMER_STORAGE_KEY_START_TS);
      const savedStartIso = localStorage.getItem(TIMER_STORAGE_KEY_START_ISO);

      if (wasRunning && savedStartTs) {
        const startTs = parseInt(savedStartTs, 10);
        if (!isNaN(startTs) && startTs > 0) {
          startTimestampRef.current = startTs;
          const elapsed = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
          setTimerSeconds(elapsed);
          setStartTimeIso(savedStartIso || new Date(startTs).toISOString());
          setIsTimerRunning(true);
        }
      }
    } catch (e) {
      console.warn('Error restoring timer state:', e);
    }
  }, []);

  // Sincronización multi-pestaña y multi-ventana (Floating Timer) en tiempo real
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('bug_clockify_')) {
        try {
          const wasRunning = localStorage.getItem(TIMER_STORAGE_KEY_RUNNING) === 'true';
          const savedStartTs = localStorage.getItem(TIMER_STORAGE_KEY_START_TS);
          const savedCompany = localStorage.getItem(TIMER_STORAGE_KEY_COMPANY);

          if (savedCompany && savedCompany !== activeCompanyId) {
            setActiveCompanyIdState(savedCompany);
          }

          if (wasRunning && savedStartTs) {
            const startTs = parseInt(savedStartTs, 10);
            if (!isNaN(startTs) && startTs > 0) {
              startTimestampRef.current = startTs;
              const elapsed = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
              setTimerSeconds(elapsed);
              setIsTimerRunning(true);
            }
          } else {
            startTimestampRef.current = null;
            setIsTimerRunning(false);
            setTimerSeconds(0);
          }
        } catch (err) {
          console.warn('Error syncing storage in timer:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeCompanyId]);

  // Intervalo de cálculo preciso basado en timestamp
  useEffect(() => {
    if (isTimerRunning && startTimestampRef.current) {
      intervalRef.current = setInterval(() => {
        if (startTimestampRef.current) {
          const elapsed = Math.max(0, Math.floor((Date.now() - startTimestampRef.current) / 1000));
          setTimerSeconds(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyIdState(id);
    try {
      localStorage.setItem(TIMER_STORAGE_KEY_COMPANY, id);
      localStorage.setItem('bug_clockify_last_company_id', id);
    } catch (e) {
      console.warn('Error saving company id:', e);
    }
  }, []);

  const setActiveCompany = useCallback((company: Company | null) => {
    setActiveCompanyState(company);
    if (company) {
      setActiveCompanyIdState(company.id);
      try {
        localStorage.setItem(TIMER_STORAGE_KEY_COMPANY, company.id);
        localStorage.setItem('bug_clockify_last_company_id', company.id);
      } catch (e) {
        console.warn('Error saving company:', e);
      }
    }
  }, []);

  const setActiveDescription = useCallback((desc: string) => {
    setActiveDescriptionState(desc);
    try {
      localStorage.setItem(TIMER_STORAGE_KEY_DESC, desc);
    } catch (e) {
      console.warn('Error saving description:', e);
    }
  }, []);

  const startTimer = useCallback((companyId?: string) => {
    const nowTs = Date.now();
    const nowIso = new Date(nowTs).toISOString();
    startTimestampRef.current = nowTs;
    setStartTimeIso(nowIso);
    setTimerSeconds(0);
    setIsTimerRunning(true);

    const targetCompanyId = companyId || activeCompanyId;

    try {
      localStorage.setItem(TIMER_STORAGE_KEY_RUNNING, 'true');
      localStorage.setItem(TIMER_STORAGE_KEY_START_TS, nowTs.toString());
      localStorage.setItem(TIMER_STORAGE_KEY_START_ISO, nowIso);
      if (targetCompanyId) {
        localStorage.setItem(TIMER_STORAGE_KEY_COMPANY, targetCompanyId);
      }
    } catch (e) {
      console.warn('Error persisting start timer:', e);
    }
  }, [activeCompanyId]);

  const startTimerWithEntry = useCallback((companyId: string, desc: string) => {
    setActiveCompanyId(companyId);
    setActiveDescription(desc);
    const nowTs = Date.now();
    const nowIso = new Date(nowTs).toISOString();
    startTimestampRef.current = nowTs;
    setStartTimeIso(nowIso);
    setTimerSeconds(0);
    setIsTimerRunning(true);

    try {
      localStorage.setItem(TIMER_STORAGE_KEY_RUNNING, 'true');
      localStorage.setItem(TIMER_STORAGE_KEY_START_TS, nowTs.toString());
      localStorage.setItem(TIMER_STORAGE_KEY_START_ISO, nowIso);
      localStorage.setItem(TIMER_STORAGE_KEY_COMPANY, companyId);
      localStorage.setItem(TIMER_STORAGE_KEY_DESC, desc);
    } catch (e) {
      console.warn('Error persisting repeated timer:', e);
    }
  }, [setActiveCompanyId, setActiveDescription]);

  const stopTimer = useCallback(() => {
    const endTimeIso = new Date().toISOString();
    const totalDuration = startTimestampRef.current 
      ? Math.max(1, Math.floor((Date.now() - startTimestampRef.current) / 1000))
      : timerSeconds;

    const savedIso = startTimeIso;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    startTimestampRef.current = null;
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setStartTimeIso(null);

    try {
      localStorage.removeItem(TIMER_STORAGE_KEY_RUNNING);
      localStorage.removeItem(TIMER_STORAGE_KEY_START_TS);
      localStorage.removeItem(TIMER_STORAGE_KEY_START_ISO);
      localStorage.removeItem(TIMER_STORAGE_KEY_DESC);
    } catch (e) {
      console.warn('Error clearing timer storage:', e);
    }

    return {
      durationSeconds: totalDuration,
      startTimeIso: savedIso,
      endTimeIso,
    };
  }, [startTimeIso, timerSeconds]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimestampRef.current = null;
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setStartTimeIso(null);

    try {
      localStorage.removeItem(TIMER_STORAGE_KEY_RUNNING);
      localStorage.removeItem(TIMER_STORAGE_KEY_START_TS);
      localStorage.removeItem(TIMER_STORAGE_KEY_START_ISO);
      localStorage.removeItem(TIMER_STORAGE_KEY_DESC);
    } catch (e) {
      console.warn('Error resetting timer storage:', e);
    }
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (!startTimestampRef.current) return 0;
    return Math.max(0, Math.floor((Date.now() - startTimestampRef.current) / 1000));
  }, []);

  const stateValue = useMemo<TimerContextType>(() => ({
    activeCompany,
    activeCompanyId,
    setActiveCompanyId,
    setActiveCompany,
    isTimerRunning,
    startTimeIso,
    activeDescription,
    setActiveDescription,
    startTimer,
    startTimerWithEntry,
    stopTimer,
    resetTimer,
    getElapsedSeconds,
  }), [
    activeCompany,
    activeCompanyId,
    setActiveCompanyId,
    setActiveCompany,
    isTimerRunning,
    startTimeIso,
    activeDescription,
    setActiveDescription,
    startTimer,
    startTimerWithEntry,
    stopTimer,
    resetTimer,
    getElapsedSeconds,
  ]);

  return (
    <TimerStateContext.Provider value={stateValue}>
      <TimerSecondsContext.Provider value={timerSeconds}>
        {children}
      </TimerSecondsContext.Provider>
    </TimerStateContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerStateContext);
  if (!context) {
    throw new Error('useTimer debe ser usado dentro de un TimerProvider');
  }
  return context;
}

export function useTimerSeconds() {
  return useContext(TimerSecondsContext);
}
