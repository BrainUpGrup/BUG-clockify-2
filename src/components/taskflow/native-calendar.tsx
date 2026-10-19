'use client';

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ExternalLink, 
  Download, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Building2, 
  Lock, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Sparkles,
  ShieldAlert,
  CalendarDays,
  Grid3X3,
  ListTodo,
  RotateCw,
  FastForward,
  Bell
} from 'lucide-react';
import { 
  TaskFlowItem, 
  ColorStrip,
  COLOR_STRIP_CONFIG,
  getItemColorStrip,
  getCustomColorStyles,
  getGoogleCalendarUrl, 
  downloadSingleEventIcs, 
  downloadAllEventsIcs 
} from '@/lib/calendar-export';
import { NotificationsPanel } from '@/components/taskflow/notifications-panel';
import { PostItItem } from '@/types/postit';

export type CalendarViewType = 'day' | 'week' | 'month' | 'year';

interface NativeCalendarProps {
  items: TaskFlowItem[];
  postIts?: PostItItem[];
  onOpenPostIt?: (postItId: string) => void;
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleStatus: (itemId: string, nextStatus: TaskFlowItem['status']) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
  onRescheduleOverdue?: () => void;
  onMoveItemDate?: (itemId: string, newDate: string) => void;
  onQuickReschedule?: (itemId: string, days?: number) => void;
  currentUserName: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type PopupType = 'none' | 'day_details' | 'urgent_warnings' | 'goods_done' | 'meetings';

export function NativeCalendar({
  items,
  postIts = [],
  onOpenPostIt,
  onSelectItem,
  onDeleteItem,
  onToggleStatus,
  onStartClockifyTimer,
  onOpenCreateModal,
  onRescheduleOverdue,
  onMoveItemDate,
  onQuickReschedule,
  currentUserName,
}: NativeCalendarProps) {
  // Vista activa: por defecto 'week' para mostrar el formato tira de colores tipo Asana / Google Calendar
  const [viewType, setViewType] = useState<CalendarViewType>('week');
  
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Tareas pendientes vencidas (anteriores a hoy y no completadas)
  const overdueItems = items.filter(it => it.status !== 'done' && it.date < todayStr);

  // Estado del Pop-up activo para advertencias, cosas buenas o detalles de día
  const [activePopup, setActivePopup] = useState<PopupType>('none');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navegación adaptable según la vista activa
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewType === 'day') {
      next.setDate(next.getDate() - 1);
    } else if (viewType === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewType === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewType === 'year') {
      next.setFullYear(next.getFullYear() - 1);
    }
    setCurrentDate(next);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewType === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (viewType === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewType === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewType === 'year') {
      next.setFullYear(next.getFullYear() + 1);
    }
    setCurrentDate(next);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  // Desplazamiento manual rápido de tarea a mañana o siguiente día hábil en cualquier momento
  const handleQuickReschedule = (itemId: string, days: number = 1) => {
    if (onQuickReschedule) {
      onQuickReschedule(itemId, days);
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item || !onMoveItemDate) return;
    const cur = new Date(item.date + 'T00:00:00');
    cur.setDate(cur.getDate() + days);
    if (cur.getDay() === 6) cur.setDate(cur.getDate() + 2); // Sábado -> Lunes
    if (cur.getDay() === 0) cur.setDate(cur.getDate() + 1); // Domingo -> Lunes
    const newDateStr = cur.toISOString().split('T')[0];
    onMoveItemDate(itemId, newDateStr);
  };

