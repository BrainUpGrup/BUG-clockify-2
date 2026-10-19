'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Building2, 
  FileQuestion, 
  Check, 
  Edit2,
  ChevronDown,
  ChevronRight,
  Play,
  Trash2
} from 'lucide-react';
import { TimeEntry, Company } from '@/types/database';
import { formatMinutes, formatDateSpanish, parseDurationToMinutes } from '@/lib/utils';
import { AppSelect } from '@/components/ui/app-select';
import { useTimer } from '@/context/timer-context';

interface TimeEntriesListProps {
  entries: TimeEntry[];
  companies: Company[];
  onUpdateEntry: (id: string, updated: Partial<TimeEntry>) => Promise<void>;
  onDeleteEntry?: (id: string) => Promise<void>;
  onRepeatEntry?: (entry: TimeEntry) => void;
}

export function TimeEntriesList({
  entries,
  companies,
  onUpdateEntry,
  onDeleteEntry,
  onRepeatEntry,
}: TimeEntriesListProps) {
  const { startTimerWithEntry } = useTimer();

  // Estado para edición inline del tiempo directamente encima
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [durationInputValue, setDurationInputValue] = useState<string>('');
  const durationInputRef = useRef<HTMLInputElement>(null);

  // Estado para edición inline de descripción
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [descInputValue, setDescInputValue] = useState<string>('');
  const descInputRef = useRef<HTMLInputElement>(null);

  // Estado para edición inline de empresa
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // Estado para plegar / desplegar días (solicitado: días desplegables)
  const todayStr = new Date().toISOString().split('T')[0];
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const toggleDayCollapse = (dateStr: string) => {
    setCollapsedDays((prev) => {
      const current = prev[dateStr] ?? (dateStr !== todayStr);
      return {
        ...prev,
        [dateStr]: !current,
      };
    });
  };

  // Foco automático al abrir edición
  useEffect(() => {
    if (editingDurationId && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingDurationId]);

  useEffect(() => {
    if (editingDescId && descInputRef.current) {
      descInputRef.current.focus();
      descInputRef.current.select();
    }
  }, [editingDescId]);

  // Guardar cambio de duración
  const handleSaveDuration = async (id: string, currentMinutes: number) => {
    const parsed = parseDurationToMinutes(durationInputValue);
    if (parsed > 0 && parsed !== currentMinutes) {
      await onUpdateEntry(id, { duration_minutes: parsed });
    }
    setEditingDurationId(null);
  };

  // Guardar cambio de descripción
  const handleSaveDescription = async (id: string, currentDesc: string | null) => {
    const trimmed = descInputValue.trim();
    if (trimmed !== (currentDesc || '')) {
      await onUpdateEntry(id, { description: trimmed || 'Sin descripción' });
    }
    setEditingDescId(null);
  };

  // Guardar cambio de empresa
  const handleSaveCompany = async (id: string, newCompanyId: string) => {
    if (newCompanyId) {
      await onUpdateEntry(id, { company_id: newCompanyId });
    }
    setEditingCompanyId(null);
  };

  // Manejar repetición de tarea iniciando un temporizador nuevo
  const handleRepeatClick = (entry: TimeEntry) => {
    if (onRepeatEntry) {
      onRepeatEntry(entry);
    } else {
      startTimerWithEntry(entry.company_id, entry.description || '');
    }
  };

  // Agrupar entradas por fecha (YYYY-MM-DD)
  const groupedEntries = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const dateKey = entry.work_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  if (entries.length === 0) {
    return (
      <div className="w-full rounded-sm border border-dashed border-[#D8CFF0] bg-white p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-[#F8F6FC] text-[#8E0E75] mb-2 border border-[#D8CFF0]">
          <FileQuestion className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-extrabold text-[#292929] uppercase tracking-tight">
          No hay registros de tiempo todavía
        </h3>
        <p className="mt-1 text-xs text-[#4A4A4A] max-w-md mx-auto">
          Utiliza la barra superior para iniciar el cronómetro o añadir tus horas trabajadas.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {sortedDates.map((dateStr) => {
        const dayEntries = groupedEntries[dateStr];
        const dayTotalMinutes = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
        const isToday = dateStr === todayStr;
        // Por defecto: Hoy desplegado, días anteriores plegados para ahorrar espacio
        const isCollapsed = collapsedDays[dateStr] ?? !isToday;

        return (
          <div key={dateStr} className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-2xs transition-all">
            
            {/* Cabecera del día DESPLEGABLE / CLICABLE */}
            <div 
              onClick={() => toggleDayCollapse(dateStr)}
              className="flex items-center justify-between px-4 py-2.5 bg-[#F8F6FC] border-b border-[#EAE4F5] cursor-pointer hover:bg-[#F3EEF9] select-none transition-colors"
              title={isCollapsed ? 'Haz clic para desplegar este día' : 'Haz clic para plegar este día'}
            >
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="p-0.5 text-[#8E0E75] hover:bg-white rounded-xs"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <Calendar className="h-4 w-4 text-[#8E0E75]" />
                <span className="font-extrabold text-xs sm:text-sm text-[#292929] uppercase tracking-wide">
                  {formatDateSpanish(dateStr)}
                </span>
                <span className="text-[11px] text-[#4A4A4A] font-mono tabular-nums">
                  ({dayEntries.length} {dayEntries.length === 1 ? 'tarea' : 'tareas'})
                </span>
                {isToday && (
                  <span className="bg-[#8E0E75] text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-2xs">
                    Hoy
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-sm bg-white border border-[#8E0E75] text-xs font-black text-[#8E0E75] uppercase tracking-wider tabular-nums shadow-2xs">
                  <Clock className="h-3 w-3" />
                  <span>Total: {formatMinutes(dayTotalMinutes)}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {isCollapsed ? 'Desplegar ▼' : 'Plegar ▲'}
                </span>
              </div>
            </div>

            {/* Listado de tareas (solo visible si NO está plegado) */}
            {!isCollapsed && (
              <div className="divide-y divide-[#EAE4F5]">
                {dayEntries.map((entry) => {
                  const companyName = entry.company?.name || 'Cliente';
                  const isEditingTime = editingDurationId === entry.id;
                  const isEditingDesc = editingDescId === entry.id;
                  const isEditingComp = editingCompanyId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 sm:py-2.5 hover:bg-[#F8F6FC]/60 transition-colors gap-2.5 group"
                    >
                      {/* Detalles principales con edición rápida de descripción y empresa */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          {isEditingDesc ? (
                            <div className="flex items-center gap-2 w-full max-w-xl">
                              <input
                                ref={descInputRef}
                                type="text"
                                value={descInputValue}
                                onChange={(e) => setDescInputValue(e.target.value)}
                                onBlur={() => handleSaveDescription(entry.id, entry.description)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveDescription(entry.id, entry.description);
                                  if (e.key === 'Escape') setEditingDescId(null);
                                }}
                                className="w-full px-2.5 py-1 rounded-sm border-2 border-[#8E0E75] bg-white text-xs sm:text-sm font-semibold text-[#292929] outline-none shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDescription(entry.id, entry.description)}
                                className="p-1 rounded-sm bg-[#8E0E75] text-white hover:bg-[#700B5C]"
                                title="Guardar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingDescId(entry.id);
                                setDescInputValue(entry.description || '');
                              }}
                              className="cursor-pointer group/desc flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#292929] truncate hover:text-[#8E0E75] transition-colors"
                              title="Haz clic para editar la descripción"
                            >
                              <span>{entry.description || 'Sin descripción'}</span>
                              <Edit2 className="h-3 w-3 text-slate-300 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* Etiqueta de Empresa / Cliente (SIN CIF NI RESPONSABLE) */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {isEditingComp ? (
                            <div className="w-48">
                              <AppSelect
                                value={entry.company_id}
                                onChange={(val) => {
                                  handleSaveCompany(entry.id, val);
                                  setEditingCompanyId(null);
                                }}
                                options={companies.filter((c) => c.is_active).map((c) => ({
                                  value: c.id,
                                  label: c.name,
                                }))}
                                icon={<Building2 className="h-3 w-3 text-[#8E0E75]" />}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingCompanyId(entry.id)}
                              className="inline-flex items-center gap-1 font-bold text-[#8E0E75] bg-[#F8F6FC] hover:bg-[#D8CFF0]/40 px-2 py-0.5 rounded-sm border border-[#D8CFF0] uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                              title="Haz clic para cambiar el cliente"
                            >
                              <Building2 className="h-3 w-3 text-[#8E0E75]" />
                              <span>{companyName}</span>
                            </button>
                          )}

                          {entry.company?.client_type === 'cuota' && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextType = entry.compute_type === 'cuota' ? 'puntual' : 'cuota';
                                onUpdateEntry(entry.id, { compute_type: nextType });
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold uppercase tracking-wider border cursor-pointer transition-all ${
                                entry.compute_type === 'cuota'
                                  ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30 hover:bg-[#8E0E75]/20'
                                  : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30 hover:bg-[#191654]/20'
                              }`}
                              title="Alternar Cuota vs Puntual"
                            >
                              <span>{entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual'}</span>
                            </button>
                          )}

                          {entry.start_time && entry.end_time && (
                            <span className="text-[#4A4A4A] text-[10px] font-mono tabular-nums">
                              {new Date(entry.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(entry.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ZONA DERECHA: BOTÓN REPETIR + EDICIÓN DIRECTA DEL TIEMPO */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        
                        {/* BOTÓN REPETIR TAREA (SOLICITADO: inicia temporizador nuevo de inmediato) */}
                        <button
                          type="button"
                          onClick={() => handleRepeatClick(entry)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-emerald-600 font-extrabold text-[11px] uppercase tracking-wider transition-all shadow-2xs cursor-pointer group/rep"
                          title={`Repetir: Iniciar temporizador en ${companyName} para "${entry.description || 'esta tarea'}"`}
                        >
                          <Play className="h-3 w-3 fill-current text-emerald-600 group-hover/rep:text-white" />
                          <span>Repetir</span>
                        </button>

                        {/* Tiempo de la tarea editable inline */}
                        {isEditingTime ? (
                          <div className="flex items-center gap-1">
                            <div className="relative">
                              <input
                                ref={durationInputRef}
                                type="text"
                                value={durationInputValue}
                                onChange={(e) => setDurationInputValue(e.target.value)}
                                onBlur={() => handleSaveDuration(entry.id, entry.duration_minutes)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveDuration(entry.id, entry.duration_minutes);
                                  if (e.key === 'Escape') setEditingDurationId(null);
                                }}
                                placeholder="ej. 330 o 3"
                                className="w-24 px-2 py-1 text-center font-mono tabular-nums text-xs font-extrabold text-[#8E0E75] bg-white border-2 border-[#8E0E75] rounded-sm shadow-md outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveDuration(entry.id, entry.duration_minutes)}
                              className="p-1 rounded-sm bg-[#8E0E75] text-white hover:bg-[#700B5C]"
                              title="Confirmar"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDurationId(entry.id);
                              setDurationInputValue(formatMinutes(entry.duration_minutes));
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-sm bg-[#F8F6FC] hover:bg-white text-[#8E0E75] border border-[#D8CFF0] hover:border-[#8E0E75] font-extrabold font-mono tabular-nums text-xs transition-all shadow-2xs cursor-pointer"
                            title="Haz clic encima para editar el tiempo"
                          >
                            <Clock className="h-3 w-3 text-[#8E0E75]" />
                            <span>{formatMinutes(entry.duration_minutes)}</span>
                          </button>
                        )}

                        {/* BOTÓN ELIMINAR REGISTRO HORARIO (PAPELERA A LA DERECHA) */}
                        {onDeleteEntry && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Deseas eliminar este registro de tiempo de ${companyName} (${formatMinutes(entry.duration_minutes)})?`)) {
                                onDeleteEntry(entry.id);
                              }
                            }}
                            className="p-1.5 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar este registro horario"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
