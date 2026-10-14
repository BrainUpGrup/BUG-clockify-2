'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Building2, 
  FileQuestion, 
  Check, 
  Edit2 
} from 'lucide-react';
import { TimeEntry, Company } from '@/types/database';
import { formatMinutes, formatDateSpanish, parseDurationToMinutes } from '@/lib/utils';
import { AppSelect } from '@/components/ui/app-select';

interface TimeEntriesListProps {
  entries: TimeEntry[];
  companies: Company[];
  onUpdateEntry: (id: string, updated: Partial<TimeEntry>) => Promise<void>;
  onDeleteEntry?: (id: string) => Promise<void>;
}

export function TimeEntriesList({
  entries,
  companies,
  onUpdateEntry,
}: TimeEntriesListProps) {
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
      <div className="w-full rounded-sm border border-dashed border-[#D8CFF0] bg-white p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm bg-[#F8F6FC] text-[#8E0E75] mb-3 border border-[#D8CFF0]">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h3 className="text-base font-extrabold text-[#292929] uppercase tracking-tight">
          No hay registros de tiempo todavía
        </h3>
        <p className="mt-1 text-sm text-[#4A4A4A] max-w-md mx-auto">
          Utiliza la barra superior para iniciar el cronómetro en vivo o introducir tus horas manualmente imputadas a un cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {sortedDates.map((dateStr) => {
        const dayEntries = groupedEntries[dateStr];
        const dayTotalMinutes = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

        return (
          <div key={dateStr} className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
            
            {/* Cabecera del día con estilo limpio sobre blanco y detalles lila */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#F8F6FC] border-b border-[#EAE4F5]">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-[#8E0E75]" />
                <span className="font-extrabold text-sm text-[#292929] uppercase tracking-wide">
                  {formatDateSpanish(dateStr)}
                </span>
                <span className="text-xs text-[#4A4A4A] font-mono tabular-nums">({dateStr})</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-white border border-[#8E0E75] text-xs font-extrabold text-[#8E0E75] uppercase tracking-wider tabular-nums shadow-xs">
                <Clock className="h-3.5 w-3.5" />
                <span>Total día: {formatMinutes(dayTotalMinutes)}</span>
              </div>
            </div>

            {/* Listado de entradas de ese día */}
            <div className="divide-y divide-[#EAE4F5]">
              {dayEntries.map((entry) => {
                const companyName = entry.company?.name || 'Cliente';
                const isEditingTime = editingDurationId === entry.id;
                const isEditingDesc = editingDescId === entry.id;
                const isEditingComp = editingCompanyId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#F8F6FC]/60 transition-colors gap-3 group"
                  >
                    {/* Detalles principales con edición rápida de descripción y empresa */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isEditingDesc ? (
                          <div className="flex items-center gap-2 w-full max-w-2xl">
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
                              className="w-full px-3 py-1 rounded-sm border-2 border-[#8E0E75] bg-white text-sm font-semibold text-[#292929] outline-none shadow-sm"
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
                            className="cursor-pointer group/desc flex items-center gap-2 text-sm font-semibold text-[#292929] truncate hover:text-[#8E0E75] transition-colors"
                            title="Haz clic para editar la descripción directamente"
                          >
                            <span>{entry.description || 'Sin descripción'}</span>
                            <Edit2 className="h-3 w-3 text-slate-300 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Etiqueta exclusiva de Empresa / Cliente */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {isEditingComp ? (
                          <div className="w-52">
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
                              icon={<Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingCompanyId(entry.id)}
                            className="inline-flex items-center gap-1.5 font-bold text-[#8E0E75] bg-[#F8F6FC] hover:bg-[#D8CFF0]/40 px-2.5 py-1 rounded-sm border border-[#D8CFF0] uppercase tracking-wider text-[11px] transition-colors cursor-pointer"
                            title="Haz clic para cambiar el cliente"
                          >
                            <Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />
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
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition-all ${
                              entry.compute_type === 'cuota'
                                ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30 hover:bg-[#8E0E75]/20'
                                : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30 hover:bg-[#191654]/20'
                            }`}
                            title="Haz clic para alternar entre Horas de Cuota y Trabajo Puntual / Extra"
                          >
                            <span>{entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual / Extra'}</span>
                          </button>
                        )}

                        {entry.start_time && entry.end_time && (
                          <span className="text-[#4A4A4A] text-[11px] font-mono tabular-nums">
                            {new Date(entry.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(entry.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ZONA DE EDICIÓN DIRECTA DEL TIEMPO CON TABULAR NUMS */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {isEditingTime ? (
                        <div className="flex items-center gap-1.5">
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
                              placeholder="ej. 330 o 3 o 2.5"
                              className="w-28 px-2.5 py-1 text-center font-mono tabular-nums text-sm font-extrabold text-[#8E0E75] bg-white border-2 border-[#8E0E75] rounded-sm shadow-md outline-none"
                            />
                            <span className="block text-center text-[10px] text-[#4A4A4A] font-medium mt-0.5">
                              ej. 330 = 3h 30m • Enter
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveDuration(entry.id, entry.duration_minutes)}
                            className="p-1.5 rounded-sm bg-[#8E0E75] text-white hover:bg-[#700B5C] shadow-sm cursor-pointer"
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDurationId(entry.id);
                            setDurationInputValue(formatMinutes(entry.duration_minutes));
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-[#F8F6FC] hover:bg-white text-[#8E0E75] border border-[#D8CFF0] hover:border-[#8E0E75] font-extrabold font-mono tabular-nums text-sm transition-all group/badge shadow-2xs cursor-pointer"
                          title="Haz clic encima para cambiar el tiempo al instante"
                        >
                          <Clock className="h-3.5 w-3.5 text-[#8E0E75]" />
                          <span>{formatMinutes(entry.duration_minutes)}</span>
                          <Edit2 className="h-3 w-3 text-[#D8CFF0] opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        );
      })}
    </div>
  );
}
