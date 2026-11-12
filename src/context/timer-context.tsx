'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Company, EntryComputeType } from '@/types/database';
import { saveStoppedTimerEntry, SaveTimerResult } from '@/lib/services/timer-persistence';
import { safeGetLocalStorage, formatSecondsToTimer } from '@/lib/utils';

// Favicon dinámico en formato SVG vectorial activo (estilo Clockify) con indicador de grabación esmeralda pulsante
const ACTIVE_TIMER_FAVICON_DATA_URI = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#191654" />
        <stop offset="100%" stop-color="#8E0E75" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#3BB54A" flood-opacity="0.8" />
      </filter>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#bg)" stroke="#D8CFF0" stroke-width="2.5" />
    <rect x="28" y="10" width="8" height="4" rx="1.5" fill="#FFFFFF" />
    <line x1="32" y1="14" x2="32" y2="18" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="32" cy="36" r="17" fill="none" stroke="#FFFFFF" stroke-width="3" />
    <circle cx="32" cy="36" r="2.5" fill="#3BB54A" />
    <line x1="32" y1="36" x2="32" y2="25" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
    <line x1="32" y1="36" x2="42" y2="30" stroke="#3BB54A" stroke-width="2.5" stroke-linecap="round" />
    <g filter="url(#glow)">
      <circle cx="49" cy="15" r="9" fill="#3BB54A" stroke="#FFFFFF" stroke-width="2">
        <animate attributeName="opacity" values="1;0.45;1" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="49" cy="15" r="3.5" fill="#FFFFFF" />
    </g>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
})();

function formatActiveTabTitle(seconds: number, companyName?: string, desc?: string): string {
  const time = formatSecondsToTimer(seconds);
  const cleanDesc = desc?.trim();
  const cleanCompany = companyName?.trim();
  
  if (cleanDesc && cleanCompany) {
    return `(${time}) ${cleanDesc} • ${cleanCompany} - Brain Up Clockify`;
  }
  if (cleanCompany) {
    return `(${time}) ${cleanCompany} - Brain Up Clockify`;
  }
  if (cleanDesc) {
    return `(${time}) ${cleanDesc} - Brain Up Clockify`;
  }
  return `(${time}) En curso - Brain Up Clockify`;
}

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
  stopAndSaveTimer: (options?: {
    companyId?: string;
    description?: string;
    computeType?: EntryComputeType;
  }) => Promise<SaveTimerResult>;
  resetTimer: () => void;
  getElapsedSeconds: () => number;
}

const TimerStateContext = createContext<TimerContextType | undefined>(undefined);
const TimerSecondsContext = createContext<number>(0);

