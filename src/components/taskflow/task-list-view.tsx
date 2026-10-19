'use client';

import React from 'react';
import { 
  Building2, 
  Users, 
  Lock, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Trash2, 
  Edit2, 
  Play, 
  ExternalLink, 
  Download,
  CheckCircle2,
  Check
} from 'lucide-react';
import { TaskFlowItem, TaskStatus, getGoogleCalendarUrl, downloadSingleEventIcs } from '@/lib/calendar-export';

interface TaskListViewProps {
  items: TaskFlowItem[];
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (itemId: string) => void;
  onChangeStatus: (itemId: string, nextStatus: TaskStatus) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
}

export function TaskListView({
  items,
  onSelectItem,
  onDeleteItem,
  onChangeStatus,
  onStartClockifyTimer,
}: TaskListViewProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#D8CFF0] rounded-sm p-12 text-center space-y-2 shadow-xs">
        <p className="text-xs text-[#4A4A4A] font-medium">
          No hay tareas ni reuniones que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#D8CFF0] rounded-sm shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EAE4F5] bg-[#F8F6FC] text-[10px] font-extrabold uppercase tracking-wider text-[#292929]">
              <th className="py-3 px-4 w-10 text-center">Estado</th>
              <th className="py-3 px-4">Tarea / Reunión</th>
              <th className="py-3 px-4">Cliente / Empresa</th>
              <th className="py-3 px-4">Prioridad</th>
              <th className="py-3 px-4">Fecha & Horario</th>
              <th className="py-3 px-4">Equipo</th>
              <th className="py-3 px-4 text-right">Integraciones</th>
              <th className="py-3 px-4 text-center w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8F6FC] text-xs">
            {items.map((item) => {
              const isMeeting = item.type === 'meeting';
              const isDone = item.status === 'done';

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-[#F8F6FC]/60 transition-colors ${
                    isDone ? 'bg-slate-50/60 opacity-75' : ''
                  }`}
                >
                  {/* Estado / Checkbox */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onChangeStatus(item.id, isDone ? 'todo' : 'done')}
                      className={`h-5 w-5 rounded-xs border flex items-center justify-center transition-colors cursor-pointer ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-[#8E0E75] bg-white'
                      }`}
                      title={isDone ? 'Reabrir tarea' : 'Marcar como completada'}
                    >
                      {isDone && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </td>

                  {/* Título y Tipo */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-xs bg-[#8E0E75]/10 text-[#8E0E75] shrink-0">
                        {isMeeting ? <CalendarIcon className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                      </span>
                      <div>
                        <span
                          onClick={() => onSelectItem(item)}
                          className={`font-bold cursor-pointer hover:text-[#8E0E75] transition-colors block ${
                            isDone ? 'line-through text-slate-500' : 'text-[#292929]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="text-[11px] text-[#4A4A4A] line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#8E0E75] text-[11px]">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span>{item.companyName}</span>
                    </span>
                  </td>

                  {/* Prioridad */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                        item.priority === 'alta'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : item.priority === 'media'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {item.priority === 'alta' ? 'Alta (Urgente)' : item.priority === 'media' ? 'Media' : 'Baja'}
                    </span>
                  </td>

                  {/* Fecha y Horario */}
                  <td className="py-3 px-4 text-[11px]">
                    <div className="font-mono text-[#292929] font-medium">
                      {item.date ? item.date.split('-').reverse().join('/') : '-'}
                    </div>
                    {isMeeting && item.startTime ? (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.startTime} - {item.endTime || 'fin'}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 font-mono">
                        ~{item.estimatedHours || 1}h est.
                      </div>
                    )}
                  </td>

                  {/* Equipo y Visibilidad */}
                  <td className="py-3 px-4 text-[11px] text-[#4A4A4A]">
                    <div className="flex items-center gap-1.5">
                      {item.isShared ? (
                        <Users className="h-3.5 w-3.5 text-[#8E0E75] shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[140px]">
                        {item.assignees?.length ? item.assignees.join(', ') : item.createdByName || 'Personal'}
                      </span>
                    </div>
                  </td>

                  {/* Conexión Clockify + Calendar */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onStartClockifyTimer(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold cursor-pointer shadow-2xs"
                        title="Iniciar cronómetro en Clockify para este cliente y tarea"
                      >
                        <Play className="h-2.5 w-2.5 fill-emerald-700 text-emerald-700" />
                        <span>Clockify</span>
                      </button>

                      <a
                        href={getGoogleCalendarUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-extrabold cursor-pointer shadow-2xs"
                        title="Añadir a Google Calendar"
                      >
                        <ExternalLink className="h-2.5 w-2.5 text-blue-600" />
                        <span>GCal</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => downloadSingleEventIcs(item)}
                        className="p-1 rounded-sm bg-white hover:bg-slate-50 text-[#8E0E75] border border-slate-200 cursor-pointer shadow-2xs"
                        title="Descargar archivo .ics"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="p-1 rounded-sm text-slate-400 hover:text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
