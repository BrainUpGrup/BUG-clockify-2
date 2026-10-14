'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Clock, 
  Building2, 
  Timer as TimerIcon,
  Tag
} from 'lucide-react';
import { Company, TimeEntry, EntryComputeType } from '@/types/database';
import { formatSecondsToTimer, parseDurationToMinutes, formatMinutes } from '@/lib/utils';
import { AppSelect } from '@/components/ui/app-select';
import { AppCalendar } from '@/components/ui/app-calendar';

interface TimeTrackerBarProps {
  companies: Company[];
  onAddEntry: (entry: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
}

export function TimeTrackerBar({ companies, onAddEntry }: TimeTrackerBarProps) {
  // Modo: 'timer' (en vivo) o 'manual'
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  
  // Campos del formulario
  const [description, setDescription] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [computeType, setComputeType] = useState<EntryComputeType>('cuota');
  
  // Estado para el temporizador en vivo
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [startTimeIso, setStartTimeIso] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para modo manual
  const todayStr = new Date().toISOString().split('T')[0];
  const [manualDate, setManualDate] = useState<string>(todayStr);
  const [manualDurationInput, setManualDurationInput] = useState<string>('1h 00m');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seleccionar automáticamente la primera empresa disponible al cargar
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      const firstActive = companies.find((c) => c.is_active) || companies[0];
      setSelectedCompanyId(firstActive.id);
    }
  }, [companies, selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Ajustar computeType si la empresa cambia
  useEffect(() => {
    if (selectedCompany?.client_type === 'puntual') {
      setComputeType('puntual');
    } else if (selectedCompany?.client_type === 'cuota') {
      setComputeType('cuota');
    }
  }, [selectedCompany]);

  // Manejar el reloj del temporizador
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // Iniciar temporizador
  const handleStartTimer = () => {
    if (!selectedCompanyId) {
      alert('Por favor selecciona una empresa antes de iniciar el temporizador.');
      return;
    }
    setStartTimeIso(new Date().toISOString());
    setIsTimerRunning(true);
  };

  // Detener y guardar temporizador
  const handleStopTimer = async () => {
    if (!isTimerRunning) return;
    setIsSubmitting(true);
    const endTimeIso = new Date().toISOString();
    
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    const workDate = new Date().toISOString().split('T')[0];
    const actualComputeType: EntryComputeType = selectedCompany?.client_type === 'cuota' ? computeType : 'puntual';

    try {
      await onAddEntry({
        company_id: selectedCompanyId,
        work_date: workDate,
        start_time: startTimeIso,
        end_time: endTimeIso,
        duration_minutes: minutes,
        description: description.trim() || 'Trabajo para la empresa',
        compute_type: actualComputeType,
      });

      setIsTimerRunning(false);
      setTimerSeconds(0);
      setStartTimeIso(null);
      setDescription('');
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
        description: description.trim() || 'Trabajo manual',
        compute_type: actualComputeType,
      });

      setDescription('');
      setManualDurationInput('1h 00m');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedManualMinutes = parseDurationToMinutes(manualDurationInput);

  return (
    <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-4 sm:p-6 shadow-sm transition-all hover:shadow-md">
      
      {/* Selector de Modo y Selector de Tipo de Cómputo (Cuota vs Puntual) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#EAE4F5] gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold uppercase tracking-tight text-[#292929]">
            CONTROL <span className="text-[#8E0E75]">DE HORAS</span>
          </span>

          {/* Selector de Tipo de Horas para Clientes Cuota */}
          {selectedCompany?.client_type === 'cuota' && (
            <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-[10px] font-extrabold uppercase tracking-wider ml-2">
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
                title="Horas fuera de cuota (facturables extra o no computables en la cuota mensual)"
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

          {isTimerRunning && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#8E0E75]"></span>
              Temporizador Activo
            </span>
          )}
        </div>

        <div className="flex items-center rounded-sm bg-[#F8F6FC] p-1 border border-[#D8CFF0] text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => !isTimerRunning && setMode('timer')}
            disabled={isTimerRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all uppercase tracking-wider font-bold text-[11px] ${
              mode === 'timer'
                ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30'
                : 'text-[#4A4A4A] hover:text-[#8E0E75]'
            }`}
          >
            <TimerIcon className="h-3.5 w-3.5 text-[#8E0E75]" />
            <span>Temporizador</span>
          </button>
          <button
            type="button"
            onClick={() => !isTimerRunning && setMode('manual')}
            disabled={isTimerRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all uppercase tracking-wider font-bold text-[11px] ${
              mode === 'manual'
                ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30'
                : 'text-[#4A4A4A] hover:text-[#8E0E75]'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-[#8E0E75]" />
            <span>Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de entrada fluida */}
      <form onSubmit={mode === 'manual' ? handleManualSubmit : (e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Input "¿En qué estás trabajando ahora?" */}
          <div className="md:col-span-5 lg:col-span-6">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿En qué estás trabajando para este cliente?"
              className="w-full px-4 py-2.5 rounded-sm border border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
            />
          </div>

          {/* Selector Propio de Empresa / Cliente */}
          <div className="md:col-span-3 lg:col-span-3">
            <AppSelect
              value={selectedCompanyId}
              onChange={(val) => setSelectedCompanyId(val)}
              disabled={isTimerRunning}
              placeholder="Selecciona Cliente"
              icon={<Building2 className="h-4 w-4" />}
              options={companies
                .filter((c) => c.is_active)
                .map((company) => ({
                  value: company.id,
                  label: company.client_type === 'cuota' 
                    ? `${company.name} [Cuota: ${company.monthly_hours_quota}h]` 
                    : `${company.name} [Puntual]`,
                }))}
            />
          </div>

          {/* Zona de Duración / Reloj con tabular-nums */}
          <div className="md:col-span-2 lg:col-span-2">
            {mode === 'timer' ? (
              <div className="flex items-center justify-center font-mono tabular-nums font-extrabold text-xl sm:text-2xl text-[#292929] bg-[#F8F6FC] px-3 py-1.5 rounded-sm border border-[#D8CFF0]">
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
                  className="w-full px-3 py-2 rounded-sm border border-[#D8CFF0] bg-white text-sm font-bold text-[#292929] tabular-nums text-center focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                  title="Escribe '330' para 3h 30m, '3' para 3 horas, o '2.5'"
                />
                {parsedManualMinutes > 0 && (
                  <span className="block text-center text-[10px] text-[#8E0E75] font-bold tabular-nums mt-0.5 uppercase tracking-wide">
                    = {formatMinutes(parsedManualMinutes)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Botón de Acción Principal */}
          <div className="md:col-span-2 lg:col-span-1 flex items-center">
            {mode === 'timer' ? (
              !isTimerRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-sm bg-[#8E0E75] text-white font-extrabold text-xs uppercase tracking-wider hover:bg-[#700B5C] active:scale-[0.98] shadow-md shadow-[#8E0E75]/25 transition-all cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>INICIAR</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-sm bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white font-extrabold text-xs uppercase tracking-wider hover:opacity-95 active:scale-[0.98] shadow-md shadow-[#191654]/30 transition-all cursor-pointer"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>{isSubmitting ? '...' : 'PARAR'}</span>
                </button>
              )
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-1 px-4 py-2.5 rounded-sm bg-[#8E0E75] text-white font-extrabold text-xs uppercase tracking-wider hover:bg-[#700B5C] active:scale-[0.98] shadow-md shadow-[#8E0E75]/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? '...' : 'AÑADIR'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Opciones extras para modo manual */}
        {mode === 'manual' && (
          <div className="mt-3 pt-3 border-t border-dashed border-[#D8CFF0] flex flex-wrap items-center gap-4 text-xs text-[#4A4A4A]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#292929] uppercase tracking-wider text-[11px]">Fecha:</span>
              <AppCalendar
                value={manualDate}
                onChange={(val) => setManualDate(val)}
              />
            </div>
            <span className="text-[#4A4A4A] text-[11px]">
              Tip de agencia: Escribe <span className="font-mono tabular-nums bg-[#F8F6FC] px-1 py-0.5 rounded-sm font-bold text-[#8E0E75]">3</span> para 3 horas, o combinaciones rápidas como <span className="font-mono tabular-nums bg-[#F8F6FC] px-1 py-0.5 rounded-sm font-bold text-[#8E0E75]">330</span> para <strong>3h 30m</strong>, <span className="font-mono tabular-nums bg-[#F8F6FC] px-1 py-0.5 rounded-sm font-bold text-[#8E0E75]">145</span> (1h 45m) o <span className="font-mono tabular-nums bg-[#F8F6FC] px-1 py-0.5 rounded-sm font-bold text-[#8E0E75]">2.5</span>.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
