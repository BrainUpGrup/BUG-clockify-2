'use client';

import React, { useState, useEffect } from 'react';
import { SubtitulosHealth } from '@/types/subtitulos';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export function ServiceStatusBadge() {
  const [health, setHealth] = useState<SubtitulosHealth | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/subtitulos/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D8CFF0] bg-white text-xs font-semibold shadow-sm">
        {checking && <RefreshCw className="h-3 w-3 animate-spin text-[#8E0E75]" />}
        
        {!checking && isOnline && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[#292929]">
              API Subtítulos <strong className="text-emerald-700">Online</strong>
            </span>
            {health && (
              <span className="hidden sm:inline-block text-[#8E0E75] font-mono text-[11px] bg-[#F8F6FC] px-1.5 py-0.5 rounded">
                Whisper {health.whisper} · Claude
              </span>
            )}
          </>
        )}

        {!checking && isOnline === false && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-amber-800">
              API Subtítulos <strong>Offline</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-[#8E0E75] underline hover:text-[#700B5C] font-bold text-[11px] ml-1"
            >
              {showInstructions ? 'Ocultar' : 'Ver cómo iniciar'}
            </button>
            <button
              type="button"
              onClick={checkHealth}
              title="Reintentar conexión"
              className="p-1 hover:bg-[#F8F6FC] rounded-full text-[#8E0E75]"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {showInstructions && !isOnline && (
        <div className="p-3 bg-[#FFFBEB] border border-amber-300 rounded-xl text-xs text-amber-900 max-w-md shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Terminal className="h-3.5 w-3.5 text-amber-700" />
            Arrancar API FastAPI en local:
          </div>
          <pre className="bg-[#292929] text-emerald-400 p-2 rounded text-[11px] overflow-x-auto font-mono mt-1">
            cd brainup-subtitulos-api{'\n'}
            uvicorn app.main:app --env-file .env --port 8000
          </pre>
          <p className="mt-1.5 text-[11px] text-amber-800">
            Asegúrate de que Python 3.12 y ffmpeg estén disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
