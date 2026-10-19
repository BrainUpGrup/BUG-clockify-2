'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Users, 
  Lock, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MoveLeft, 
  MoveRight, 
  Trash2, 
  Edit2, 
  Play, 
  ExternalLink, 
  Download,
  AlertCircle,
  CheckCircle2,
  Check
} from 'lucide-react';
import { TaskFlowItem, TaskStatus, getGoogleCalendarUrl, downloadSingleEventIcs } from '@/lib/calendar-export';

interface KanbanBoardProps {
  items: TaskFlowItem[];
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (itemId: string) => void;
  onChangeStatus: (itemId: string, nextStatus: TaskStatus) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  badgeStyle: string;
  countStyle: string;
  borderAccent: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'Por Hacer',
    badgeStyle: 'bg-slate-100 text-[#4A4A4A] border-slate-300',
    countStyle: 'bg-slate-200 text-slate-700',
    borderAccent: 'border-t-slate-400',
  },
  {
    id: 'in_progress',
    title: 'En Proceso',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300',
    countStyle: 'bg-amber-100 text-amber-800',
    borderAccent: 'border-t-amber-500',
  },
  {
    id: 'review',
    title: 'En Revisión',
    badgeStyle: 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30',
    countStyle: 'bg-[#8E0E75]/20 text-[#8E0E75]',
    borderAccent: 'border-t-[#8E0E75]',
  },
  {
    id: 'done',
    title: 'Completada / Bien',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    countStyle: 'bg-emerald-100 text-emerald-800',
    borderAccent: 'border-t-emerald-500',
  },
];