const TIMER_STORAGE_KEY_RUNNING = 'bug_clockify_timer_running';
const TIMER_STORAGE_KEY_START_TS = 'bug_clockify_timer_start_ts';
const TIMER_STORAGE_KEY_START_ISO = 'bug_clockify_timer_start_iso';
const TIMER_STORAGE_KEY_COMPANY = 'bug_clockify_active_company_id';
const TIMER_STORAGE_KEY_COMPANY_OBJ = 'bug_clockify_active_company_obj';
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
  const defaultTitleRef = useRef<string>('');
  const defaultFaviconRef = useRef<string>('');

  // Restaurar estado inicial desde localStorage
  useEffect(() => {
    try {
      const savedCompanyId = localStorage.getItem(TIMER_STORAGE_KEY_COMPANY);
      if (savedCompanyId) {
        setActiveCompanyIdState(savedCompanyId);
      }

      // Restaurar el objeto de empresa completa
      const savedCompObj = localStorage.getItem(TIMER_STORAGE_KEY_COMPANY_OBJ);
      if (savedCompObj) {
        try {
          const comp = JSON.parse(savedCompObj) as Company;
          setActiveCompanyState(comp);
        } catch {}
      } else if (savedCompanyId) {
        // Fallback a caché de empresas
        const cachedComps = safeGetLocalStorage<Company[]>('bug_clockify_cache_companies', []);
        const found = cachedComps.find((c) => c.id === savedCompanyId);
        if (found) {
          setActiveCompanyState(found);
        }
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
          const savedCompObj = localStorage.getItem(TIMER_STORAGE_KEY_COMPANY_OBJ);
          const savedDesc = localStorage.getItem(TIMER_STORAGE_KEY_DESC);

          if (savedDesc && savedDesc !== activeDescription) {
            setActiveDescriptionState(savedDesc);
          }

          if (savedCompObj) {
            try {
              const comp = JSON.parse(savedCompObj) as Company;
              setActiveCompanyState(comp);
              if (comp.id !== activeCompanyId) {
                setActiveCompanyIdState(comp.id);
              }
            } catch {}
          } else if (savedCompany && savedCompany !== activeCompanyId) {
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
  }, [activeCompanyId, activeDescription]);

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

  // Sincronización activa estilo Clockify: Document Title y Favicon dinámico en tiempo real
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Guardar título por defecto la primera vez que se detecta un título limpio (sin temporizador)
    if (!document.title.startsWith('(')) {
      defaultTitleRef.current = document.title;
    }

    // Localizar o inicializar enlaces de favicon en el DOM
    let iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    if (!defaultFaviconRef.current && iconLinks.length > 0) {
      defaultFaviconRef.current = iconLinks[0].href;
    }

    if (isTimerRunning) {
      // 1. Actualizar título de la pestaña con formato Clockify en vivo: (00:04:12) Cliente • Brain Up Clockify
      document.title = formatActiveTabTitle(timerSeconds, activeCompany?.name, activeDescription);

      // 2. Cambiar favicon al isotipo vectorial activo con indicador esmeralda de grabación
      if (iconLinks.length === 0) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = 'image/svg+xml';
        newLink.href = ACTIVE_TIMER_FAVICON_DATA_URI;
        document.head.appendChild(newLink);
      } else {
        iconLinks.forEach((link) => {
          link.type = 'image/svg+xml';
          link.href = ACTIVE_TIMER_FAVICON_DATA_URI;
        });
      }
    } else {
      // Restaurar título original cuando el temporizador se detiene
      if (defaultTitleRef.current) {
        document.title = defaultTitleRef.current;
      } else {
        document.title = 'Brain Up Hub | Suite Oficial de Aplicaciones';
      }

      // Restaurar favicon por defecto (/isotipo.png)
      const fallbackHref = defaultFaviconRef.current || '/isotipo.png';
      if (iconLinks.length > 0) {
        iconLinks.forEach((link) => {
          link.type = fallbackHref.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
          link.href = fallbackHref;
        });
      }
    }
  }, [isTimerRunning, timerSeconds, activeCompany?.name, activeDescription]);

  // Manejador de cambio de visibilidad de pestaña (recalculo instantáneo sin desfase al reenfocar)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTimerRunning && startTimestampRef.current) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startTimestampRef.current) / 1000));
        setTimerSeconds(elapsed);
        document.title = formatActiveTabTitle(elapsed, activeCompany?.name, activeDescription);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTimerRunning, activeCompany?.name, activeDescription]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyIdState(id);
    try {
      localStorage.setItem(TIMER_STORAGE_KEY_COMPANY, id);
      localStorage.setItem('bug_clockify_last_company_id', id);

      // Si no tenemos activeCompany o difiere de id, buscar en caché
      const cachedComps = safeGetLocalStorage<Company[]>('bug_clockify_cache_companies', []);
      const found = cachedComps.find((c) => c.id === id);
      if (found) {
        setActiveCompanyState(found);
        localStorage.setItem(TIMER_STORAGE_KEY_COMPANY_OBJ, JSON.stringify(found));
      }
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
        localStorage.setItem(TIMER_STORAGE_KEY_COMPANY_OBJ, JSON.stringify(company));
        localStorage.setItem('bug_clockify_last_company_id', company.id);
      } catch (e) {
        console.warn('Error saving company:', e);
      }
    } else {
      try {
        localStorage.removeItem(TIMER_STORAGE_KEY_COMPANY_OBJ);
      } catch {}
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

  // Detiene el temporizador en memoria y limpia el estado activo de localStorage
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

  // Detiene el cronómetro Y persiste automáticamente en Supabase / Caché con sincronización multi-ventana
  const stopAndSaveTimer = useCallback(async (options?: {
    companyId?: string;
    description?: string;
    computeType?: EntryComputeType;
  }): Promise<SaveTimerResult> => {
    // 1. Detener el reloj en memoria y limpiar localStorage de ejecución
    const stopResult = stopTimer();

    // 2. Persistir en Supabase y caché
    const targetCompanyId = options?.companyId || activeCompanyId || activeCompany?.id;
    const targetDesc = options?.description ?? activeDescription;

    const result = await saveStoppedTimerEntry({
      companyId: targetCompanyId,
      company: activeCompany,
      durationSeconds: stopResult.durationSeconds,
      startTimeIso: stopResult.startTimeIso,
      endTimeIso: stopResult.endTimeIso,
      description: targetDesc,
      computeType: options?.computeType,
    });

    return result;
  }, [stopTimer, activeCompanyId, activeCompany, activeDescription]);

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
    stopAndSaveTimer,
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
    stopAndSaveTimer,
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
