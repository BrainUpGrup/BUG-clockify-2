'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppSelect } from '@/components/ui/app-select';
import { AppCalendar } from '@/components/ui/app-calendar';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Building2, 
  Users, 
  Lock, 
  Share2, 
  Video, 
  MapPin, 
  Check,
  CheckSquare, 
  Sparkles, 
  ExternalLink, 
  Download,
  AlertCircle,
  Palette,
  RotateCw,
  FolderPlus,
  Layers,
  FastForward
} from 'lucide-react';
import { 
  TaskFlowItem, 
  TaskPriority, 
  TaskStatus, 
  TaskFlowItemType, 
  ColorStrip,
  TaskList,
  DEFAULT_TASK_LISTS,
  GOOGLE_CALENDAR_COLORS,
  DEFAULT_CALENDAR_COLOR,
  isLightColor,
  getCustomColorStyles,
  COLOR_STRIP_CONFIG,
  getItemColorStrip,
  getGoogleCalendarUrl, 
  downloadSingleEventIcs 
} from '@/lib/calendar-export';
import { Company, Profile } from '@/types/database';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: TaskFlowItem) => void;
  editingItem?: TaskFlowItem | null;
  defaultDate?: string;
  companies: Company[];
  profiles: Profile[];
  currentUserName: string;
  taskLists?: TaskList[];
  onCreateList?: (newList: TaskList) => void;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  defaultDate,
  companies,
  profiles,
  currentUserName,
  taskLists = DEFAULT_TASK_LISTS,
  onCreateList,
}: TaskModalProps) {
  const [type, setType] = useState<TaskFlowItemType>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Color RGB / Hexadecimal personalizado y Lista
  const [customColor, setCustomColor] = useState<string>('#8E0E75');
  const [listId, setListId] = useState<string>('list-general');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  
  // Desplazamiento manual o automático si no se completa
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [rescheduleDays, setRescheduleDays] = useState(1);

  // Función de desplazamiento inmediato al siguiente día laboral (L-V)
  const handleShiftToNextBusinessDay = () => {
    const cur = new Date(date + 'T00:00:00');
    cur.setDate(cur.getDate() + (rescheduleDays || 1));
    // Saltar fines de semana (Sábado -> Lunes, Domingo -> Lunes)
    if (cur.getDay() === 6) cur.setDate(cur.getDate() + 2);
    if (cur.getDay() === 0) cur.setDate(cur.getDate() + 1);
    setDate(cur.toISOString().split('T')[0]);
  };

  // Mini-creador de nueva lista
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#8E0E75');

  const [status, setStatus] = useState<TaskStatus>('todo');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('Google Meet');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('2');
  const [isShared, setIsShared] = useState(true);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([currentUserName]);
  const [showPalette, setShowPalette] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Cargar colores recientes de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bug_taskflow_recent_colors');
      if (raw) {
        setRecentColors(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // Sincronizar formulario con editingItem o valores por defecto
  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title);
      setDescription(editingItem.description || '');
      setCompanyName(editingItem.companyName || '');
      
      const initialColor = editingItem.customColor || (
        editingItem.colorStrip ? COLOR_STRIP_CONFIG[editingItem.colorStrip]?.hex : '#8E0E75'
      );
      setCustomColor(initialColor);
      setListId(editingItem.listId || (taskLists[0]?.id || 'list-general'));
      setAutoReschedule(editingItem.autoReschedule !== undefined ? editingItem.autoReschedule : true);
      setRescheduleDays(editingItem.rescheduleDays || 1);

      setStatus(editingItem.status);
      setDate(editingItem.date);
      setStartTime(editingItem.startTime || '10:00');
      setEndTime(editingItem.endTime || '11:00');
      setLocation(editingItem.location || 'Google Meet');
      setMeetingUrl(editingItem.meetingUrl || '');
      setEstimatedHours(String(editingItem.estimatedHours || 2));
      setIsShared(editingItem.isShared);
      setSelectedAssignees(editingItem.assignees || [currentUserName]);
    } else {
      setType('task');
      setTitle('');
      setDescription('');
      setCompanyName(companies.length > 0 ? companies[0].name : 'Cliente General');
      
      const defaultList = taskLists[0] || DEFAULT_TASK_LISTS[0];
      setListId(defaultList.id);
      setCustomColor(defaultList.color || '#8E0E75');
      setAutoReschedule(true);
      setRescheduleDays(1);

      setStatus('todo');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('10:00');
      setEndTime('11:00');
      setLocation('Google Meet');
      setMeetingUrl('');
      setEstimatedHours('2');
      setIsShared(true);
      setSelectedAssignees([currentUserName]);
    }
  }, [editingItem, defaultDate, companies, currentUserName, isOpen, taskLists]);

  // Teclado: Escape cierra (si no hay un desplegable abierto) y Ctrl/Cmd + Enter guarda
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        const openPopup = dialogRef.current?.querySelector('[aria-expanded="true"]');
        if (!openPopup) onClose();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleAssignee = (name: string) => {
    if (selectedAssignees.includes(name)) {
      if (selectedAssignees.length === 1) return;
      setSelectedAssignees(selectedAssignees.filter(n => n !== name));
    } else {
      setSelectedAssignees([...selectedAssignees, name]);
    }
  };

  const handleSelectList = (selectedId: string) => {
    setListId(selectedId);
    const targetList = taskLists.find(l => l.id === selectedId);
    if (targetList) {
      setCustomColor(targetList.color);
    }
  };

  const handleCreateNewList = () => {
    if (!newListName.trim()) return;
    const created: TaskList = {
      id: 'list-' + Date.now(),
      name: newListName.trim(),
      color: newListColor,
      createdAt: new Date().toISOString(),
    };
    if (onCreateList) {
      onCreateList(created);
    }
    setListId(created.id);
    setCustomColor(created.color);
    setNewListName('');
    setShowNewListForm(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      dialogRef.current?.querySelector<HTMLInputElement>('#taskflow-title')?.focus();
      return;
    }

    const matchedCompany = companies.find(c => c.name.toLowerCase() === companyName.toLowerCase());

    const itemToSave: TaskFlowItem = {
      id: editingItem ? editingItem.id : 'tf_' + Date.now(),
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      companyId: matchedCompany ? matchedCompany.id : undefined,
      companyName: companyName.trim() || 'Cliente General',
      status,
      priority: editingItem?.priority || 'media',
      rescheduleMode: autoReschedule ? 'auto' : 'manual',
      customColor: customColor.trim() || undefined,
      listId,
      autoReschedule,
      rescheduleDays: Number(rescheduleDays) || 1,
      date,
      startTime: type === 'meeting' ? startTime : undefined,
      endTime: type === 'meeting' ? endTime : undefined,
      location: type === 'meeting' ? (location.trim() || 'Brain Up Grup') : undefined,
      meetingUrl: type === 'meeting' ? (meetingUrl.trim() || undefined) : undefined,
      estimatedHours: parseFloat(estimatedHours) || 1,
      createdBy: editingItem ? editingItem.createdBy : currentUserName,
      createdByName: editingItem ? editingItem.createdByName : currentUserName,
      isShared,
      assignees: isShared ? selectedAssignees : [currentUserName],
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString().split('T')[0],
    };

    if (customColor) {
      try {
        const raw = localStorage.getItem('bug_taskflow_recent_colors');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        const updated = [customColor, ...existing.filter(c => c.toLowerCase() !== customColor.toLowerCase())].slice(0, 8);
        localStorage.setItem('bug_taskflow_recent_colors', JSON.stringify(updated));
      } catch {}
    }

    onSave(itemToSave);
    onClose();
  };

  const previewStyles = getCustomColorStyles(customColor);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Contenedor Modal de 2 Columnas Optimizadas para ZERO SCROLL */}
      <div
        ref={dialogRef}
        className="bg-white border border-[#D8CFF0] rounded-sm shadow-2xl w-full max-w-4xl flex flex-col tab-transition my-auto max-h-[calc(100vh-1rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="taskflow-modal-title"
      >
        {/* Cabecera Compacta en una sola fila */}
        <div className="py-2 px-3 sm:px-4 border-b border-[#EAE4F5] bg-gradient-to-r from-[#F8F6FC] to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-sm bg-[#8E0E75]/10 text-[#8E0E75]">
              {type === 'meeting' ? <CalendarIcon className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
            </div>
            <div>
              <h2 id="taskflow-modal-title" className="text-sm font-bold text-[#292929]">
                {editingItem ? 'Editar elemento' : 'Crear en TaskFlow'}
              </h2>
            </div>
          </div>

          {/* Selector de Tipo Tarea / Reunión Integrado Compacto */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-[11px] font-extrabold uppercase">
              <button
                type="button"
                onClick={() => setType('task')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-sm transition-all cursor-pointer ${
                  type === 'task' ? 'bg-[#8E0E75] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#292929]'
                }`}
              >
                <CheckSquare className="h-3 w-3" />
                <span>Tarea</span>
              </button>
              <button
                type="button"
                onClick={() => setType('meeting')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-sm transition-all cursor-pointer ${
                  type === 'meeting' ? 'bg-[#8E0E75] text-white shadow-xs' : 'text-[#4A4A4A] hover:text-[#292929]'
                }`}
              >
                <CalendarIcon className="h-3 w-3" />
                <span>Reunión</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-[#292929] transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Formulario en 2 Columnas para CERO SCROLL */}
        <form ref={formRef} id="taskflow-form" onSubmit={handleSubmit} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 overflow-y-auto md:overflow-visible">
          
          {/* COLUMNA 1 (md:col-span-7): TÍTULO, CLIENTE, PRIORIDAD, FECHA Y ASIGNADOS */}
          <div className="md:col-span-7 space-y-2 flex flex-col justify-between">
            {/* Título */}
            <div>
              <label htmlFor="taskflow-title" className="block text-[11px] font-bold uppercase tracking-wide text-[#292929] mb-0.5">
                {type === 'meeting' ? 'Asunto / Título de la Reunión *' : 'Título de la Tarea / Entregable *'}
              </label>
              <input
                id="taskflow-title"
                type="text"
                required
                autoFocus
                placeholder={
                  type === 'meeting'
                    ? 'ej. Reunión mensual cuota y objetivos'
                    : 'ej. Creación de copies y diseño banners campaña'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-medium text-[#292929]"
              />
            </div>

            {/* Fila: Cliente y Fecha Programada (Prioridad retirada por directriz del usuario) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-[#8E0E75]" />
                  <span>Empresa / Cliente</span>
                </label>
                {companies.length > 0 ? (
                  <AppSelect
                    value={companyName}
                    onChange={setCompanyName}
                    ariaLabel="Empresa / Cliente"
                    searchable
                    options={[
                      ...companies.map((c) => ({ value: c.name, label: c.name })),
                      { value: 'Brain Up Interno', label: 'Brain Up (Interno)' },
                    ]}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="ej. Restaurante El Gourmet"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-2 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-[#8E0E75]" />
                  <span>Fecha Programada</span>
                </label>
                <AppCalendar value={date} onChange={setDate} />
              </div>
            </div>

            {/* Fila: Horas Estimadas o Horarios de Reunión + Botón Desplazar a Mañana */}
            <div className="grid grid-cols-12 gap-2 items-end">
              {type === 'task' ? (
                <div className="col-span-12 flex items-center justify-between gap-2">
                  <div className="w-1/2">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#8E0E75]" />
                      <span>Horas Estimadas</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Horas estimadas"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value.replace(',', '.'))}
                      className="w-full px-2 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-bold"
                    />
                  </div>

                  {editingItem && (
                    <div className="w-1/2 pt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleShiftToNextBusinessDay}
                        className="px-2.5 py-1 rounded-sm bg-[#8E0E75]/10 hover:bg-[#8E0E75] text-[#8E0E75] hover:text-white border border-[#8E0E75]/30 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Desplazar tarea a mañana (+1 día hábil) en cualquier momento del día"
                      >
                        <FastForward className="h-3 w-3" />
                        <span>Desplazar a Mañana Ahora</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="col-span-6">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5">
                      Inicio
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-1.5 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-6">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5">
                      Fin
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-1.5 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-mono font-bold"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Si es reunión: Ubicación o Enlace (Compacto) */}
            {type === 'meeting' && (
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-[#292929] mb-0.5">
                    Ubicación / Meet
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Google Meet"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-2 py-0.5 border border-[#D8CFF0] rounded-sm text-xs bg-white focus:border-[#8E0E75] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-[#292929] mb-0.5">
                    Enlace Reunión (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full px-2 py-0.5 border border-[#D8CFF0] rounded-sm text-xs bg-white focus:border-[#8E0E75] outline-none font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {/* Notas / Descripción (Compacta) */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-0.5">
                Detalles / Notas de la Tarea
              </label>
              <textarea
                rows={2}
                placeholder="Detalles clave, orden del día, requisitos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none resize-none"
              />
            </div>

            {/* Asignación y Visibilidad (Compacto) */}
            <div className="p-1.5 rounded-sm border border-[#D8CFF0] bg-white flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#292929]">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-slate-300 text-[#8E0E75] cursor-pointer"
                />
                <span className="text-[11px]">{isShared ? 'Compartir con equipo' : 'Solo para mí (Privada)'}</span>
              </label>

              {isShared && (
                <div className="flex items-center gap-1 overflow-x-auto max-w-[240px]">
                  <span className="text-[11px] text-slate-400 font-bold mr-0.5">Asignados:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAssignee(currentUserName)}
                    className={`px-1.5 py-0.5 rounded-xs text-[11px] font-bold border ${
                      selectedAssignees.includes(currentUserName)
                        ? 'bg-[#8E0E75] text-white border-[#8E0E75]'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Tú
                  </button>
                  {profiles.slice(0, 2).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleToggleAssignee(p.full_name)}
                      className={`px-1.5 py-0.5 rounded-xs text-[11px] font-bold border truncate max-w-[90px] ${
                        selectedAssignees.includes(p.full_name)
                          ? 'bg-[#8E0E75] text-white border-[#8E0E75]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                      title={p.full_name}
                    >
                      {p.full_name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2 (md:col-span-5): LISTA DE TAREAS, SELECTOR RGB Y AUTO-DESPLAZAMIENTO */}
          <div className="md:col-span-5 space-y-2 flex flex-col justify-between">
            
            {/* 1. Selector de Lista de Tareas Asignada */}
            <div className="p-2 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#292929] flex items-center gap-1">
                  <Layers className="h-3 w-3 text-[#8E0E75]" />
                  <span>Lista de Tareas Asignada</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewListForm(!showNewListForm)}
                  className="text-[11px] font-extrabold text-[#8E0E75] hover:underline cursor-pointer"
                >
                  {showNewListForm ? 'Cerrar' : '+ Nueva'}
                </button>
              </div>

              {/* Selector Desplegable Rápido de Lista */}
              <AppSelect
                value={listId}
                onChange={handleSelectList}
                ariaLabel="Lista de tareas"
                options={taskLists.map((l) => ({
                  value: l.id,
                  label: l.name,
                  icon: <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />,
                }))}
              />

              {/* Mini formulario nueva lista */}
              {showNewListForm && (
                <div className="pt-1.5 border-t border-[#D8CFF0] space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nombre lista..."
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="px-2 py-0.5 text-xs border border-[#D8CFF0] rounded-sm bg-white flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewList}
                      className="px-2 py-0.5 bg-[#8E0E75] text-white rounded-sm text-[11px] font-black uppercase shrink-0 cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">Color:</span>
                    {GOOGLE_CALENDAR_COLORS.slice(0, 11).map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setNewListColor(col.hex)}
                        className={`h-4 w-4 rounded-full shrink-0 transition-transform cursor-pointer ${
                          newListColor.toLowerCase() === col.hex.toLowerCase()
                            ? 'ring-2 ring-[#8E0E75] scale-110 shadow-xs'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Color de la Tira (Exclusivo Paleta Google Calendar) */}
            <div className="p-2.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-[#8E0E75]" />
                  <span>Color de Tira</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full inline-block shadow-2xs"
                    style={{ backgroundColor: customColor }}
                  />
                  <span className="text-[11px] font-extrabold text-[#292929]">
                    {GOOGLE_CALENDAR_COLORS.find(c => c.hex.toLowerCase() === customColor.toLowerCase())?.name || 'Personalizado'}
                  </span>
                </div>
              </div>

              {/* Vista Previa de la Tira con fondo llamativo y banda lateral */}
              <div 
                style={previewStyles.style} 
                className="py-1.5 px-2.5 rounded-[4px] border flex items-center justify-between text-xs font-bold shadow-2xs transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="h-3.5 w-3.5 rounded-full border border-black/25 bg-white/90 flex items-center justify-center shrink-0">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                  <span className="truncate text-[11px]">{title.trim() || 'Vista previa de la tira'}</span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-xs bg-black/10 shrink-0 ml-1 font-bold">
                  {type === 'meeting' ? startTime : '~' + estimatedHours + 'h'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPalette((v) => !v)}
                aria-expanded={showPalette}
                className="text-[12px] font-semibold text-[#8E0E75] hover:underline cursor-pointer"
              >
                {showPalette ? 'Ocultar colores' : 'Cambiar color'}
              </button>

              {/* Paleta Oficial de Google Calendar: 2 filas de 11 círculos exactos (plegable) */}
              {showPalette && (
              <div className="space-y-1.5 pt-0.5">
                <div className="grid grid-cols-11 gap-1.5 justify-items-center">
                  {GOOGLE_CALENDAR_COLORS.map((col) => {
                    const isSelected = customColor.toLowerCase() === col.hex.toLowerCase();
                    const isLight = isLightColor(col.hex);
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setCustomColor(col.hex)}
                        className={`h-5 w-5 sm:h-5.5 sm:w-5.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-115 active:scale-95 ${
                          isSelected ? 'ring-2 ring-offset-1 ring-[#8E0E75] scale-110 shadow-xs' : 'hover:opacity-95'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={`${col.name} (${col.hex})`}
                      >
                        {isSelected && (
                          <Check className={`h-3 w-3 stroke-[3] ${isLight ? 'text-[#202124]' : 'text-white'} drop-shadow-xs`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Botón Predeterminada idéntico a Google Calendar */}
                <button
                  type="button"
                  onClick={() => setCustomColor(DEFAULT_CALENDAR_COLOR)}
                  className={`w-full py-1 px-3 mt-1 rounded-full border text-[11px] font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                    customColor.toLowerCase() === DEFAULT_CALENDAR_COLOR.toLowerCase()
                      ? 'bg-white border-[#8E0E75] text-[#8E0E75] ring-1 ring-[#8E0E75]/30 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-[#D8CFF0] text-[#4A4A4A]'
                  }`}
                  title="Restablecer color predeterminado corporativo Brain Up"
                >
                  <span className="h-3 w-3 rounded-full border-2 border-[#1A73E8] bg-transparent shrink-0" />
                  <span>Predeterminada</span>
                </button>
              </div>
              )}
            </div>

            {/* 3. Desplazamiento: Manual o Automático (A libre elección del usuario) */}
            <div className="p-2 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#292929] flex items-center gap-1">
                  <RotateCw className="h-3 w-3 text-[#8E0E75]" />
                  <span>Desplazamiento de Tarea</span>
                </span>

                <div className="w-48">
                  <AppSelect
                    value={String(rescheduleDays)}
                    onChange={(v) => setRescheduleDays(Number(v))}
                    ariaLabel="Días de desplazamiento"
                    options={[
                      { value: '1', label: '+1 día hábil (mañana)' },
                      { value: '2', label: '+2 días hábiles' },
                      { value: '3', label: '+3 días hábiles' },
                      { value: '7', label: '+1 semana' },
                    ]}
                  />
                </div>
              </div>

              {/* Botones de Modo: Manual vs Automático */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoReschedule(false)}
                  className={`py-1 px-1.5 rounded-xs border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    !autoReschedule
                      ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-2xs'
                      : 'bg-white text-slate-700 border-[#D8CFF0] hover:bg-slate-50'
                  }`}
                >
                  Manual (Cuando decidas)
                </button>
                <button
                  type="button"
                  onClick={() => setAutoReschedule(true)}
                  className={`py-1 px-1.5 rounded-xs border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    autoReschedule
                      ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-2xs'
                      : 'bg-white text-slate-700 border-[#D8CFF0] hover:bg-slate-50'
                  }`}
                >
                  Automático (Si vence)
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                {autoReschedule
                  ? 'Se reprogramará automáticamente al día siguiente si no se completa hoy.'
                  : 'Desplazamiento manual: desplázala en cualquier momento del día con el botón de flecha o arrastrándola.'}
              </p>
            </div>

          </div>
        </form>

        {/* Pie del Modal (Compacto y Fijo en la Base) */}
        <div className="py-2 px-3 sm:px-4 border-t border-[#EAE4F5] bg-[#F8F6FC] flex items-center justify-between shrink-0">
          <div>
            {editingItem && (
              <div className="flex items-center gap-1 text-[11px]">
                <a
                  href={getGoogleCalendarUrl(editingItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-white border border-slate-300 text-slate-700 hover:text-[#8E0E75] text-[11px] font-bold shadow-2xs"
                >
                  <ExternalLink className="h-3 w-3 text-blue-600" />
                  <span>Google Cal</span>
                </a>
                <button
                  type="button"
                  onClick={() => downloadSingleEventIcs(editingItem)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-white border border-slate-300 text-slate-700 hover:text-[#8E0E75] text-[11px] font-bold shadow-2xs"
                >
                  <Download className="h-3 w-3" />
                  <span>.ics</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-[#D8CFF0] hover:bg-white text-[#4A4A4A] text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="taskflow-form"
              title="Ctrl + Enter"
              className="px-4 py-1.5 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              {editingItem ? 'Guardar cambios' : type === 'meeting' ? 'Crear reunión' : 'Crear tarea'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
