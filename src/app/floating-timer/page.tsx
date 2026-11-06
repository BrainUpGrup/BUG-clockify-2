'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
  Loader2,
  Search,
  FileText
} from 'lucide-react';
import { useTimer, useTimerSeconds } from '@/context/timer-context';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatSecondsToTimer, safeGetLocalStorage, safeSetLocalStorage } from '@/lib/utils';
import { MOCK_COMPANIES } from '@/lib/mock-data';
import { Company } from '@/types/database';

export default function FloatingTimerPage() {
  const { user } = useAuth();
  const { 
    activeCompany, 
    activeCompanyId, 
    setActiveCompanyId,
    setActiveCompany,
    isTimerRunning, 
    startTimer, 
    stopAndSaveTimer,
    activeDescription,
    setActiveDescription
  } = useTimer();
  const timerSeconds = useTimerSeconds();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [viewMode, setViewMode] = useState<'large' | 'compact'>('compact');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Cargar empresas reales desde caché local y sincronizar con Supabase
  useEffect(() => {
    // 1. Lectura inmediata desde caché
    const cached = safeGetLocalStorage<Company[]>('bug_clockify_cache_companies', []);
    if (cached && cached.length > 0) {
      setCompanies(cached);
    } else {
      setCompanies(MOCK_COMPANIES);
    }

    // 2. Consulta en segundo plano a Supabase
    async function loadCompanies() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (!error && data && data.length > 0) {
          const fetched = data as Company[];
          setCompanies(fetched);
          safeSetLocalStorage('bug_clockify_cache_companies', fetched);

          // Si no hay empresa activa seleccionada en la sesión, tomar la última o primera
          if (!activeCompanyId) {
            const lastSavedId = localStorage.getItem('bug_clockify_last_company_id');
            const target = fetched.find((c) => c.id === lastSavedId) || fetched[0];
            if (target) {
              setActiveCompanyId(target.id);
              setActiveCompany(target);
            }
          }
        }
      } catch (err) {
        console.warn('Floating timer companies fetch notice:', err);
      }
    }

    loadCompanies();
  }, [activeCompanyId, setActiveCompany, setActiveCompanyId]);

  // Si activeCompanyId está definido pero activeCompany es null, vincular el objeto Company correspondiente
  useEffect(() => {
    if (!activeCompany && activeCompanyId && companies.length > 0) {
      const found = companies.find((c) => c.id === activeCompanyId);
      if (found) {
        setActiveCompany(found);
      }
    }
  }, [activeCompany, activeCompanyId, companies, setActiveCompany]);

  // Asegurar que siempre inicie en modo reducido al abrir
  useEffect(() => {
    setViewMode('compact');
    try {
      localStorage.setItem('bug_floating_timer_mode', 'compact');
      if (typeof window !== 'undefined' && window.resizeTo) {
        window.resizeTo(360, 92);
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
          window.resizeTo(360, 92);
        } else {
          window.resizeTo(400, 310);
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

  const handleSelectCompany = (comp: Company) => {
    setActiveCompanyId(comp.id);
    setActiveCompany(comp);
    setShowCompanySelect(false);
    setCompanySearch('');
  };

  // Iniciar el temporizador con la empresa actual (o fallback a la primera)
  const handleStart = () => {
    let targetId = activeCompanyId;
    if (!targetId && companies.length > 0) {
      targetId = companies[0].id;
      setActiveCompanyId(targetId);
      setActiveCompany(companies[0]);
    }
    startTimer(targetId);
  };

  // Detener el temporizador Y guardar estrictamente en Supabase / Base de datos
  const handleStopAndSave = async () => {
    if (!isTimerRunning || isSaving) return;
    setIsSaving(true);
    setSaveNotice(null);

    try {
      const result = await stopAndSaveTimer({
        companyId: activeCompanyId || activeCompany?.id,
        description: activeDescription,
      });

      if (result.success) {
        setSaveNotice(`Guardado (${result.durationMinutes}m)`);
        setTimeout(() => {
          setSaveNotice(null);
        }, 4000);
      }
    } catch (error) {
      console.error('Error stopping and persisting timer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado de empresas para el buscador rápido
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const term = companySearch.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(term));
  }, [companies, companySearch]);

  // ==========================================
  // 1. MODO SÚPER REDUCIDO (Ultra compacto)
  // Barra minimalista de mínima altura que no estorba en la navegación
  // ==========================================
  if (viewMode === 'compact') {
    return (
      <div className="h-screen w-screen bg-white text-[#292929] flex items-center justify-between px-3 py-1.5 select-none overflow-hidden border border-[#D8CFF0]">
        
        {/* Izquierda: Indicador de Estado y Empresa Activa o Badge de Guardado */}
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          {saveNotice ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#EBF7EE] text-[#3BB54A] border border-[#3BB54A]/30 text-[10px] font-black uppercase tracking-wider animate-pulse">
              <Check className="h-3 w-3 stroke-[3]" />
              <span className="truncate max-w-[120px]">{saveNotice}</span>
            </div>
          ) : (
            <>
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
                <span className="text-[10px] font-black uppercase text-[#8E0E75] leading-none tracking-wider">
                  Cliente
                </span>
                <span 
                  className="text-[11px] font-black uppercase text-[#191654] truncate max-w-[95px] sm:max-w-[120px] leading-tight" 
                  title={activeCompany?.name || 'Cliente'}
                >
                  {activeCompany?.name || (companies[0]?.name ?? 'Sin Cliente')}
                </span>
              </div>
            </>
          )}
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
              disabled={isSaving}
              onClick={handleStopAndSave}
              className={`px-2.5 py-1.5 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isSaving ? 'opacity-70 cursor-wait' : ''
              }`}
              title="Parar temporizador y guardar automáticamente en la base de datos"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Square className="h-3 w-3 fill-white" />
              )}
              <span>{isSaving ? 'Guardando' : 'Parar'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
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
  // Con selector de empresas, notas de tarea, estadísticas y guardado en Supabase
  // ==========================================
  return (
    <div className="min-h-screen w-full bg-white text-[#292929] flex flex-col justify-between p-3 select-none">
      
      {/* Cabecera Corporativa con Botón de Modo Súper Reducido */}
      <div className="flex items-center justify-between border-b border-[#EAE4F5] pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full overflow-hidden bg-[#F8F6FC] ring-1 ring-[#8E0E75]/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isotipo.png" alt="Brain Up" className="h-4 w-4 object-contain" />
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

      {/* Banner de confirmación cuando se guarda un registro */}
      {saveNotice && (
        <div className="my-1.5 px-2.5 py-1.5 rounded-lg bg-[#EBF7EE] border border-[#3BB54A]/40 text-[#292929] flex items-center justify-between gap-2 animate-fade-in text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#3BB54A]">
            <Check className="h-4 w-4 stroke-[3]" />
            <span className="text-[#191654] font-black">
              {saveNotice}: Guardado en base de datos e historial
            </span>
          </div>
        </div>
      )}

      {/* Contenido Principal: Empresa y Cronómetro */}
      <div className="my-1.5 p-2.5 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="h-8 w-8 rounded-xs bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black uppercase text-[#8E0E75] tracking-wider leading-none">
              Empresa en Curso
            </span>
            <button
              type="button"
              onClick={() => setShowCompanySelect(!showCompanySelect)}
              className="text-xs font-black uppercase text-[#191654] truncate text-left hover:underline cursor-pointer leading-tight mt-0.5 flex items-center gap-1"
              title="Clic para cambiar de cliente"
            >
              <span className="truncate max-w-[170px]">{activeCompany?.name || (companies[0]?.name ?? 'Selecciona Cliente')}</span>
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

      {/* Input de descripción / tarea rápida */}
      <div className="mb-2 relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <input
          type="text"
          placeholder="¿En qué estás trabajando? (Opcional)"
          value={activeDescription}
          onChange={(e) => setActiveDescription(e.target.value)}
          className="w-full pl-8 pr-2.5 py-1.5 bg-[#F8F6FC] border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-hidden rounded-md text-xs text-[#292929] placeholder:text-slate-400 font-medium transition-all"
        />
      </div>

      {/* Desplegable de selección rápida de empresa con buscador */}
      {showCompanySelect && (
        <div className="mb-2 max-h-40 overflow-y-auto bg-white border border-[#D8CFF0] rounded-lg p-1.5 shadow-lg space-y-1.5">
          <div className="relative">
            <Search className="h-3 w-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-[#F8F6FC] border border-[#D8CFF0] rounded text-[11px] font-bold text-[#191654] focus:outline-hidden"
              autoFocus
            />
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {filteredCompanies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCompany(c)}
                className={`w-full px-2 py-1 text-left text-[11px] font-extrabold uppercase rounded-xs transition-colors flex items-center justify-between cursor-pointer ${
                  (activeCompanyId === c.id || activeCompany?.id === c.id) ? 'bg-[#8E0E75] text-white' : 'hover:bg-[#F8F6FC] text-[#292929]'
                }`}
              >
                <span className="truncate">{c.name}</span>
                {(activeCompanyId === c.id || activeCompany?.id === c.id) && <Check className="h-3 w-3 shrink-0" />}
              </button>
            ))}
            {filteredCompanies.length === 0 && (
              <p className="text-[10px] text-slate-400 p-1 text-center font-bold">
                No se encontraron empresas coincidentes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Botones de Acción Grandes y Visuales */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {isTimerRunning ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={handleStopAndSave}
            className={`py-2.5 px-4 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isSaving ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4 fill-white" />
            )}
            <span>{isSaving ? 'Guardando...' : 'Parar'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
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
