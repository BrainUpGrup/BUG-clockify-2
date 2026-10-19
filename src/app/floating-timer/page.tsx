'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Building2, 
  ExternalLink, 
  ArrowUpRight, 
  RotateCcw,
  Check,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';
import { MOCK_COMPANIES } from '@/lib/mock-data';

export default function FloatingTimerPage() {
  const { 
    activeCompany, 
    activeCompanyId, 
    setActiveCompanyId,
    setActiveCompany,
    isTimerRunning, 
    timerSeconds, 
    startTimer, 
    stopTimer 
  } = useTimer();

  const [showCompanySelect, setShowCompanySelect] = useState(false);

  // Intentar volver a la app principal
  const handleReturnToMainApp = () => {
    if (typeof window !== 'undefined') {
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
      } else {
        window.open('/dashboard/employee', '_blank');
      }
    }
  };

  const handleSelectCompany = (comp: typeof MOCK_COMPANIES[0]) => {
    setActiveCompanyId(comp.id);
    setActiveCompany(comp);
    setShowCompanySelect(false);
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#292929] flex flex-col justify-between p-3 select-none">
      
      {/* Cabecera Corporativa */}
      <div className="flex items-center justify-between border-b border-[#EAE4F5] pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full overflow-hidden bg-[#F8F6FC] ring-1 ring-[#8E0E75]/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Brain Up" className="h-4 w-4 object-contain" />
          </div>
          <span className="text-[11px] font-black uppercase text-[#191654] tracking-wider">
            Brain <span className="text-[#8E0E75]">Up</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 font-mono">
            • Mini Timer
          </span>
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[9px] font-extrabold uppercase ${
          isTimerRunning ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
        }`}>
          {isTimerRunning ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>En Marcha</span>
            </>
          ) : (
            <span>Detenido</span>
          )}
        </div>
      </div>

      {/* Contenido Principal: Empresa y Cronómetro */}
      <div className="my-2 p-2.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="h-7 w-7 rounded-xs bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-black uppercase text-[#8E0E75] tracking-wider leading-none">
              Empresa en Curso
            </span>
            <button
              type="button"
              onClick={() => setShowCompanySelect(!showCompanySelect)}
              className="text-xs font-black uppercase text-[#191654] truncate text-left hover:underline cursor-pointer leading-tight mt-0.5"
              title="Clic para cambiar de cliente"
            >
              {activeCompany?.name || 'Selecciona Cliente ▼'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`font-mono text-xl font-black tabular-nums ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
            {formatSecondsToTimer(timerSeconds)}
          </span>
        </div>
      </div>

      {/* Desplegable de selección rápida de empresa */}
      {showCompanySelect && (
        <div className="mb-2 max-h-36 overflow-y-auto bg-white border border-[#D8CFF0] rounded-sm p-1 shadow-md space-y-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block px-1">
            Cambiar Empresa Activa:
          </span>
          {MOCK_COMPANIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCompany(c)}
              className={`w-full px-2 py-1 text-left text-[10px] font-extrabold uppercase rounded-xs transition-colors flex items-center justify-between ${
                activeCompanyId === c.id ? 'bg-[#8E0E75] text-white' : 'hover:bg-[#F8F6FC] text-[#292929]'
              }`}
            >
              <span className="truncate">{c.name}</span>
              {activeCompanyId === c.id && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-2">
        {isTimerRunning ? (
          <button
            type="button"
            onClick={() => stopTimer()}
            className="py-1.5 px-3 rounded-xs bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-white" />
            <span>Parar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTimer(activeCompanyId)}
            className="py-1.5 px-3 rounded-xs bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Iniciar</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleReturnToMainApp}
          className="py-1.5 px-3 rounded-xs bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          title="Regresar a la aplicación principal"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>Volver a App</span>
        </button>
      </div>

    </div>
  );
}
