'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Clock, 
  Timer as TimerIcon,
  Tag,
  BarChart3,
  Building2,
  ChevronDown,
  SunMedium,
  TrendingUp,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Keyboard,
  Sparkles
} from 'lucide-react';
import { Company, TimeEntry, EntryComputeType } from '@/types/database';
import { formatSecondsToTimer, parseDurationToMinutes, formatMinutes } from '@/lib/utils';
import { AppCalendar } from '@/components/ui/app-calendar';
import { useTimer, useTimerSeconds } from '@/context/timer-context';
import { notify } from '@/lib/feedback';
import { DurationPreview } from '@/components/ui/duration-preview';

function TimeTrackerClockDisplay() {
  const seconds = useTimerSeconds();
  return (
    <div className="flex items-center justify-center font-mono tabular-nums font-black text-2xl sm:text-3xl text-[#191654] bg-[#F8F6FC] px-4 py-3 sm:py-3.5 rounded-xl border-2 border-[#D8CFF0] shadow-inner">
      {formatSecondsToTimer(seconds)}
    </div>
  );
}

interface TimeTrackerBarProps {
  companies: Company[];
  selectedCompanyId: string;
  entries: TimeEntry[];
  onAddEntry: (entry: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  onTimerRunningChange?: (isRunning: boolean) => void;
}

export function TimeTrackerBar({ 
  companies, 
  selectedCompanyId, 
  entries,
  onAddEntry,
  onTimerRunningChange,
}: TimeTrackerBarProps) {
  // Modo: 'timer' (en vivo) o 'manual'
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  
  // Campos del formulario
  const [description, setDescription] = useState('');
  const [computeType, setComputeType] = useState<EntryComputeType>('cuota');

  // Popups desplegables de estadísticas de horas solicitados
  const [showGeneralStatsPop, setShowGeneralStatsPop] = useState(false);
  const [showCompanyStatsPop, setShowCompanyStatsPop] = useState(false);
  const generalPopRef = useRef<HTMLDivElement>(null);
  const companyPopRef = useRef<HTMLDivElement>(null);

  // Pastillas moradas deslizantes para modo y tipo de cómputo
  const modeSwitcherRef = useRef<HTMLDivElement>(null);
  const computeSwitcherRef = useRef<HTMLDivElement>(null);
  const [modePill, setModePill] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const [computePill, setComputePill] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  
  // Usar el temporizador centralizado
  const { 
    isTimerRunning, 
    startTimer, 
    stopTimer,
    activeDescription,
    setActiveDescription
  } = useTimer();

  // Estado para modo manual
  const todayStr = new Date().toISOString().split('T')[0];
  const [manualDate, setManualDate] = useState<string>(todayStr);
  const [manualDurationInput, setManualDurationInput] = useState<string>('1h 00m');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Sincronizar descripción si viene de un "Repetir tarea"
  useEffect(() => {
    if (activeDescription && activeDescription !== description) {
      setDescription(activeDescription);
    }
  }, [activeDescription]);

  // Cerrar popovers al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (generalPopRef.current && !generalPopRef.current.contains(target)) {
        setShowGeneralStatsPop(false);
      }
      if (companyPopRef.current && !companyPopRef.current.contains(target)) {
        setShowCompanyStatsPop(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notificar al padre si el temporizador está corriendo
  useEffect(() => {
    onTimerRunningChange?.(isTimerRunning);
  }, [isTimerRunning, onTimerRunningChange]);

  // Ajustar computeType si la empresa cambia
  useEffect(() => {
    if (selectedCompany?.client_type === 'puntual') {
      setComputeType('puntual');
    } else if (selectedCompany?.client_type === 'cuota') {
      setComputeType('cuota');
    }
  }, [selectedCompany]);

  // Actualizar posición de la pastilla morada en el selector de modo (Temporizador / Manual)
  useEffect(() => {
    const updateModePill = () => {
      if (!modeSwitcherRef.current) return;
      const targetEl = modeSwitcherRef.current.querySelector(`[data-mode-tab="${mode}"]`) as HTMLElement;
      if (targetEl) {
        setModePill({
          left: targetEl.offsetLeft,
          width: targetEl.offsetWidth,
          opacity: 1,
        });
      }
    };
    updateModePill();
    window.addEventListener('resize', updateModePill);
    return () => window.removeEventListener('resize', updateModePill);
  }, [mode]);

  // Actualizar posición de la pastilla morada en el selector de cuota (Cuota / Puntual)
  useEffect(() => {
    const updateComputePill = () => {
      if (!computeSwitcherRef.current) return;
      const targetEl = computeSwitcherRef.current.querySelector(`[data-compute-tab="${computeType}"]`) as HTMLElement;
      if (targetEl) {
        setComputePill({
          left: targetEl.offsetLeft,
          width: targetEl.offsetWidth,
          opacity: 1,
        });
      }
    };
    updateComputePill();
    window.addEventListener('resize', updateComputePill);
    return () => window.removeEventListener('resize', updateComputePill);
  }, [computeType, selectedCompany]);

  // ========================================================
  // CÁLCULOS EN VIVO PARA LOS POPOVERS Y EL DESGLOSE DE HORAS
  // ========================================================
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - distanceToMonday);
  mondayDate.setHours(0, 0, 0, 0);

  // Generales (Plano 1)
  const todayGeneralMinutes = entries
    .filter((e) => e.work_date === todayStr)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const weekGeneralMinutes = entries
    .filter((e) => {
      const [y, m, d] = e.work_date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      return entryDate >= mondayDate && entryDate <= now;
    })
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const monthGeneralMinutes = entries
    .filter((e) => e.work_date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const dailyGoalMinutes = 8 * 60;
  const dailyProgressPercent = Math.min(100, Math.round((todayGeneralMinutes / dailyGoalMinutes) * 100));

  // Empresa actual (Plano 2)
  const companyEntries = selectedCompany
    ? entries.filter((e) => e.company_id === selectedCompany.id)
    : [];

  const todayCompanyMinutes = companyEntries
    .filter((e) => e.work_date === todayStr)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const weekCompanyMinutes = companyEntries
    .filter((e) => {
      const [y, m, d] = e.work_date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      return entryDate >= mondayDate && entryDate <= now;
    })
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const monthCompanyMinutes = companyEntries
    .filter((e) => e.work_date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const isCuotaClient = selectedCompany?.client_type === 'cuota';
  const quotaHours = selectedCompany?.monthly_hours_quota || 0;
  const quotaMinutes = quotaHours * 60;
  const quotaPercent = quotaMinutes > 0 
    ? Math.round((monthCompanyMinutes / quotaMinutes) * 100) 
    : 0;
  const remainingQuotaMinutes = Math.max(0, quotaMinutes - monthCompanyMinutes);

  // Desglose de horas trabajadas hoy en cada empresa
  const todayCompanyBreakdown = companies
    .filter((c) => c.is_active)
    .map((c) => {
      const minutes = entries
        .filter((e) => e.company_id === c.id && e.work_date === todayStr)
        .reduce((sum, e) => sum + e.duration_minutes, 0);
      return { company: c, minutes };
    })
    .filter((item) => item.minutes > 0);

  // Sugerencias de descripción: tareas abiertas de TaskFlow para el cliente activo (M7)
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (!selectedCompany) {
      setTaskSuggestions([]);
      return;
    }
    try {
      const raw = localStorage.getItem('bug_taskflow_items_v2');
      const items: Array<{ title?: string; companyId?: string; companyName?: string; status?: string; date?: string }> = raw ? JSON.parse(raw) : [];
      const titles = items
        .filter((it) =>
          it.status !== 'done' &&
          (it.companyId === selectedCompany.id || it.companyName?.toLowerCase() === selectedCompany.name.toLowerCase()) &&
          (!it.date || it.date <= todayStr)
        )
        .map((it) => it.title || '')
        .filter(Boolean);
      setTaskSuggestions(Array.from(new Set(titles)).slice(0, 4));
    } catch {
      setTaskSuggestions([]);
    }
  }, [selectedCompany, todayStr]);

  const [descriptionMissing, setDescriptionMissing] = useState(false);

  // Iniciar temporizador
  const handleStartTimer = () => {
    if (!selectedCompanyId) {
      notify('Selecciona un cliente antes de iniciar el temporizador.', { type: 'warning' });
      return;
    }
    setActiveDescription(description);
    startTimer(selectedCompanyId);
  };

  // Detener y guardar temporizador
  const handleStopTimer = async () => {
    if (!isTimerRunning) return;
    setIsSubmitting(true);
    const result = stopTimer();
    
    const minutes = Math.max(1, Math.round(result.durationSeconds / 60));
    const workDate = new Date().toISOString().split('T')[0];
    const actualComputeType: EntryComputeType = selectedCompany?.client_type === 'cuota' ? computeType : 'puntual';

    try {
      await onAddEntry({
        company_id: selectedCompanyId,
        work_date: workDate,
        start_time: result.startTimeIso,
        end_time: result.endTimeIso,
        duration_minutes: minutes,
        description: description.trim() || 'Sin descripción',
        compute_type: actualComputeType,
      });

      if (!description.trim()) {
        notify('Registro guardado sin descripción. Haz clic sobre él en el historial para describirlo.', { type: 'warning', duration: 6000 });
      }
      setDescription('');
      setActiveDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar registro manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      notify('Selecciona un cliente.', { type: 'warning' });
      return;
    }

    const minutes = parseDurationToMinutes(manualDurationInput);
    if (minutes <= 0) {
      notify('Introduce una duración válida (ej. 3 para 3h, 330 para 3h 30m, 2h 15m).', { type: 'warning' });
      return;
    }

    if (!description.trim()) {
      setDescriptionMissing(true);
      return;
    }

    const actualComputeType: EntryComputeType = selectedCompany?.client_type === 'cuota' ? computeType : 'puntual';

    setIsSubmitting(true);
    try {
      await onAddEntry({
        company_id: selectedCompanyId,
        work_date: manualDate,
        start_time: null,
        end_time: null,
        duration_minutes: minutes,
        description: description.trim(),
        compute_type: actualComputeType,
      });

      notify(`Añadido ${formatMinutes(minutes)} a ${selectedCompany?.name || 'el cliente'}`, { type: 'success' });
      setDescription('');
      setActiveDescription('');
      setManualDurationInput('1h 00m');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atajo universal Ctrl + Enter / Cmd + Enter en la pantalla de control de horas
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'timer') {
          if (!isTimerRunning) {
            handleStartTimer();
          } else {
            handleStopTimer();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [mode, isTimerRunning, selectedCompanyId, description]);

  const parsedManualMinutes = parseDurationToMinutes(manualDurationInput);

  return (
    <div className="w-full rounded-3xl border-2 border-[#D8CFF0] bg-white p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      
      {/* Cabecera del control de horas: Modos, tipo de cuota y BOTONES POP-UPS DE HORAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b-2 border-[#EAE4F5] gap-3">
        <div className="flex items-center gap-3.5 flex-wrap relative">
          <span className="text-base sm:text-lg font-black tracking-tight text-[#292929]">
            Control <span className="text-[#8E0E75]">de horas</span>
          </span>

          {/* Botón de Microayudas y Atajos in-situ */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('bug_open_shortcuts'));
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F6FC] hover:bg-[#D8CFF0]/40 text-[#8E0E75] border-2 border-[#D8CFF0] hover:border-[#8E0E75] text-xs font-black tracking-tight transition-all cursor-pointer shadow-2xs"
            title="Ver atajos de teclado y trucos de velocidad (Pulsa ?)"
          >
            <Keyboard className="h-3.5 w-3.5 text-[#8E0E75]" />
            <span>Atajos</span>
            <kbd className="text-[10px] font-mono font-black bg-white px-1.5 py-0.2 rounded border border-[#D8CFF0] text-[#191654]">?</kbd>
          </button>

          {/* Selector de Tipo de Horas para Clientes Cuota con Pastilla Morada Deslizante */}
          {selectedCompany?.client_type === 'cuota' && (
            <div 
              ref={computeSwitcherRef}
              className="relative flex items-center rounded-xl bg-[#F8F6FC] p-1.5 border-2 border-[#D8CFF0] text-xs sm:text-sm font-black uppercase tracking-tight shadow-2xs select-none"
            >
              <div
                className={`absolute rounded-lg shadow-sm pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  computeType === 'cuota' ? 'bg-[#8E0E75]' : 'bg-[#191654]'
                }`}
                style={{
                  left: `${computePill.left}px`,
                  width: `${computePill.width}px`,
                  top: '5px',
                  bottom: '5px',
                  opacity: computePill.opacity,
                }}
              />
              <button
                type="button"
                data-compute-tab="cuota"
                onClick={() => setComputeType('cuota')}
                className={`relative z-10 px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer ${
                  computeType === 'cuota'
                    ? 'text-white font-black'
                    : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                }`}
                title={`Computa a la cuota mensual pactada de ${selectedCompany.monthly_hours_quota}h`}
              >
                Horas Cuota ({selectedCompany.monthly_hours_quota}h)
              </button>
              <button
                type="button"
                data-compute-tab="puntual"
                onClick={() => setComputeType('puntual')}
                className={`relative z-10 px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer ${
                  computeType === 'puntual'
                    ? 'text-white font-black'
                    : 'text-[#4A4A4A] hover:text-[#191654]'
                }`}
                title="Horas fuera de cuota"
              >
                Trabajo Puntual / Extra
              </button>
            </div>
          )}

          {selectedCompany?.client_type === 'puntual' && (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-tight bg-slate-100 text-[#4A4A4A] border-2 border-slate-300 shadow-2xs">
              <Tag className="h-4 w-4 text-[#4A4A4A]" />
              Cliente Puntual
            </span>
          )}

          {/* ------------------------------------------------------------- */}
          {/* BOTÓN POP-UP 1: RESUMEN DE JORNADA GENERAL (DESPLEGABLE)      */}
          {/* ------------------------------------------------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowGeneralStatsPop(!showGeneralStatsPop);
                setShowCompanyStatsPop(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-tight transition-all border-2 cursor-pointer shadow-2xs ${
                showGeneralStatsPop 
                  ? 'bg-[#191654] text-white border-[#191654] shadow-sm' 
                  : 'bg-[#F8F6FC] hover:bg-white text-[#191654] border-[#D8CFF0] hover:border-[#191654]'
              }`}
              title="Haz clic para ver el resumen de horas generales de trabajo"
            >
              <BarChart3 className={`h-4 w-4 ${showGeneralStatsPop ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Jornada: <strong>{formatMinutes(todayGeneralMinutes)}</strong></span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showGeneralStatsPop ? 'rotate-180' : ''}`} />
            </button>

            {/* Pop-up flotante de horas generales */}
            {showGeneralStatsPop && (
              <div 
                ref={generalPopRef} 
                className="absolute left-0 sm:left-auto top-full mt-2 w-[320px] sm:w-[380px] bg-white rounded-xl border-2 border-[#191654] shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE4F5]">
                  <div className="flex items-center gap-2 text-sm font-black uppercase text-[#191654]">
                    <BarChart3 className="h-4 w-4 text-[#8E0E75]" />
                    <span>Horas Generales de Trabajo</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowGeneralStatsPop(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Hoy */}
                  <div className="bg-[#FAF8FD] p-3 rounded-lg border border-[#D8CFF0]">
                    <div className="flex justify-between text-xs font-bold text-[#4A4A4A]">
                      <span className="flex items-center gap-1.5"><SunMedium className="h-4 w-4 text-amber-500" /> Horas Hoy</span>
                      <strong className="text-base font-black text-[#292929] font-mono tabular-nums">{formatMinutes(todayGeneralMinutes)} / 8h</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full ${dailyProgressPercent >= 100 ? 'bg-emerald-500' : dailyProgressPercent >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} 
                        style={{ width: `${dailyProgressPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Semana */}
                  <div className="bg-[#FAF8FD] p-3 rounded-lg border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-xs font-bold text-[#4A4A4A] flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-[#191654]" /> Semana en curso
                    </span>
                    <strong className="text-base font-black text-[#191654] font-mono tabular-nums">{formatMinutes(weekGeneralMinutes)}</strong>
                  </div>

                  {/* Mes */}
                  <div className="bg-[#FAF8FD] p-3 rounded-lg border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-xs font-bold text-[#4A4A4A] flex items-center gap-1.5">
                      <CalendarCheck className="h-4 w-4 text-[#8E0E75]" /> Mes activo
                    </span>
                    <strong className="text-base font-black text-[#8E0E75] font-mono tabular-nums">{formatMinutes(monthGeneralMinutes)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BOTÓN POP-UP 2: DEDICACIÓN EN EMPRESA ACTUAL (DESPLEGABLE)    */}
          {/* ------------------------------------------------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCompanyStatsPop(!showCompanyStatsPop);
                setShowGeneralStatsPop(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-tight transition-all border-2 cursor-pointer shadow-2xs ${
                showCompanyStatsPop 
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-sm' 
                  : 'bg-[#F8F6FC] hover:bg-white text-[#8E0E75] border-[#D8CFF0] hover:border-[#8E0E75]'
              }`}
              title="Haz clic para ver las horas dedicadas a este cliente"
            >
              <Building2 className={`h-4 w-4 ${showCompanyStatsPop ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>
                Este cliente (mes): <strong>{formatMinutes(monthCompanyMinutes)}</strong>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showCompanyStatsPop ? 'rotate-180' : ''}`} />
            </button>

            {/* Pop-up flotante de horas de empresa */}
            {showCompanyStatsPop && (
              <div 
                ref={companyPopRef} 
                className="absolute left-0 sm:left-auto top-full mt-2 w-[300px] sm:w-[360px] bg-white rounded-sm border-2 border-[#8E0E75] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EAE4F5]">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#8E0E75] truncate max-w-[280px]">
                    <Building2 className="h-4 w-4 shrink-0 text-[#8E0E75]" />
                    <span className="truncate">{selectedCompany?.name || 'Cliente Seleccionado'}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowCompanyStatsPop(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Hoy en empresa */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#4A4A4A]">Hoy en este cliente:</span>
                    <strong className="text-sm font-black text-[#8E0E75] font-mono tabular-nums">{formatMinutes(todayCompanyMinutes)}</strong>
                  </div>

                  {/* Semana en empresa */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#4A4A4A]">Esta semana:</span>
                    <strong className="text-sm font-black text-[#191654] font-mono tabular-nums">{formatMinutes(weekCompanyMinutes)}</strong>
                  </div>

                  {/* Mes en empresa con cuota pactada */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0]">
                    <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A]">
                      <span>Acumulado del mes:</span>
                      <strong className="text-sm font-black text-[#065F46] font-mono tabular-nums">
                        {formatMinutes(monthCompanyMinutes)} {isCuotaClient ? `/ ${quotaHours}h` : ''}
                      </strong>
                    </div>

                    {isCuotaClient && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A] mb-1">
                          <span>Progreso de cuota:</span>
                          <span className={quotaPercent >= 100 ? 'text-emerald-700 font-black' : 'text-[#8E0E75] font-bold'}>
                            {quotaPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-sm overflow-hidden">
                          <div 
                            className={`h-full ${quotaPercent > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, quotaPercent)}%` }} 
                          />
                        </div>
                        <p className="text-[11px] text-[#4A4A4A] mt-1">
                          {quotaPercent >= 100 ? (
                            <span className="text-emerald-700 font-extrabold">✓ Cuota completada</span>
                          ) : (
                            <span>Restan <strong className="text-[#8E0E75]">{formatMinutes(remainingQuotaMinutes)}</strong> de cuota.</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modos temporizador vs manual con pastilla morada deslizante */}
        <div 
          ref={modeSwitcherRef}
          className="relative flex items-center rounded-xl bg-[#F8F6FC] p-1.5 border-2 border-[#D8CFF0] text-xs sm:text-sm font-black self-start sm:self-auto shrink-0 shadow-2xs select-none"
        >
          {/* Pastilla morada deslizante */}
          <div
            className="absolute rounded-lg bg-[#8E0E75] shadow-sm pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              left: `${modePill.left}px`,
              width: `${modePill.width}px`,
              top: '5px',
              bottom: '5px',
              opacity: modePill.opacity,
            }}
          />

          <button
            type="button"
            data-mode-tab="timer"
            onClick={() => !isTimerRunning && setMode('timer')}
            disabled={isTimerRunning}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 uppercase tracking-tight text-xs sm:text-sm cursor-pointer ${
              mode === 'timer'
                ? 'text-white font-extrabold'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
            }`}
          >
            <TimerIcon className={`h-4 w-4 shrink-0 transition-transform ${mode === 'timer' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
            <span>Temporizador</span>
          </button>
          <button
            type="button"
            data-mode-tab="manual"
            onClick={() => !isTimerRunning && setMode('manual')}
            disabled={isTimerRunning}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 uppercase tracking-tight text-xs sm:text-sm cursor-pointer ${
              mode === 'manual'
                ? 'text-white font-extrabold'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
            }`}
          >
            <Clock className={`h-4 w-4 shrink-0 transition-transform ${mode === 'manual' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
            <span>Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de entrada sin scroll: Input ancho + Reloj + Botón Verde/Rojo Grande y Visual */}
      <form onSubmit={mode === 'manual' ? handleManualSubmit : (e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          
          {/* Input de descripción amplio */}
          <div className="md:col-span-6 lg:col-span-7 xl:col-span-8">
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim()) setDescriptionMissing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (mode === 'timer') {
                      if (!isTimerRunning) handleStartTimer();
                      else handleStopTimer();
                    } else if (mode === 'manual') {
                      handleManualSubmit(e);
                    }
                  } else if (mode === 'timer' && !isTimerRunning) {
                    e.preventDefault();
                    handleStartTimer();
                  }
                }
              }}
              aria-label="Descripción de la tarea"
              aria-invalid={descriptionMissing}
              placeholder={`¿En qué estás trabajando para ${selectedCompany?.name || 'este cliente'}? (↵ para iniciar)`}
              className={`w-full px-5 py-3.5 sm:py-4 rounded-xl border-2 bg-white text-base sm:text-lg text-[#292929] placeholder:text-slate-400 focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all font-semibold shadow-xs ${
                descriptionMissing ? 'border-red-400 focus:border-red-500' : 'border-[#D8CFF0] focus:border-[#8E0E75]'
              }`}
            />
            {descriptionMissing && (
              <p className="text-sm text-red-600 mt-1.5">Describe la tarea para que el informe del cliente sea útil.</p>
            )}
          </div>

          {/* Zona de Duración / Reloj */}
          <div className="md:col-span-3 lg:col-span-3 xl:col-span-2">
            {mode === 'timer' ? (
              <TimeTrackerClockDisplay />
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={manualDurationInput}
                    onChange={(e) => setManualDurationInput(e.target.value)}
                    onBlur={() => {
                      if (parsedManualMinutes > 0) {
                        setManualDurationInput(formatMinutes(parsedManualMinutes));
                      }
                    }}
                    placeholder="ej. 330 o 3 o 2.5"
                    aria-label="Duración"
                    aria-describedby="manual-duration-preview"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border-2 border-[#D8CFF0] bg-white text-xl sm:text-2xl font-black text-[#292929] tabular-nums text-center focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all shadow-inner"
                    title="Escribe '330' para 3h 30m, '3' para 3 horas, o '2.5'"
                  />
                  <DurationPreview id="manual-duration-preview" value={manualDurationInput} />
                </div>
                {/* Microayuda: Chips de Duraciones Rápidas de 1 Clic */}
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {[
                    { label: '+15m', val: '15m' },
                    { label: '+30m', val: '30m' },
                    { label: '+1h', val: '1h' },
                    { label: '+2h', val: '2h' },
                    { label: '330 (3.5h)', val: '330' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setManualDurationInput(preset.val)}
                      className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-[#F8F6FC] hover:bg-[#8E0E75] text-[#191654] hover:text-white border border-[#D8CFF0] hover:border-[#8E0E75] transition-colors cursor-pointer shadow-2xs"
                      title={`Fijar ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón de Acción Principal Hero (Verde para INICIAR / Rojo para PARAR) */}
          <div className="md:col-span-3 lg:col-span-2 xl:col-span-2 flex items-center">
            {mode === 'timer' ? (
              !isTimerRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="w-full h-13 sm:h-15 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-base sm:text-lg active:scale-[0.98] shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  <span>Iniciar</span>
                  <kbd className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30 ml-1">
                    Ctrl ↵
                  </kbd>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={isSubmitting}
                  className="w-full h-13 sm:h-15 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-base sm:text-lg active:scale-[0.98] shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02] transition-all cursor-pointer animate-pulse"
                >
                  <Square className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  <span>{isSubmitting ? '...' : 'Parar'}</span>
                  <kbd className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30 ml-1">
                    Ctrl ↵
                  </kbd>
                </button>
              )
            ) : (
              <button
                type="submit"
                id="btn-submit-manual-entry"
                disabled={isSubmitting}
                className="w-full h-13 sm:h-15 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-base sm:text-lg active:scale-[0.98] shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>{isSubmitting ? '...' : 'Añadir'}</span>
                <kbd className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30 ml-1">
                  Ctrl ↵
                </kbd>
              </button>
            )}
          </div>

        </div>

        {/* Sugerencias desde TaskFlow para rellenar la descripción con un clic */}
        {!description.trim() && taskSuggestions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0]">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8E0E75]">
              <Sparkles className="h-3.5 w-3.5 text-[#8E0E75]" />
              Sugerencias de TaskFlow (1 clic para rellenar):
            </span>
            {taskSuggestions.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  setDescription(title);
                  setDescriptionMissing(false);
                }}
                className="px-3 py-1 rounded-lg bg-white border border-[#D8CFF0] text-xs font-semibold text-[#191654] hover:border-[#8E0E75] hover:text-[#8E0E75] cursor-pointer max-w-[320px] truncate shadow-2xs transition-all hover:scale-[1.02]"
                title={`Rellenar: ${title}`}
              >
                {title}
              </button>
            ))}
          </div>
        )}

        {/* Fila Ampliada de Horas Trabajadas Hoy por Empresa */}
        <div className="mt-4 pt-3.5 border-t-2 border-dashed border-[#EAE4F5] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm lg:text-base font-extrabold uppercase tracking-tight text-[#4A4A4A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>Horas de hoy por empresa:</span>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            {todayCompanyBreakdown.length > 0 ? (
              todayCompanyBreakdown.map((item) => (
                <span
                  key={item.company.id}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2 shadow-2xs ${
                    item.company.id === selectedCompanyId
                      ? 'bg-[#8E0E75] text-white border-[#8E0E75]'
                      : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0]'
                  }`}
                >
                  <span>{item.company.name}:</span>
                  <strong className="font-mono tabular-nums">{formatMinutes(item.minutes)}</strong>
                </span>
              ))
            ) : (
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Sin tiempo registrado hoy aún</span>
            )}

            <span className="text-xs sm:text-sm lg:text-base text-[#4A4A4A] font-bold ml-2 pl-3 border-l-2 border-slate-300">
              Total hoy: <strong className="text-[#8E0E75] font-mono tabular-nums text-base sm:text-lg">{formatMinutes(todayGeneralMinutes)}</strong>
            </span>
          </div>
        </div>

        {/* Opciones extras para modo manual */}
        {mode === 'manual' && (
          <div className="mt-3 pt-2.5 border-t-2 border-dashed border-[#D8CFF0] flex flex-wrap items-center gap-4 text-sm text-[#4A4A4A]">
            <div className="flex items-center gap-2.5">
              <span className="font-black text-[#292929] uppercase tracking-tight text-xs sm:text-sm">Fecha:</span>
              <AppCalendar
                value={manualDate}
                onChange={(val) => setManualDate(val)}
              />
            </div>
            <span className="text-[#4A4A4A] text-xs sm:text-sm">
              Tip: Escribe <strong className="text-[#8E0E75] font-bold">3</strong> para 3h, o <strong className="text-[#8E0E75] font-bold">330</strong> para 3h 30m.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