export function KanbanBoard({
  items,
  onSelectItem,
  onDeleteItem,
  onChangeStatus,
  onStartClockifyTimer,
  onOpenCreateModal,
}: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const getNextStatus = (current: TaskStatus): TaskStatus => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'review';
    return 'done';
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus => {
    if (current === 'done') return 'review';
    if (current === 'review') return 'in_progress';
    return 'todo';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const columnItems = items.filter((it) => it.status === col.id);
        const isTarget = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverCol !== col.id) setDragOverCol(col.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverCol(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              const itemId = e.dataTransfer.getData('text/plain');
              if (itemId) onChangeStatus(itemId, col.id);
            }}
            className={`bg-white border border-[#D8CFF0] ${col.borderAccent} border-t-3 rounded-sm shadow-xs flex flex-col min-h-[500px] transition-all ${
              isTarget ? 'ring-2 ring-[#8E0E75] bg-[#8E0E75]/5' : ''
            }`}
          >
            {/* Cabecera de la Columna */}
            <div className="p-3.5 border-b border-[#EAE4F5] bg-[#F8F6FC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider text-[#292929]">
                  {col.title}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-extrabold font-mono ${col.countStyle}`}>
                {columnItems.length}
              </span>
            </div>

            {/* Tarjetas de la Columna */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
              {isTarget && (
                <div className="py-2.5 px-2 text-center bg-white border-2 border-dashed border-[#8E0E75] rounded-xs text-[11px] font-black uppercase text-[#8E0E75] animate-pulse">
                  Soltar aquí para cambiar a {col.title}
                </div>
              )}

              {columnItems.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 italic">
                  Sin tareas en esta etapa
                </div>
              ) : (
                columnItems.map((item) => {
                  const isMeeting = item.type === 'meeting';
                  const isDone = item.status === 'done';

                  return (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className={`rounded-sm border p-3.5 shadow-2xs transition-all space-y-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm ${
                        isDone
                          ? 'bg-emerald-50/20 border-emerald-200'
                          : item.priority === 'alta'
                          ? 'bg-white border-red-200 hover:border-red-400'
                          : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/40'
                      }`}
                    >
                      {/* Fila 1: Tipo, Prioridad y Fecha */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded-sm font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
                              isMeeting
                                ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                : 'bg-slate-100 text-[#4A4A4A] border-slate-300'
                            }`}
                          >
                            {isMeeting ? <CalendarIcon className="h-2.5 w-2.5" /> : <CheckSquare className="h-2.5 w-2.5" />}
                            <span>{isMeeting ? 'Reunión' : 'Tarea'}</span>
                          </span>

                          <span
                            className={`px-1.5 py-0.5 rounded-sm font-extrabold uppercase tracking-wider border ${
                              item.priority === 'alta'
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : item.priority === 'media'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {item.priority === 'alta' ? 'Urgente' : item.priority === 'media' ? 'Media' : 'Baja'}
                          </span>
                        </div>

                        <span className="font-mono text-slate-400 text-[11px]">
                          {item.date ? item.date.split('-').reverse().slice(0, 2).join('/') : ''}
                        </span>
                      </div>

                      {/* Título de la tarjeta */}
                      <h4
                        onClick={() => onSelectItem(item)}
                        className={`text-xs font-bold leading-snug cursor-pointer hover:text-[#8E0E75] transition-colors ${
                          isDone ? 'line-through text-slate-500' : 'text-[#292929]'
                        }`}
                      >
                        {item.title}
                      </h4>

                      {/* Fila 2: Empresa y Horario */}
                      <div className="flex flex-col gap-1 text-[11px] text-[#4A4A4A] pt-1 border-t border-[#F8F6FC]">
                        <div className="flex items-center justify-between text-[#8E0E75] font-semibold text-[11px]">
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.companyName}</span>
                          </span>

                          {isMeeting && item.startTime ? (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.startTime}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              ~{item.estimatedHours || 1}h
                            </span>
                          )}
                        </div>

                        {/* Asignados y Compartición */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 truncate">
                            {item.isShared ? (
                              <Users className="h-3 w-3 text-[#8E0E75] shrink-0" />
                            ) : (
                              <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {item.assignees?.length ? item.assignees.join(', ') : item.createdByName || 'Tú'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Fila 3: Acciones de Conexión (Google Cal, .ics, Clockify) */}
                      <div className="pt-2 border-t border-[#F8F6FC] flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onStartClockifyTimer(item)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold cursor-pointer"
                            title="Iniciar cronómetro en Clockify para este cliente y tarea"
                          >
                            <Play className="h-2.5 w-2.5 fill-emerald-700 text-emerald-700" />
                            <span>Clockify</span>
                          </button>

                          <a
                            href={getGoogleCalendarUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold cursor-pointer"
                            title="Añadir a Google Calendar"
                          >
                            <ExternalLink className="h-2.5 w-2.5 text-blue-600" />
                            <span>GCal</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => downloadSingleEventIcs(item)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold cursor-pointer"
                            title="Descargar archivo .ics"
                          >
                            <Download className="h-2.5 w-2.5 text-[#8E0E75]" />
                          </button>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onSelectItem(item)}
                            className="p-1 rounded-sm text-slate-400 hover:text-[#8E0E75] cursor-pointer"
                            title="Editar detalles"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 rounded-sm text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Fila 4: Flechas de Avance de Estado */}
                      <div className="pt-2 border-t border-[#EAE4F5] flex items-center justify-between gap-1">
                        <div>
                          {col.id !== 'todo' && (
                            <button
                              type="button"
                              onClick={() => onChangeStatus(item.id, getPrevStatus(col.id))}
                              className="p-1 rounded-sm border border-[#D8CFF0] hover:bg-[#F8F6FC] text-[#4A4A4A] cursor-pointer"
                              title="Mover a etapa anterior"
                            >
                              <MoveLeft className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <div>
                          {col.id !== 'done' ? (
                            <button
                              type="button"
                              onClick={() => onChangeStatus(item.id, getNextStatus(col.id))}
                              className="px-2 py-0.5 rounded-sm bg-[#8E0E75] text-white text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all cursor-pointer flex items-center gap-1"
                              title="Avanzar etapa"
                            >
                              <span>Avanzar</span>
                              <MoveRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Completada</span>
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
