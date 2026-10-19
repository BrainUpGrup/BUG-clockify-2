'use client';

import React, { useState, useEffect } from 'react';
import { 
  StickyNote, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  Pin, 
  Check, 
  X, 
  Bell, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  PostItItem, 
  PostItColor, 
  PostItReminder, 
  POSTIT_COLORS, 
  PRESET_REMINDERS 
} from '@/types/postit';
import { useNotifications } from '@/context/notifications-context';
import { removeWithUndo } from '@/lib/feedback';

interface PostItBoardProps {
  postIts: PostItItem[];
  onSavePostIts: (updated: PostItItem[]) => void;
  onOpenCreateModal?: () => void;
}

export function PostItBoard({
  postIts,
  onSavePostIts,
}: PostItBoardProps) {
  const { syncPostItReminders, addNotification } = useNotifications();

  // Estados locales para modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostIt, setEditingPostIt] = useState<PostItItem | null>(null);

  // Campos del formulario
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<PostItColor>('yellow');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('10:00');
  const [selectedReminders, setSelectedReminders] = useState<PostItReminder[]>([]);
  const [customDays, setCustomDays] = useState('');

  // Filtro por color
  const [selectedColorFilter, setSelectedColorFilter] = useState<PostItColor | 'all'>('all');

  // Sincronizar recordatorios con el centro de notificaciones al montar y ante cambios
  useEffect(() => {
    if (postIts && postIts.length > 0) {
      syncPostItReminders(postIts);
    }
  }, [postIts, syncPostItReminders]);

  // Abrir modal para crear
  const handleOpenCreate = () => {
    // Fecha por defecto: dentro de 1 mes (como en el ejemplo del usuario)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toISOString().split('T')[0];

    setTitle('');
    setContent('');
    setColor('yellow');
    setTargetDate(dateStr);
    setTargetTime('10:00');
    // Por defecto marcamos los 4 recordatorios del ejemplo: 20 días, 15 días, 1 día, 1 hora
    setSelectedReminders([
      { id: 'rem-20d', label: '20 días antes', offsetMinutes: 20 * 24 * 60 },
      { id: 'rem-15d', label: '15 días antes', offsetMinutes: 15 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
      { id: 'rem-1h', label: '1 hora antes', offsetMinutes: 60 },
    ]);
    setEditingPostIt(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (item: PostItItem) => {
    setEditingPostIt(item);
    setTitle(item.title);
    setContent(item.content);
    setColor(item.color);
    setTargetDate(item.targetDate);
    setTargetTime(item.targetTime || '10:00');
    setSelectedReminders(item.reminders || []);
    setIsModalOpen(true);
  };

  // Alternar recordatorio predefinido
  const togglePresetReminder = (preset: { label: string; offsetMinutes: number }) => {
    const exists = selectedReminders.some((r) => r.offsetMinutes === preset.offsetMinutes);
    if (exists) {
      setSelectedReminders(selectedReminders.filter((r) => r.offsetMinutes !== preset.offsetMinutes));
    } else {
      setSelectedReminders([
        ...selectedReminders,
        {
          id: `rem-${preset.offsetMinutes}-${Date.now()}`,
          label: preset.label,
          offsetMinutes: preset.offsetMinutes,
        },
      ]);
    }
  };

  // Añadir recordatorio personalizado de X días
  const handleAddCustomReminder = () => {
    const days = parseInt(customDays, 10);
    if (isNaN(days) || days <= 0) return;
    const offsetMinutes = days * 24 * 60;
    const label = `${days} día${days > 1 ? 's' : ''} antes`;

    if (!selectedReminders.some((r) => r.offsetMinutes === offsetMinutes)) {
      setSelectedReminders([
        ...selectedReminders,
        {
          id: `rem-custom-${days}d-${Date.now()}`,
          label,
          offsetMinutes,
        },
      ]);
    }
    setCustomDays('');
  };

  // Eliminar recordatorio de la lista
  const removeReminder = (id: string) => {
    setSelectedReminders(selectedReminders.filter((r) => r.id !== id));
  };

  // Guardar Post-it
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;

    if (editingPostIt) {
      const updatedList = postIts.map((p) =>
        p.id === editingPostIt.id
          ? {
              ...p,
              title: title.trim(),
              content: content.trim(),
              color,
              targetDate,
              targetTime,
              reminders: selectedReminders,
            }
          : p
      );
      onSavePostIts(updatedList);
      syncPostItReminders(updatedList);
    } else {
      const newPostIt: PostItItem = {
        id: `postit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        content: content.trim(),
        color,
        targetDate,
        targetTime,
        reminders: selectedReminders,
        createdAt: new Date().toISOString(),
        isPinned: false,
        isCompleted: false,
      };
      const updatedList = [newPostIt, ...postIts];
      onSavePostIts(updatedList);
      syncPostItReminders(updatedList);

      // Notificación inmediata al usuario
      addNotification({
        title: `Post-it creado: ${newPostIt.title}`,
        message: `Programadas ${selectedReminders.length} alertas automáticas para la fecha límite ${targetDate}.`,
        source: 'postit',
        relatedId: newPostIt.id,
        urgency: 'info',
      });
    }

    setIsModalOpen(false);
  };

  // Eliminar Post-it
  const handleDelete = (id: string) => {
    const previous = postIts;
    removeWithUndo(
      'Post-it eliminado junto con sus recordatorios.',
      () => onSavePostIts(postIts.filter((p) => p.id !== id)),
      () => onSavePostIts(previous)
    );
  };

  // Fijar / Desfijar
  const handleTogglePin = (id: string) => {
    const updated = postIts.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p));
    onSavePostIts(updated);
  };

  // Marcar como completado
  const handleToggleComplete = (id: string) => {
    const updated = postIts.map((p) => (p.id === id ? { ...p, isCompleted: !p.isCompleted } : p));
    onSavePostIts(updated);
  };

  // Filtrado y orden (los fijados primero)
  const filteredPostIts = postIts
    .filter((p) => selectedColorFilter === 'all' || p.color === selectedColorFilter)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });

  // Calcular días restantes para la fecha objetivo
  const getDaysRemainingText = (targetDateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)} d`;
    if (diffDays === 0) return 'Hoy es la fecha límite';
    if (diffDays === 1) return 'Mañana (1 día)';
    return `En ${diffDays} días`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F4F1F8] p-3 overflow-hidden">
      
      {/* Barra Superior del Mural */}
      <div className="shrink-0 bg-white border border-[#D8CFF0] rounded-sm p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-sm bg-[#FEF08A] text-[#713F12] border border-[#FDE047]">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#292929] flex items-center gap-2">
              <span>Mural de Post-its y Recordatorios Rápidos</span>
              <span className="px-2 py-0.5 rounded-full bg-[#8E0E75] text-white text-[11px] font-bold">
                {postIts.length}
              </span>
            </h2>
            <p className="text-[11px] text-[#4A4A4A]">
              Notas adhesivas para recordatorios que se notifican automáticamente según tus alertas de antelación.
            </p>
          </div>
        </div>

        {/* Filtro por Color y Botón Crear */}
        <div className="flex items-center gap-2">
          {/* Swatches de Filtro */}
          <div className="hidden sm:flex items-center gap-1 bg-[#F8F6FC] p-1 rounded-sm border border-[#D8CFF0]">
            <button
              type="button"
              onClick={() => setSelectedColorFilter('all')}
              className={`px-2 py-0.5 rounded-xs text-[11px] font-extrabold uppercase transition-all cursor-pointer ${
                selectedColorFilter === 'all'
                  ? 'bg-[#8E0E75] text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Todos
            </button>
            {(Object.keys(POSTIT_COLORS) as PostItColor[]).map((cKey) => {
              const cfg = POSTIT_COLORS[cKey];
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => setSelectedColorFilter(cKey)}
                  className={`w-5 h-5 rounded-xs ${cfg.bg} ${cfg.border} border transition-all cursor-pointer ${
                    selectedColorFilter === cKey ? 'ring-2 ring-[#8E0E75] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={cfg.name}
                />
              );
            })}
          </div>

          {/* Botón Crear Post-it */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Post-it</span>
          </button>
        </div>
      </div>

      {/* Rejilla de Post-its (Mural) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredPostIts.length === 0 ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-white border border-dashed border-[#D8CFF0] rounded-sm text-center">
            <div className="p-3 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200 mb-2">
              <StickyNote className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-extrabold text-[#292929]">No hay post-its en este mural</h3>
            <p className="text-xs text-[#4A4A4A] max-w-sm mt-1">
              Crea un post-it para dentro de 1 mes o unos días y añade recordatorios (ej. 20d, 15d, 1d y 1h antes) para que te alerten automáticamente.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Crear mi primer Post-it</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredPostIts.map((item) => {
              const cfg = POSTIT_COLORS[item.color] || POSTIT_COLORS.yellow;
              const daysRemaining = getDaysRemainingText(item.targetDate);

              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col justify-between rounded-sm border ${cfg.bg} ${cfg.border} p-3.5 shadow-xs hover:shadow-md transition-all select-none group min-h-[220px] ${
                    item.isCompleted ? 'opacity-65' : ''
                  }`}
                >
                  {/* Cinta adhesiva superior (Efecto visual de Post-it realista) */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/70 backdrop-blur-xs border border-black/10 rounded-xs shadow-2xs rotate-[-1deg]" />

                  {/* Cabecera del Post-it: Chincheta / Pin + Fecha Límite */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item.id)}
                        className={`p-1 rounded-xs transition-colors cursor-pointer ${
                          item.isPinned
                            ? 'text-[#8E0E75] bg-black/5'
                            : 'text-black/30 hover:text-black/70'
                        }`}
                        title={item.isPinned ? 'Desfijar post-it' : 'Fijar post-it arriba'}
                      >
                        <Pin className="h-3.5 w-3.5 fill-current" />
                      </button>

                      {/* Badge con tiempo restante */}
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-xs ${cfg.badge}`}>
                        {daysRemaining}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className={`font-black text-xs leading-tight mb-1.5 ${cfg.text} ${item.isCompleted ? 'line-through' : ''}`}>
                      {item.title}
                    </h3>

                    {/* Contenido / Nota */}
                    <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${cfg.text} opacity-90`}>
                      {item.content}
                    </p>
                  </div>

                  {/* Bloque Inferior: Fecha objetivo + Recordatorios configurados + Acciones */}
                  <div className="mt-3 pt-2 border-t border-black/10 space-y-2">
                    
                    {/* Fecha y hora objetivo */}
                    <div className="flex items-center justify-between text-[11px] font-semibold opacity-75">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.targetDate.split('-').reverse().join('/')}</span>
                      </div>
                      {item.targetTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.targetTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Píldoras de Recordatorios Activos */}
                    {item.reminders && item.reminders.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.reminders.map((rem) => (
                          <span
                            key={rem.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-white/80 border border-black/10 text-[11px] font-bold text-[#292929]"
                            title="Alerta automática en panel de notificaciones"
                          >
                            <Bell className="h-2.5 w-2.5 text-[#8E0E75]" />
                            <span>{rem.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Barra de Herramientas de Tarjeta */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase transition-colors cursor-pointer ${
                          item.isCompleted
                            ? 'text-emerald-700 hover:text-emerald-900'
                            : 'text-slate-600 hover:text-[#8E0E75]'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                        <span>{item.isCompleted ? 'Hecho' : 'Completar'}</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded-xs hover:bg-black/10 text-[#292929] transition-colors cursor-pointer"
                          title="Editar post-it"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded-xs hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                          title="Eliminar post-it"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación / Edición de Post-it */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-sm border border-[#D8CFF0] shadow-2xl overflow-hidden flex flex-col">
            
            {/* Cabecera del modal */}
            <div className="px-4 py-2.5 bg-[#8E0E75] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {editingPostIt ? 'Editar Post-it' : 'Nuevo Post-it y Recordatorios'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xs hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-4 space-y-3">
              
              {/* Título del Post-it */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Título o Asunto del Recordatorio *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. Entrega de informe mensual / Recordatorio cita médica"
                  className="w-full px-2.5 py-1.5 text-xs rounded-sm border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-none"
                />
              </div>

              {/* Contenido / Nota */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Contenido de la Nota adhesiva
                </label>
                <textarea
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe aquí los detalles del recordatorio..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-sm border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-none resize-none"
                />
              </div>

              {/* Color del Post-it */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Color del Post-it
                </label>
                <div className="flex items-center gap-2">
                  {(Object.keys(POSTIT_COLORS) as PostItColor[]).map((cKey) => {
                    const cfg = POSTIT_COLORS[cKey];
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setColor(cKey)}
                        className={`flex-1 py-1 px-1.5 rounded-xs border text-[11px] font-bold text-center cursor-pointer transition-all ${cfg.bg} ${cfg.border} ${
                          color === cKey ? 'ring-2 ring-[#8E0E75] scale-105 shadow-xs' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {cfg.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fecha y Hora Objetivo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                    Fecha Objetivo / Límite *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-sm border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                    Hora Estimada
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-sm border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-none"
                  />
                </div>
              </div>

              {/* Configuración de Notificaciones Automáticas */}
              <div className="pt-2 border-t border-[#D8CFF0]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-[#8E0E75]" />
                    <span>Notificaciones Automáticas Programadas</span>
                  </label>
                  <span className="text-[11px] text-[#8E0E75] font-bold">
                    {selectedReminders.length} seleccionada(s)
                  </span>
                </div>
                <p className="text-[11px] text-[#4A4A4A] mb-2">
                  Selecciona cuándo quieres que te lleguen las notificaciones en el panel lateral antes de la fecha límite:
                </p>

                {/* Checkboxes de recordatorios predefinidos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PRESET_REMINDERS.map((preset) => {
                    const isChecked = selectedReminders.some((r) => r.offsetMinutes === preset.offsetMinutes);
                    return (
                      <button
                        key={preset.offsetMinutes}
                        type="button"
                        onClick={() => togglePresetReminder(preset)}
                        className={`px-2 py-1.5 rounded-xs border text-[11px] font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#8E0E75] text-white border-[#8E0E75]'
                            : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0] hover:border-[#8E0E75]'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {isChecked && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Añadir personalizado */}
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="X días antes..."
                    className="w-28 px-2 py-1 text-xs rounded-xs border border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomReminder}
                    className="px-2.5 py-1 rounded-xs bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white border border-[#D8CFF0] text-[11px] font-extrabold uppercase transition-all cursor-pointer"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-[#D8CFF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-sm border border-[#D8CFF0] text-[#292929] text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  {editingPostIt ? 'Guardar Cambios' : 'Crear Post-it'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