  // Cálculo de los días de la semana laboral (Lunes a Viernes, excluyendo Sábados y Domingos)
  const currentDayOfWeek = (currentDate.getDay() + 6) % 7; // Lun=0, Dom=6
  const mondayOfWeek = new Date(currentDate);
  mondayOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayOfWeek);
    d.setDate(mondayOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return {
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      dayName: DAY_NAMES[i],
      dayNameFull: DAY_NAMES_FULL[i],
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    };
  });

  const fridayOfWeek = weekDays[4].date;

  // Cuadrícula del mes
  const firstDayOfMonth = new Date(year, month, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  interface DayCell {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }

  const monthCells: DayCell[] = [];

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    monthCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    monthCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  const remainingCells = 7 - (monthCells.length % 7);
  if (remainingCells < 7) {
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonthIdx = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      monthCells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }
  }

  // Tareas filtradas por fecha o categoría para los Popups
  const selectedDayItems = items.filter((item) => item.date === selectedDate);
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthItems = items.filter(it => it.date.startsWith(currentMonthPrefix));
  const monthMeetings = monthItems.filter(it => it.type === 'meeting');
  const monthPending = monthItems.filter(it => it.status !== 'done');
  const monthDone = monthItems.filter(it => it.status === 'done');

  // Título dinámico según vista
  const getHeaderTitle = () => {
    if (viewType === 'day') {
      const d = new Date(selectedDate + 'T00:00:00');
      const dayIdx = (d.getDay() + 6) % 7;
      return `${DAY_NAMES_FULL[dayIdx]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (viewType === 'week') {
      const startMonth = MONTH_NAMES[mondayOfWeek.getMonth()];
      const endMonth = MONTH_NAMES[fridayOfWeek.getMonth()];
      if (startMonth === endMonth) {
        return `${mondayOfWeek.getDate()} - ${fridayOfWeek.getDate()} de ${startMonth} ${fridayOfWeek.getFullYear()}`;
      }
      return `${mondayOfWeek.getDate()} ${startMonth} - ${fridayOfWeek.getDate()} ${endMonth} ${fridayOfWeek.getFullYear()}`;
    }
    if (viewType === 'month') {
      return `${MONTH_NAMES[month]} ${year}`;
    }
    return `Año ${year}`;
  };

  const handleCellClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentDate(new Date(dateStr + 'T00:00:00'));
    setActivePopup('day_details');
  };

  return (
    <div className="flex flex-col h-full w-full space-y-2">
      
      {/* BARRA SUPERIOR DE GOOGLE CALENDAR / TASKFLOW */}
      <div className="bg-white border-2 border-[#D8CFF0] rounded-lg px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Navegación < Hoy > + Título del Período */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border-2 border-[#D8CFF0] bg-[#F8F6FC] p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white text-[#4A4A4A] hover:text-[#8E0E75] transition-all cursor-pointer"
              title="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#8E0E75] hover:bg-white rounded-md transition-all cursor-pointer"
              title="Ir a hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white text-[#4A4A4A] hover:text-[#8E0E75] transition-all cursor-pointer"
              title="Período siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-black tracking-tight text-[#292929]">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* SELECTOR DE VISTAS TIPO GOOGLE CALENDAR (DÍA, SEMANA, MES, AÑO) */}
        <div className="flex items-center rounded-md bg-[#F8F6FC] p-1 border-2 border-[#D8CFF0] text-xs font-black uppercase tracking-wider shadow-2xs">
          <button
            type="button"
            onClick={() => setViewType('day')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              viewType === 'day'
                ? 'bg-[#8E0E75] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#292929]'
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setViewType('week')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              viewType === 'week'
                ? 'bg-[#8E0E75] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#292929]'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setViewType('month')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              viewType === 'month'
                ? 'bg-[#8E0E75] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#292929]'
            }`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => setViewType('year')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              viewType === 'year'
                ? 'bg-[#8E0E75] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#292929]'
            }`}
          >
            Año
          </button>
        </div>

        {/* Popups Interactivos de Control: Advertencias y Tareas Hechas */}
        <div className="flex items-center gap-2 text-xs">
          {/* Botón de auto-desplazamiento de tareas pendientes vencidas */}
          {onRescheduleOverdue && overdueItems.length > 0 && (
            <button
              type="button"
              onClick={onRescheduleOverdue}
              className="px-3 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-[#8E0E75] border-2 border-[#8E0E75]/40 font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse hover:scale-105 active:scale-95"
              title="Desplazar automáticamente las tareas no completadas a hoy para mantenerlas como recordatorio activo"
            >
              <RotateCw className="h-3.5 w-3.5 text-[#8E0E75]" />
              <span>Desplazar {overdueItems.length} vencidas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActivePopup('urgent_warnings')}
            className={`px-3 py-1.5 rounded-md border font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
              monthPending.length > 0
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title="Abrir tareas pendientes de este mes"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>{monthPending.length} Pendientes</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePopup('goods_done')}
            className="px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title="Abrir tareas completadas con éxito"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{monthDone.length} Hechas</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePopup('meetings')}
            className="px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hidden sm:flex hover:scale-105 active:scale-95"
            title="Abrir reuniones agendadas"
          >
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>{monthMeetings.length} Reuniones</span>
          </button>
        </div>

        {/* Acciones de Calendario: Exportar .ics y Añadir Tarea */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAllEventsIcs(items, `BrainUp_Calendario_${viewType}_${year}.ics`)}
            className="inline-flex items-center gap-1.5 p-2 rounded-md border-2 border-[#D8CFF0] bg-white hover:border-[#8E0E75] text-[#292929] shadow-2xs transition-all cursor-pointer"
            title="Exportar a .ics (Google Calendar / Outlook)"
            aria-label="Exportar calendario a archivo .ics"
          >
            <Download className="h-4 w-4 text-[#8E0E75]" />
          </button>

          <button
            type="button"
            onClick={() => onOpenCreateModal(selectedDate)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#8E0E75] hover:bg-[#700B5C] text-white text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar tarea</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO PRINCIPAL: RENDERIZADO SEGÚN VISTA ACTIVA */}
      <div className="flex-1 min-h-0 bg-white border border-[#D8CFF0] rounded-sm shadow-xs overflow-hidden flex flex-col">
        {viewType === 'week' && (
          <WeekView
            weekDays={weekDays}
            items={items}
            todayStr={todayStr}
            postIts={postIts}
            onOpenPostIt={onOpenPostIt}
            onSelectItem={onSelectItem}
            onDeleteItem={onDeleteItem}
            onToggleStatus={onToggleStatus}
            onStartClockifyTimer={onStartClockifyTimer}
            onOpenCreateModal={onOpenCreateModal}
            onMoveItemDate={onMoveItemDate}
            onQuickReschedule={handleQuickReschedule}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setCurrentDate(new Date(d + 'T00:00:00'));
            }}
          />
        )}

        {viewType === 'day' && (
          <DayView
            selectedDate={selectedDate}
            items={items}
            onSelectItem={onSelectItem}
            onDeleteItem={onDeleteItem}
            onToggleStatus={onToggleStatus}
            onStartClockifyTimer={onStartClockifyTimer}
            onOpenCreateModal={onOpenCreateModal}
            onMoveItemDate={onMoveItemDate}
            onQuickReschedule={handleQuickReschedule}
          />
        )}

        {viewType === 'month' && (
          <MonthView
            monthCells={monthCells}
            items={items}
            todayStr={todayStr}
            onSelectItem={onSelectItem}
            onDeleteItem={onDeleteItem}
            onToggleStatus={onToggleStatus}
            onStartClockifyTimer={onStartClockifyTimer}
            onOpenCreateModal={onOpenCreateModal}
            onMoveItemDate={onMoveItemDate}
            onQuickReschedule={handleQuickReschedule}
            onCellClick={handleCellClick}
          />
        )}

        {viewType === 'year' && (
          <YearView
            year={year}
            items={items}
            todayStr={todayStr}
            onSelectDate={(dateStr) => {
              setSelectedDate(dateStr);
              setCurrentDate(new Date(dateStr + 'T00:00:00'));
              setViewType('week'); // Al clicar en día del año, abre la semana con las tiras de colores
            }}
            onSelectMonth={(m) => {
              const d = new Date(year, m, 1);
              setCurrentDate(d);
              setViewType('month');
            }}
          />
        )}
      </div>

      {/* POP-UPS MODALES INTERACTIVOS */}
      {/* 1. Detalles del Día Seleccionado */}
      {activePopup === 'day_details' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8CFF0] rounded-sm shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-[#EAE4F5] bg-[#F8F6FC] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-[#8E0E75] text-white">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-[#292929]">
                    ACTIVIDADES DEL DÍA: <span className="text-[#8E0E75]">{selectedDate.split('-').reverse().join('/')}</span>
                  </h3>
                  <p className="text-[11px] text-[#4A4A4A]">
                    {selectedDayItems.length} actividad(es) agendada(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActivePopup('none');
                    onOpenCreateModal(selectedDate);
                  }}
                  className="px-2.5 py-1 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Añadir aquí
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopup('none')}
                  className="p-1 rounded-sm hover:bg-slate-200 text-slate-400 hover:text-[#292929]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {selectedDayItems.length === 0 ? (
                <div className="py-8 text-center bg-[#F8F6FC] rounded-sm border border-dashed border-[#D8CFF0] space-y-2">
                  <p className="text-xs text-[#4A4A4A]">No hay entregables ni reuniones para este día.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePopup('none');
                      onOpenCreateModal(selectedDate);
                    }}
                    className="text-xs font-extrabold text-[#8E0E75] hover:underline cursor-pointer"
                  >
                    Programar tarea o reunión ahora
                  </button>
                </div>
              ) : (
                selectedDayItems.map((item) => (
                  <ColorStripItem
                    key={item.id}
                    item={item}
                    onSelectItem={(it) => {
                      setActivePopup('none');
                      onSelectItem(it);
                    }}
                    onDeleteItem={onDeleteItem}
                    onToggleStatus={onToggleStatus}
                    onStartClockifyTimer={onStartClockifyTimer}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Tareas Pendientes del Mes */}
      {activePopup === 'urgent_warnings' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-500 rounded-sm shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-amber-600 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-amber-900">
                    TAREAS PENDIENTES DEL MES
                  </h3>
                  <p className="text-[11px] text-amber-700">
                    {monthPending.length} actividad(es) pendientes por completar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopup('none')}
                className="p-1 rounded-sm hover:bg-amber-100 text-amber-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {monthPending.length === 0 ? (
                <div className="py-8 text-center bg-amber-50/50 rounded-sm text-amber-800 text-xs">
                  Excelente: No hay tareas pendientes este mes.
                </div>
              ) : (
                monthPending.map((item) => (
                  <ColorStripItem
                    key={item.id}
                    item={item}
                    onSelectItem={(it) => {
                      setActivePopup('none');
                      onSelectItem(it);
                    }}
                    onDeleteItem={onDeleteItem}
                    onToggleStatus={onToggleStatus}
                    onStartClockifyTimer={onStartClockifyTimer}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Tareas Hechas y Completadas */}
      {activePopup === 'goods_done' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-emerald-500 rounded-sm shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-emerald-900">
                    TAREAS COMPLETADAS
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    {monthDone.length} entregable(s) finalizado(s) con éxito
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopup('none')}
                className="p-1 rounded-sm hover:bg-emerald-100 text-emerald-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {monthDone.length === 0 ? (
                <div className="py-8 text-center bg-emerald-50/50 rounded-sm text-emerald-800 text-xs">
                  Aún no has completado tareas este mes. ¡A por ellas!
                </div>
              ) : (
                monthDone.map((item) => (
                  <ColorStripItem
                    key={item.id}
                    item={item}
                    onSelectItem={(it) => {
                      setActivePopup('none');
                      onSelectItem(it);
                    }}
                    onDeleteItem={onDeleteItem}
                    onToggleStatus={onToggleStatus}
                    onStartClockifyTimer={onStartClockifyTimer}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Reuniones Programadas */}
      {activePopup === 'meetings' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-blue-500 rounded-sm shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-blue-600 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-blue-900">
                    REUNIONES Y CITAS DE EQUIPO
                  </h3>
                  <p className="text-[11px] text-blue-700">
                    {monthMeetings.length} reunión(es) agendada(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopup('none')}
                className="p-1 rounded-sm hover:bg-blue-100 text-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {monthMeetings.length === 0 ? (
                <div className="py-8 text-center bg-[#F8F6FC] rounded-sm text-slate-500 text-xs">
                  No hay reuniones programadas para este mes.
                </div>
              ) : (
                monthMeetings.map((item) => (
                  <ColorStripItem
                    key={item.id}
                    item={item}
                    onSelectItem={(it) => {
                      setActivePopup('none');
                      onSelectItem(it);
                    }}
                    onDeleteItem={onDeleteItem}
                    onToggleStatus={onToggleStatus}
                    onStartClockifyTimer={onStartClockifyTimer}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// SUBCOMPONENTE 1: TIRA DE COLOR (COLOR STRIP) FORMATO IDÉNTICO AL SCREENSHOT
// =========================================================================
function ColorStripItem({
  item,
  onSelectItem,
  onDeleteItem,
  onToggleStatus,
  onStartClockifyTimer,
  onQuickReschedule,
  compact = false,
}: {
  item: TaskFlowItem;
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleStatus: (id: string, nextStatus: TaskFlowItem['status']) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onQuickReschedule?: (itemId: string, days?: number) => void;
  compact?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const isDone = item.status === 'done';
  const stripColor = getItemColorStrip(item);
  const cfg = COLOR_STRIP_CONFIG[stripColor] || COLOR_STRIP_CONFIG.purple;
  const effectiveColor = item.customColor || cfg.hex;
  const customStyles = getCustomColorStyles(effectiveColor);

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, date: item.date, title: item.title }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      onClick={() => onSelectItem(item)}
      style={customStyles.style}
      title={`${item.title} • Arrastra para mover de día`}
      className={`group relative rounded-[4px] border transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs hover:shadow-xs hover:brightness-95 flex items-center justify-between gap-1.5 ${
        compact ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-xs'
      } ${
        isDone ? 'opacity-65' : ''
      } ${isDragging ? 'opacity-30 scale-95 ring-2 ring-[#8E0E75]' : ''}`}
    >
      {/* Botón de Checkbox a la izquierda */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus(item.id, isDone ? 'todo' : 'done');
        }}
        className={`shrink-0 rounded-full flex items-center justify-center transition-all ${
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
        } ${
          isDone
            ? 'bg-emerald-600 text-white'
            : 'border border-black/30 hover:border-[#8E0E75] bg-white/80'
        }`}
        title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
      >
        {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
      </button>

      {/* Contenido / Título / Empresa en el centro */}
      <div className="flex-1 min-w-0 pr-1 flex items-center gap-1.5">
        <div 
          className={`${compact ? 'truncate' : 'line-clamp-2 break-words'} font-bold leading-snug tracking-tight ${isDone ? 'line-through opacity-75' : ''}`}
          style={{ color: customStyles.textColor }}
        >
          {item.title}
        </div>
        {item.autoReschedule && (
          <span title="Auto-desplazamiento activo si no se completa hoy" className="shrink-0 opacity-60">
            <RotateCw className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Horario a la derecha y Acciones de Hover */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Badge de Horario visible por defecto */}
        {item.startTime && (
          <span 
            className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-xs shrink-0 group-hover:hidden"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              color: customStyles.textColor 
            }}
          >
            {item.startTime}
          </span>
        )}

        {/* Acciones Rápidas flotantes al pasar el ratón */}
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartClockifyTimer(item);
            }}
            className="p-1 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform hover:scale-110 cursor-pointer"
            title="Iniciar temporizador en Clockify"
          >
            <Play className="h-2.5 w-2.5 fill-white" />
          </button>

          {/* Desplazamiento manual inmediato en cualquier momento del día */}
          {onQuickReschedule && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickReschedule(item.id, 1);
              }}
              className="p-1 rounded-xs bg-[#8E0E75] hover:bg-[#700B5C] text-white shadow-xs transition-transform hover:scale-110 cursor-pointer"
              title="Desplazar tarea a mañana (+1 día hábil) ahora mismo"
            >
              <FastForward className="h-2.5 w-2.5" />
            </button>
          )}

          <a
            href={getGoogleCalendarUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-xs bg-white hover:bg-slate-100 text-blue-600 shadow-xs transition-transform hover:scale-110 cursor-pointer"
            title="Añadir a Google Calendar"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
            }}
            className="p-1 rounded-xs bg-white hover:bg-red-50 text-red-600 shadow-xs transition-transform hover:scale-110 cursor-pointer"
            title="Eliminar tarea"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTE 2: VISTA SEMANAL (WEEK VIEW) - 5 DÍAS LABORALES (L-V) + PANEL DE NOTIFICACIONES
// =========================================================================
function WeekView({
  weekDays,
  items,
  todayStr,
  postIts = [],
  onOpenPostIt,
  onSelectItem,
  onDeleteItem,
  onToggleStatus,
  onStartClockifyTimer,
  onOpenCreateModal,
  onSelectDate,
  onMoveItemDate,
  onQuickReschedule,
}: {
  weekDays: {
    date: Date;
    dateStr: string;
    dayNumber: number;
    dayName: string;
    dayNameFull: string;
    isToday: boolean;
    isSelected: boolean;
  }[];
  items: TaskFlowItem[];
  todayStr: string;
  postIts?: PostItItem[];
  onOpenPostIt?: (postItId: string) => void;
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleStatus: (id: string, nextStatus: TaskFlowItem['status']) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
  onSelectDate: (dateStr: string) => void;
  onMoveItemDate?: (itemId: string, newDate: string) => void;
  onQuickReschedule?: (itemId: string, days?: number) => void;
}) {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Área Principal de Calendario: 5 Columnas Laborales (Lunes a Viernes) */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        
        {/* Cabecera de 5 Columnas: Lun a Vie */}
        <div className="grid grid-cols-5 border-b border-[#EAE4F5] bg-[#F8F6FC] shrink-0 divide-x divide-[#EAE4F5]">
          {weekDays.map((day) => {
            const isTarget = dragOverDay === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDay !== day.dateStr) setDragOverDay(day.dateStr);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDay(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDay(null);
                  const itemId = e.dataTransfer.getData('text/plain');
                  if (itemId && onMoveItemDate) {
                    onMoveItemDate(itemId, day.dateStr);
                  }
                }}
                className={`p-2 flex items-center justify-between transition-colors cursor-pointer ${
                  isTarget
                    ? 'bg-[#8E0E75]/20 ring-2 ring-[#8E0E75] ring-inset'
                    : day.isToday
                    ? 'bg-blue-50/50'
                    : 'hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#4A4A4A]">
                    {day.dayName}
                  </span>

                  {/* Número del día con círculo azul si es hoy */}
                  <span
                    className={`inline-flex items-center justify-center text-xs font-black rounded-full h-6 w-6 transition-all ${
                      day.isToday
                        ? 'bg-[#1A73E8] text-white shadow-xs'
                        : day.isSelected
                        ? 'bg-[#8E0E75] text-white'
                        : 'text-[#292929]'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>

                {/* Botón rápido + para añadir tarea en ese día específico */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreateModal(day.dateStr);
                  }}
                  className="p-1 rounded-xs hover:bg-[#8E0E75] hover:text-white text-slate-400 transition-all cursor-pointer"
                  title={`Agregar tarea en ${day.dayName} ${day.dayNumber}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Cuerpo de las 5 Columnas con Drag & Drop */}
        <div className="grid grid-cols-5 flex-1 min-h-0 divide-x divide-[#EAE4F5] overflow-y-auto">
          {weekDays.map((day) => {
            const dayItems = items.filter((it) => it.date === day.dateStr);
            const isTarget = dragOverDay === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDay !== day.dateStr) {
                    setDragOverDay(day.dateStr);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDay(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDay(null);
                  const itemId = e.dataTransfer.getData('text/plain');
                  if (itemId && onMoveItemDate) {
                    onMoveItemDate(itemId, day.dateStr);
                  }
                }}
                className={`p-2 flex flex-col space-y-1.5 min-h-[420px] transition-all relative ${
                  isTarget
                    ? 'bg-[#8E0E75]/10 ring-2 ring-[#8E0E75] ring-inset shadow-inner'
                    : day.isToday
                    ? 'bg-blue-50/20'
                    : 'bg-white'
                }`}
              >
                {/* Indicador visual al arrastrar encima */}
                {isTarget && (
                  <div className="py-2 px-1 text-center bg-white/95 border-2 border-dashed border-[#8E0E75] rounded-xs text-[11px] font-black uppercase text-[#8E0E75] animate-pulse shadow-sm">
                    Soltar para mover a {day.dayName} {day.dayNumber}
                  </div>
                )}

                {dayItems.length === 0 ? (
                  <div
                    onClick={() => onOpenCreateModal(day.dateStr)}
                    className="flex-1 rounded-sm border border-dashed border-slate-200 hover:border-[#8E0E75]/50 hover:bg-[#F8F6FC]/60 p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                  >
                    <Plus className="h-4 w-4 text-slate-300 group-hover:text-[#8E0E75] transition-colors" />
                    <span className="text-[11px] text-slate-400 group-hover:text-[#8E0E75] font-semibold mt-1">
                      Añadir Tarea
                    </span>
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <ColorStripItem
                      key={item.id}
                      item={item}
                      onSelectItem={onSelectItem}
                      onDeleteItem={onDeleteItem}
                      onToggleStatus={onToggleStatus}
                      onStartClockifyTimer={onStartClockifyTimer}
                      onQuickReschedule={onQuickReschedule}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel de Notificaciones y Recordatorios en el espacio de Sábados y Domingos */}
      <div className="w-72 xl:w-80 shrink-0 h-full border-l border-[#D8CFF0] flex flex-col overflow-hidden bg-[#FAF9FD]">
        <NotificationsPanel postIts={postIts} onOpenPostIt={onOpenPostIt} />
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTE 3: VISTA DIARIA (DAY VIEW) - AGENDA HORARIA (08:00 A 20:00)
// =========================================================================
function DayView({
  selectedDate,
  items,
  onSelectItem,
  onDeleteItem,
  onToggleStatus,
  onStartClockifyTimer,
  onOpenCreateModal,
  onMoveItemDate,
  onQuickReschedule,
}: {
  selectedDate: string;
  items: TaskFlowItem[];
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleStatus: (id: string, nextStatus: TaskFlowItem['status']) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
  onMoveItemDate?: (itemId: string, newDate: string) => void;
  onQuickReschedule?: (itemId: string, days?: number) => void;
}) {
  const dayItems = items.filter((it) => it.date === selectedDate);
  const hours = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, '0') + ':00');

  const pendingItems = dayItems.filter((it) => it.status !== 'done');
  const doneItems = dayItems.filter((it) => it.status === 'done');
  const totalHours = dayItems.reduce((acc, it) => acc + (it.estimatedHours || 1), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
      {/* Resumen Superior del Día */}
      <div className="p-3 bg-[#F8F6FC] border border-[#D8CFF0] rounded-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-[#8E0E75] text-white">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight text-[#292929]">
              AGENDA Y ENTREGABLES: <span className="text-[#8E0E75]">{selectedDate.split('-').reverse().join('/')}</span>
            </h3>
            <p className="text-[11px] text-[#4A4A4A]">
              {dayItems.length} actividad(es) agendada(s) · {totalHours}h estimadas de trabajo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
            {pendingItems.length} Pendientes
          </span>
          <span className="px-2.5 py-1 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
            {doneItems.length} Hechas
          </span>
          <button
            type="button"
            onClick={() => onOpenCreateModal(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#8E0E75] text-white hover:bg-[#700B5C] transition-all cursor-pointer font-extrabold uppercase"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Añadir Tarea en este Día</span>
          </button>
        </div>
      </div>

      {/* Sección 1: Tiras de Colores del Día (Formato Tira Horizontal) */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A]">
          Tiras de Tareas y Entregables del Día ({dayItems.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {dayItems.length === 0 ? (
            <div className="col-span-full py-6 text-center bg-[#F8F6FC] rounded-sm border border-dashed border-[#D8CFF0] text-xs text-slate-500">
              No hay tareas agendadas para hoy. Haz clic en "Añadir Tarea en este Día".
            </div>
          ) : (
            dayItems.map((item) => (
              <ColorStripItem
                key={item.id}
                item={item}
                onSelectItem={onSelectItem}
                onDeleteItem={onDeleteItem}
                onToggleStatus={onToggleStatus}
                onStartClockifyTimer={onStartClockifyTimer}
                onQuickReschedule={onQuickReschedule}
              />
            ))
          )}
        </div>
      </div>

      {/* Sección 2: Cronograma Horario (08:00 - 20:00 estilo Google Calendar) */}
      <div className="space-y-2 pt-2 border-t border-[#EAE4F5]">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A]">
          Cronograma Horario (08:00 - 20:00)
        </h4>
        <div className="border border-[#D8CFF0] rounded-sm divide-y divide-[#EAE4F5] bg-white">
          {hours.map((hourStr) => {
            const hourPrefix = hourStr.slice(0, 2);
            const hourItems = dayItems.filter((it) => it.startTime && it.startTime.startsWith(hourPrefix));

            return (
              <div
                key={hourStr}
                onClick={() => onOpenCreateModal(selectedDate)}
                className="flex items-center min-h-[46px] p-2 hover:bg-[#F8F6FC]/60 transition-colors cursor-pointer group"
              >
                <div className="w-16 shrink-0 text-xs font-mono font-bold text-slate-400 group-hover:text-[#8E0E75]">
                  {hourStr}
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                  {hourItems.length === 0 ? (
                    <span className="text-[11px] text-slate-300 group-hover:text-[#8E0E75] italic flex items-center gap-1">
                      <Plus className="h-2.5 w-2.5" />
                      <span>Clic para programar en este horario</span>
                    </span>
                  ) : (
                    hourItems.map((item) => (
                      <div key={item.id} onClick={(e) => e.stopPropagation()} className="max-w-md w-full">
                        <ColorStripItem
                          item={item}
                          onSelectItem={onSelectItem}
                          onDeleteItem={onDeleteItem}
                          onToggleStatus={onToggleStatus}
                          onStartClockifyTimer={onStartClockifyTimer}
                          onQuickReschedule={onQuickReschedule}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTE 4: VISTA MENSUAL (MONTH VIEW) - CUADRÍCULA DE 7 COLUMNAS
// =========================================================================
function MonthView({
  monthCells,
  items,
  todayStr,
  onSelectItem,
  onDeleteItem,
  onToggleStatus,
  onStartClockifyTimer,
  onOpenCreateModal,
  onCellClick,
  onMoveItemDate,
  onQuickReschedule,
}: {
  monthCells: {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[];
  items: TaskFlowItem[];
  todayStr: string;
  onSelectItem: (item: TaskFlowItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleStatus: (id: string, nextStatus: TaskFlowItem['status']) => void;
  onStartClockifyTimer: (item: TaskFlowItem) => void;
  onOpenCreateModal: (defaultDate?: string) => void;
  onCellClick: (dateStr: string) => void;
  onMoveItemDate?: (itemId: string, newDate: string) => void;
  onQuickReschedule?: (itemId: string, days?: number) => void;
}) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Cabecera de Días */}
      <div className="grid grid-cols-7 border-b border-[#EAE4F5] bg-[#F8F6FC] text-center shrink-0">
        {DAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={`py-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
              idx >= 5 ? 'text-slate-400' : 'text-[#292929]'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Celdas del Calendario con tiras de colores compactas y Drag & Drop */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-[#EAE4F5] overflow-y-auto">
        {monthCells.map((cell) => {
          const dayItems = items.filter((item) => item.date === cell.dateStr);
          const isTarget = dragOverCell === cell.dateStr;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onCellClick(cell.dateStr)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverCell !== cell.dateStr) {
                  setDragOverCell(cell.dateStr);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCell(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCell(null);
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId && onMoveItemDate) {
                  onMoveItemDate(itemId, cell.dateStr);
                }
              }}
              className={`min-h-[90px] p-1.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                isTarget
                  ? 'bg-[#8E0E75]/15 ring-2 ring-[#8E0E75] ring-inset shadow-sm'
                  : !cell.isCurrentMonth
                  ? 'bg-slate-50/40 text-slate-300'
                  : 'bg-white text-[#292929] hover:bg-[#F8F6FC]/80'
              } ${
                cell.isSelected && !isTarget ? 'ring-2 ring-[#8E0E75] ring-inset bg-[#F8F6FC]' : ''
              }`}
              title={`Ver actividades del ${cell.dateStr} • Arrastra para mover aquí`}
            >
              {isTarget && (
                <div className="text-[11px] font-black uppercase text-[#8E0E75] bg-white/95 px-1 py-0.5 rounded-xs border border-dashed border-[#8E0E75] text-center mb-1 animate-pulse">
                  Mover al {cell.dayNumber}
                </div>
              )}
              {/* Fila del Día y Botón + */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-[11px] font-extrabold rounded-full h-5 w-5 transition-all ${
                    cell.isToday
                      ? 'bg-[#1A73E8] text-white shadow-2xs'
                      : cell.isSelected
                      ? 'text-[#8E0E75] font-black'
                      : cell.isCurrentMonth
                      ? 'text-[#292929]'
                      : 'text-slate-300'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreateModal(cell.dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-xs hover:bg-[#8E0E75] hover:text-white text-slate-400 transition-all cursor-pointer"
                  title={`Añadir en ${cell.dateStr}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Tiras de Colores Compactas */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayItems.slice(0, 3).map((item) => (
                  <div key={item.id} onClick={(e) => e.stopPropagation()}>
                    <ColorStripItem
                      item={item}
                      compact
                      onSelectItem={onSelectItem}
                      onDeleteItem={onDeleteItem}
                      onToggleStatus={onToggleStatus}
                      onStartClockifyTimer={onStartClockifyTimer}
                      onQuickReschedule={onQuickReschedule}
                    />
                  </div>
                ))}

                {dayItems.length > 3 && (
                  <div className="text-[11px] font-extrabold text-[#8E0E75] leading-none px-0.5">
                    +{dayItems.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTE 5: VISTA ANUAL (YEAR VIEW) - MATRIZ DE 12 MESES GOOGLE CALENDAR
// =========================================================================
function YearView({
  year,
  items,
  todayStr,
  onSelectDate,
  onSelectMonth,
}: {
  year: number;
  items: TaskFlowItem[];
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
  onSelectMonth: (monthIdx: number) => void;
}) {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_NAMES.map((mName, mIdx) => {
          const firstDay = new Date(year, mIdx, 1);
          let startDay = firstDay.getDay() - 1;
          if (startDay === -1) startDay = 6;
          const daysInThisMonth = new Date(year, mIdx + 1, 0).getDate();

          return (
            <div
              key={mName}
              className="p-3 bg-[#F8F6FC]/60 border border-[#D8CFF0] rounded-sm hover:border-[#8E0E75] hover:bg-white transition-all space-y-2 shadow-2xs"
            >
              {/* Título de Mes Clicable */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectMonth(mIdx)}
                  className="text-xs font-black uppercase text-[#292929] hover:text-[#8E0E75] cursor-pointer"
                >
                  {mName}
                </button>
                <span className="text-[11px] font-bold text-slate-400">
                  {items.filter(it => it.date.startsWith(`${year}-${String(mIdx + 1).padStart(2, '0')}`)).length} tareas
                </span>
              </div>

              {/* Cabecera L M X J V S D */}
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              {/* Matriz de Días del Mini Mes */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {/* Días vacíos de inicio */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <span key={`empty_${i}`} className="h-5" />
                ))}

                {/* Días del mes */}
                {Array.from({ length: daysInThisMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;
                  const dayItems = items.filter(it => it.date === dateStr);
                  const hasTasks = dayItems.length > 0;
                  const hasPending = dayItems.some(it => it.status !== 'done');

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => onSelectDate(dateStr)}
                      className={`h-5 w-5 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer relative ${
                        isToday
                          ? 'bg-[#1A73E8] text-white shadow-xs'
                          : hasTasks
                          ? 'bg-[#8E0E75]/15 text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white'
                          : 'text-[#292929] hover:bg-slate-200'
                      }`}
                      title={`${dayNum} ${mName} (${dayItems.length} tareas)`}
                    >
                      <span>{dayNum}</span>
                      {hasPending && (
                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#8E0E75] ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
