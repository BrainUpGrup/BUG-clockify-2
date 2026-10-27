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
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { useTimer, useTimerSeconds } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';
import { MOCK_COMPANIES } from '@/lib/mock-data';

export default function FloatingTimerPage() {
  const { 
    activeCompany, 
    activeCompanyId, 
    setActiveCompanyId,
    setActiveCompany,
    isTimerRunning, 
    startTimer, 
    stopTimer 
  } = useTimer();
  const timerSeconds = useTimerSeconds();

  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [viewMode, setViewMode] = useState<'large' | 'compact'>('large');

  // Cargar preferencia de modo guardada
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('bug_floating_timer_mode');
      if (savedMode === 'compact' || savedMode === 'large') {
        setViewMode(savedMode);
      }
    } catch {}
  }, []);

  const handleToggleMode = (targetMode?: 'large' | 'compact') => {
    const nextMode = targetMode || (viewMode === 'large' ? 'compact' : 'large');
    setViewMode(nextMode);
    try {
      localStorage.setItem('bug_floating_timer_mode', nextMode);
      if (typeof window !== 'undefined' && window.resizeTo) {
        if (nextMode === 'compact') {
          window.resizeTo(360, 84);
        } else {
          window.resizeTo(390, 230);
        }
      }
    } catch (e) {
      console.warn('Could not resize window:', e);
    }
  };

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

  // ==========================================
  // 1. MODO SÚPER REDUCIDO (Ultra compacto)
  // Barra minimalista de mínima altura que no estorba en la navegación
  // ==========================================
  if (viewMode === 'compact') {
    return (
      <div className="h-screen w-screen bg-white text-[#292929] flex items-center justify-between px-3 py-1.5 select-none overflow-hidden border border-[#D8CFF0]">
        
        {/* Izquierda: Indicador de Estado y Empresa Activa */}
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            {isTimerRunning ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black uppercase text-[#8E0E75] leading-none tracking-wider">
              Cliente
            </span>
            <span 
              className="text-[11px] font-black uppercase text-[#191654] truncate max-w-[95px] sm:max-w-[120px] leading-tight" 
              title={activeCompany?.name || 'Cliente'}
            >
              {activeCompany?.name || 'Sin Cliente'}
            </span>
          </div>
        </div>

        {/* Centro: Cronómetro Digital */}
        <div className="flex items-center gap-1 shrink-0 px-2">
          <span className={`font-mono text-base font-black tabular-nums tracking-tight ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
            {formatSecondsToTimer(timerSeconds)}
          </span>
        </div>

        {/* Derecha: Botón Táctil Iniciar/Parar + Alternar a Modo Grande + Volver a App */}
        <div className="flex items-center gap-1 shrink-0">
          {isTimerRunning ? (
            <button
              type="button"
              onClick={() => stopTimer()}
              className="px-2.5 py-1.5 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Parar temporizador"
            >
              <Square className="h-3 w-3 fill-white" />
              <span>Parar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTimer(activeCompanyId)}
              className="px-2.5 py-1.5 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Iniciar temporizador"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Iniciar</span>
            </button>
          )}

          {/* Botón Cambiar a Modo Grande */}
          <button
            type="button"
            onClick={() => handleToggleMode('large')}
            className="p-1.5 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Expandir a Modo Grande (con selector de clientes y opciones)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {/* Botón Volver a la App */}
          <button
            type="button"
            onClick={handleReturnToMainApp}
            className="p-1.5 rounded-md bg-[#F8F6FC] hover:bg-[#191654] hover:text-white text-[#191654] border border-[#D8CFF0] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Volver a la pestaña principal de la aplicación"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. MODO GRANDE (Modo Estándar Expandido)
  // Con selector de empresas, estadísticas y botones de acción completos
  // ==========================================
  return (
    <div className="min-h-screen w-full bg-white text-[#292929] flex flex-col justify-between p-3 select-none">
      
      {/* Cabecera Corporativa con Botón de Modo Súper Reducido */}
      <div className="flex items-center justify-between border-b border-[#EAE4F5] pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full overflow-hidden bg-[#F8F6FC] ring-1 ring-[#8E0E75]/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Brain Up" className="h-4 w-4 object-contain" />
          </div>
          <span className="text-[11px] font-black uppercase text-[#191654] tracking-wider">
            Brain <span className="text-[#8E0E75]">Up</span>
          </span>
          <span className="text-[11px] font-bold text-slate-400 font-mono">
            • Flotante
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-extrabold uppercase ${
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

          {/* Botón para cambiar al Modo Súper Reducido */}
          <button
            type="button"
            onClick={() => handleToggleMode('compact')}
            className="px-2 py-1 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
            title="Cambiar a Modo Súper Reducido (barra ultra compacta que no estorba en pantalla)"
          >
            <Minimize2 className="h-3 w-3" />
            <span>Reducido</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal: Empresa y Cronómetro */}
      <div className="my-2 p-2.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="h-8 w-8 rounded-xs bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black uppercase text-[#8E0E75] tracking-wider leading-none">
              Empresa en Curso
            </span>
            <button
              type="button"
              onClick={() => setShowCompanySelect(!showCompanySelect)}
              className="text-xs font-black uppercase text-[#191654] truncate text-left hover:underline cursor-pointer leading-tight mt-0.5 flex items-center gap-1"
              title="Clic para cambiar de cliente"
            >
              <span>{activeCompany?.name || 'Selecciona Cliente'}</span>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
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
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block px-1">
            Cambiar Empresa Activa:
          </span>
          {MOCK_COMPANIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCompany(c)}
              className={`w-full px-2 py-1 text-left text-[11px] font-extrabold uppercase rounded-xs transition-colors flex items-center justify-between ${
                activeCompanyId === c.id ? 'bg-[#8E0E75] text-white' : 'hover:bg-[#F8F6FC] text-[#292929]'
              }`}
            >
              <span className="truncate">{c.name}</span>
              {activeCompanyId === c.id && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Botones de Acción Grandes y Visuales */}
      <div className="grid grid-cols-2 gap-2">
        {isTimerRunning ? (
          <button
            type="button"
            onClick={() => stopTimer()}
            className="py-2.5 px-4 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Square className="h-4 w-4 fill-white" />
            <span>Parar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTimer(activeCompanyId)}
            className="py-2.5 px-4 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Iniciar</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleReturnToMainApp}
          className="py-2.5 px-4 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border-2 border-[#D8CFF0] hover:border-[#8E0E75] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
          title="Regresar a la aplicación principal"
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Volver a App</span>
        </button>
      </div>

    </div>
  );
}
