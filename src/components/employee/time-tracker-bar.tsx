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
  X
} from 'lucide-react';
import { Company, TimeEntry, EntryComputeType } from '@/types/database';
import { formatSecondsToTimer, parseDurationToMinutes, formatMinutes } from '@/lib/utils';
import { AppCalendar } from '@/components/ui/app-calendar';
import { useTimer } from '@/context/timer-context';

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
  
  // Usar el temporizador centralizado
  const { 
    isTimerRunning, 
    timerSeconds, 
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

  // Iniciar temporizador
  const handleStartTimer = () => {
    if (!selectedCompanyId) {
      alert('Por favor selecciona una empresa antes de iniciar el temporizador.');
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
        description: description.trim() || `Trabajo para ${selectedCompany?.name || 'la empresa'}`,
        compute_type: actualComputeType,
      });

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
      alert('Por favor selecciona una empresa.');
      return;
    }

    const minutes = parseDurationToMinutes(manualDurationInput);
    if (minutes <= 0) {
      alert('Por favor introduce una duración válida (ej. 3 para 3h, 330 para 3h 30m, o 2.5).');
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
        description: description.trim() || `Trabajo para ${selectedCompany?.name || 'la empresa'}`,
        compute_type: actualComputeType,
      });

      setDescription('');
      setActiveDescription('');
      setManualDurationInput('1h 00m');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedManualMinutes = parseDurationToMinutes(manualDurationInput);

  return (
    <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-3 sm:p-4 shadow-sm transition-all hover:shadow-md">
      
      {/* Cabecera del control de horas: Modos, tipo de cuota y BOTONES POP-UPS DE HORAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-3 border-b border-[#EAE4F5] gap-2.5">
        <div className="flex items-center gap-2 flex-wrap relative">
          <span className="text-xs font-black uppercase tracking-tight text-[#292929]">
            CONTROL <span className="text-[#8E0E75]">DE HORAS</span>
          </span>

          {/* Selector de Tipo de Horas para Clientes Cuota */}
          {selectedCompany?.client_type === 'cuota' && (
            <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-[10px] font-extrabold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setComputeType('cuota')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  computeType === 'cuota'
                    ? 'bg-[#8E0E75] text-white shadow-xs'
                    : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                }`}
                title={`Computa a la cuota mensual pactada de ${selectedCompany.monthly_hours_quota}h`}
              >
                Horas Cuota ({selectedCompany.monthly_hours_quota}h)
              </button>
              <button
                type="button"
                onClick={() => setComputeType('puntual')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  computeType === 'puntual'
                    ? 'bg-[#191654] text-white shadow-xs'
                    : 'text-[#4A4A4A] hover:text-[#191654]'
                }`}
                title="Horas fuera de cuota"
              >
                Trabajo Puntual / Extra
              </button>
            </div>
          )}

          {selectedCompany?.client_type === 'puntual' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-[#4A4A4A] border border-slate-200">
              <Tag className="h-3 w-3 text-[#4A4A4A]" />
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                showGeneralStatsPop 
                  ? 'bg-[#191654] text-white border-[#191654] shadow-xs' 
                  : 'bg-[#F8F6FC] hover:bg-white text-[#191654] border-[#D8CFF0]'
              }`}
              title="Haz clic para ver el resumen de horas generales de trabajo"
            >
              <BarChart3 className={`h-3 w-3 ${showGeneralStatsPop ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Jornada: <strong>{formatMinutes(todayGeneralMinutes)}</strong></span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showGeneralStatsPop ? 'rotate-180' : ''}`} />
            </button>

            {/* Pop-up flotante de horas generales */}
            {showGeneralStatsPop && (
              <div 
                ref={generalPopRef} 
                className="absolute left-0 sm:left-auto top-full mt-2 w-[300px] sm:w-[360px] bg-white rounded-sm border-2 border-[#191654] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EAE4F5]">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#191654]">
                    <BarChart3 className="h-4 w-4 text-[#8E0E75]" />
                    <span>Horas Generales de Trabajo</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowGeneralStatsPop(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Hoy */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0]">
                    <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A]">
                      <span className="flex items-center gap-1"><SunMedium className="h-3.5 w-3.5 text-amber-500" /> Horas Hoy</span>
                      <strong className="text-sm font-black text-[#292929] font-mono tabular-nums">{formatMinutes(todayGeneralMinutes)} / 8h</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-sm overflow-hidden mt-1.5">
                      <div 
                        className={`h-full ${dailyProgressPercent >= 100 ? 'bg-emerald-500' : dailyProgressPercent >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} 
                        style={{ width: `${dailyProgressPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Semana */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#4A4A4A] flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-[#191654]" /> Semana en curso
                    </span>
                    <strong className="text-sm font-black text-[#191654] font-mono tabular-nums">{formatMinutes(weekGeneralMinutes)}</strong>
                  </div>

                  {/* Mes */}
                  <div className="bg-[#FAF8FD] p-2.5 rounded-sm border border-[#D8CFF0] flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#4A4A4A] flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5 text-[#8E0E75]" /> Mes activo
                    </span>
                    <strong className="text-sm font-black text-[#8E0E75] font-mono tabular-nums">{formatMinutes(monthGeneralMinutes)}</strong>
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                showCompanyStatsPop 
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs' 
                  : 'bg-[#F8F6FC] hover:bg-white text-[#8E0E75] border-[#D8CFF0]'
              }`}
              title="Haz clic para ver las horas dedicadas a este cliente"
            >
              <Building2 className={`h-3 w-3 ${showCompanyStatsPop ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>
                {selectedCompany?.name ? `${selectedCompany.name.slice(0, 12)}...` : 'Cliente'}: 
                <strong> {formatMinutes(monthCompanyMinutes)}</strong>
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showCompanyStatsPop ? 'rotate-180' : ''}`} />
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
                        <div className="flex justify-between text-[10px] font-bold text-[#4A4A4A] mb-1">
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
                        <p className="text-[10px] text-[#4A4A4A] mt-1">
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

        {/* Modos temporizador vs manual */}
        <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-xs font-medium self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => !isTimerRunning && setMode('timer')}
            disabled={isTimerRunning}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all uppercase tracking-wider text-[10px] ${
              mode === 'timer'
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
            }`}
          >
            <TimerIcon className={`h-3 w-3 ${mode === 'timer' ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Temporizador</span>
          </button>
          <button
            type="button"
            onClick={() => !isTimerRunning && setMode('manual')}
            disabled={isTimerRunning}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all uppercase tracking-wider text-[10px] ${
              mode === 'manual'
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
            }`}
          >
            <Clock className={`h-3 w-3 ${mode === 'manual' ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de entrada sin scroll: Input ancho + Reloj + Botón Verde/Rojo */}
      <form onSubmit={mode === 'manual' ? handleManualSubmit : (e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          
          {/* Input de descripción amplio */}
          <div className="md:col-span-8 lg:col-span-9">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`¿En qué estás trabajando para ${selectedCompany?.name || 'este cliente'}?`}
              className="w-full px-3.5 py-2 rounded-sm border border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all font-medium"
            />
          </div>

          {/* Zona de Duración / Reloj */}
          <div className="md:col-span-2 lg:col-span-2">
            {mode === 'timer' ? (
              <div className="flex items-center justify-center font-mono tabular-nums font-extrabold text-xl text-[#292929] bg-[#F8F6FC] px-2.5 py-1.5 rounded-sm border border-[#D8CFF0]">
                {formatSecondsToTimer(timerSeconds)}
              </div>
            ) : (
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
                  className="w-full px-2.5 py-1.5 rounded-sm border border-[#D8CFF0] bg-white text-sm font-bold text-[#292929] tabular-nums text-center focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                  title="Escribe '330' para 3h 30m, '3' para 3 horas, o '2.5'"
                />
              </div>
            )}
          </div>

          {/* Botón de Acción Principal (Verde para INICIAR / Rojo para PARAR) */}
          <div className="md:col-span-2 lg:col-span-1 flex items-center">
            {mode === 'timer' ? (
              !isTimerRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs uppercase tracking-wider active:scale-[0.98] shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>INICIAR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-xs uppercase tracking-wider active:scale-[0.98] shadow-md shadow-red-500/25 transition-all cursor-pointer animate-pulse"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>{isSubmitting ? '...' : 'PARAR'}</span>
                </button>
              )
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-sm bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs uppercase tracking-wider active:scale-[0.98] shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? '...' : 'AÑADIR'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Fila compacta de Horas Trabajadas Hoy por Empresa (Visibles en una sola pantalla) */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-[#EAE4F5] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#4A4A4A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span>Horas de hoy por empresa:</span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {todayCompanyBreakdown.length > 0 ? (
              todayCompanyBreakdown.map((item) => (
                <span
                  key={item.company.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
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
              <span className="text-[10px] text-slate-400 font-medium">Sin tiempo registrado hoy aún</span>
            )}

            <span className="text-[10px] text-[#4A4A4A] font-bold ml-1 pl-2 border-l border-slate-200">
              Total hoy: <strong className="text-[#8E0E75] font-mono tabular-nums">{formatMinutes(todayGeneralMinutes)}</strong>
            </span>
          </div>
        </div>

        {/* Opciones extras para modo manual */}
        {mode === 'manual' && (
          <div className="mt-2.5 pt-2 border-t border-dashed border-[#D8CFF0] flex flex-wrap items-center gap-3 text-xs text-[#4A4A4A]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#292929] uppercase tracking-wider text-[10px]">Fecha:</span>
              <AppCalendar
                value={manualDate}
                onChange={(val) => setManualDate(val)}
              />
            </div>
            <span className="text-[#4A4A4A] text-[10px]">
              Tip: Escribe <strong className="text-[#8E0E75]">3</strong> para 3h, o <strong className="text-[#8E0E75]">330</strong> para 3h 30m.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
