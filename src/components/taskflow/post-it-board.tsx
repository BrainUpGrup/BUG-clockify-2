'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Move,
  MoveDiagonal2,
  Grid,
  Layers,
  Palette,
  LayoutGrid
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
import { AppCalendar } from '@/components/ui/app-calendar';

interface PostItBoardProps {
  postIts: PostItItem[];
  onSavePostIts: (updated: PostItItem[]) => void;
  onOpenCreateModal?: () => void;
}

const DEFAULT_WIDTH = 290;
const DEFAULT_HEIGHT = 250;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

interface ResizeState {
  id: string;
  startX: number;
  startY: number;
  initialW: number;
  initialH: number;
}

export function PostItBoard({
  postIts,
  onSavePostIts,
}: PostItBoardProps) {
  const { syncPostItReminders, addNotification } = useNotifications();

  // Copia local sincronizada para manipulación fluida a 60fps
  const [localPostIts, setLocalPostIts] = useState<PostItItem[]>(postIts);

  useEffect(() => {
    setLocalPostIts(postIts);
  }, [postIts]);

  // Modo de visualización: 'free' (Pizarra / Tabla Libre) o 'grid' (Cuadrícula Clásica)
  const [boardMode, setBoardMode] = useState<'free' | 'grid'>('free');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('bug_postit_board_mode');
      if (savedMode === 'grid' || savedMode === 'free') {
        setBoardMode(savedMode);
      }
    }
  }, []);

  const handleChangeBoardMode = (mode: 'free' | 'grid') => {
    setBoardMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bug_postit_board_mode', mode);
    }
  };

  // Estados interactivos de Arrastre y Redimensión libre
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [highestZ, setHighestZ] = useState<number>(() => {
    const maxZ = postIts.reduce((max, p) => Math.max(max, p.zIndex || 10), 10);
    return maxZ + 1;
  });

  // Selector rápido de color desplegable por post-it
  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null);

  // Estados para modal de creación / edición
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

  // Cerrar modal al pulsar Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Obtener coordenadas seguras para cada nota
  const getCoords = (item: PostItItem, index: number) => {
    if (typeof item.posX === 'number' && typeof item.posY === 'number') {
      return { x: item.posX, y: item.posY };
    }
    const colWidth = 320;
    const rowHeight = 280;
    const cols = 4;
    return {
      x: 24 + (index % cols) * colWidth,
      y: 24 + Math.floor(index / cols) * rowHeight,
    };
  };

  // Obtener dimensiones seguras para cada nota
  const getDimensions = (item: PostItItem) => {
    return {
      w: item.width || DEFAULT_WIDTH,
      h: item.height || DEFAULT_HEIGHT,
    };
  };

  // Iniciar Arrastre Libre de Post-it
  const handleStartDrag = (
    e: React.PointerEvent,
    item: PostItItem,
    currentX: number,
    currentY: number
  ) => {
    if (boardMode !== 'free') return;
    // Ignorar si se hace clic en botones, enlaces o el tirador de redimensión
    if ((e.target as HTMLElement).closest('button, input, textarea, a, .no-drag, .resize-handle')) {
      return;
    }
    e.preventDefault();

    const newZ = highestZ + 1;
    setHighestZ(newZ);

    setDragging({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    });

    setLocalPostIts((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, zIndex: newZ } : p))
    );
  };

  // Iniciar Redimensión Libre de Post-it desde la esquina inferior derecha
  const handleStartResize = (
    e: React.PointerEvent,
    item: PostItItem,
    currentW: number,
    currentH: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const newZ = highestZ + 1;
    setHighestZ(newZ);

    setResizing({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialW: currentW,
      initialH: currentH,
    });

    setLocalPostIts((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, zIndex: newZ } : p))
    );
  };

  // Manejo global de Pointer Move y Pointer Up
  useEffect(() => {
    if (!dragging && !resizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const newX = Math.max(12, dragging.initialX + dx);
        const newY = Math.max(12, dragging.initialY + dy);

        setLocalPostIts((prev) =>
          prev.map((p) => (p.id === dragging.id ? { ...p, posX: newX, posY: newY } : p))
        );
      } else if (resizing) {
        const dw = e.clientX - resizing.startX;
        const dh = e.clientY - resizing.startY;
        const newW = Math.min(650, Math.max(220, resizing.initialW + dw));
        const newH = Math.min(650, Math.max(170, resizing.initialH + dh));

        setLocalPostIts((prev) =>
          prev.map((p) => (p.id === resizing.id ? { ...p, width: newW, height: newH } : p))
        );
      }
    };

    const handlePointerUp = () => {
      if (dragging || resizing) {
        onSavePostIts(localPostIts);
        setDragging(null);
        setResizing(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, resizing, localPostIts, onSavePostIts]);

  // Cambiar tamaño con píldoras predefinidas (S / M / L)
  const handleSetQuickSize = (id: string, preset: 'small' | 'medium' | 'large') => {
    const sizeMap = {
      small: { w: 240, h: 210 },
      medium: { w: 290, h: 250 },
      large: { w: 380, h: 320 },
    };
    const target = sizeMap[preset];
    const updated = localPostIts.map((p) =>
      p.id === id ? { ...p, width: target.w, height: target.h, sizePreset: preset } : p
    );
    setLocalPostIts(updated);
    onSavePostIts(updated);
  };

  // Cambiar color directamente desde la nota
  const handleQuickChangeColor = (id: string, newColor: PostItColor) => {
    const updated = localPostIts.map((p) => (p.id === id ? { ...p, color: newColor } : p));
    setLocalPostIts(updated);
    onSavePostIts(updated);
    setColorPickerNoteId(null);
  };

  // Auto-Alinear Pizarra: organiza en cuadrícula limpia con un clic
  const handleAutoAlign = () => {
    const colWidth = 320;
    const rowHeight = 280;
    const cols = 4;
    const updated = localPostIts.map((p, idx) => ({
      ...p,
      posX: 24 + (idx % cols) * colWidth,
      posY: 24 + Math.floor(idx / cols) * rowHeight,
    }));
    setLocalPostIts(updated);
    onSavePostIts(updated);
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toISOString().split('T')[0];

    setTitle('');
    setContent('');
    setColor('yellow');
    setTargetDate(dateStr);
    setTargetTime('10:00');
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
      const updatedList = localPostIts.map((p) =>
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
      setLocalPostIts(updatedList);
      onSavePostIts(updatedList);
      syncPostItReminders(updatedList);
    } else {
      // Posición libre por defecto escalonada
      const idx = localPostIts.length;
      const colWidth = 320;
      const rowHeight = 280;
      const cols = 4;
      const newX = 24 + (idx % cols) * colWidth;
      const newY = 24 + Math.floor(idx / cols) * rowHeight;

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
        posX: newX,
        posY: newY,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        zIndex: highestZ + 1,
      };
      setHighestZ((prev) => prev + 1);

      const updatedList = [newPostIt, ...localPostIts];
      setLocalPostIts(updatedList);
      onSavePostIts(updatedList);
      syncPostItReminders(updatedList);

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
    const previous = localPostIts;
    removeWithUndo(
      'Post-it eliminado junto con sus recordatorios.',
      () => {
        const next = localPostIts.filter((p) => p.id !== id);
        setLocalPostIts(next);
        onSavePostIts(next);
      },
      () => {
        setLocalPostIts(previous);
        onSavePostIts(previous);
      }
    );
  };

  // Fijar / Desfijar
  const handleTogglePin = (id: string) => {
    const updated = localPostIts.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p));
    setLocalPostIts(updated);
    onSavePostIts(updated);
  };

  // Marcar como completado
  const handleToggleComplete = (id: string) => {
    const updated = localPostIts.map((p) => (p.id === id ? { ...p, isCompleted: !p.isCompleted } : p));
    setLocalPostIts(updated);
    onSavePostIts(updated);
  };

  // Filtrado
  const filteredPostIts = localPostIts
    .filter((p) => selectedColorFilter === 'all' || p.color === selectedColorFilter)
    .sort((a, b) => {
      if (boardMode === 'grid') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return (a.zIndex || 10) - (b.zIndex || 10);
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#F4F1F8] p-3 overflow-hidden select-none">
      
      {/* Barra Superior Modular del Mural */}
      <div className="shrink-0 bg-white border border-[#D8CFF0] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FEF08A] text-[#713F12] border border-[#FACC15]">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#292929] flex items-center gap-2">
              <span>Pizarra Modular de Post-its</span>
              <span className="px-2 py-0.5 rounded-full bg-[#8E0E75] text-white text-[11px] font-bold">
                {localPostIts.length}
              </span>
            </h2>
            <p className="text-[11px] text-[#4A4A4A]">
              Pizarra interactiva libre: arrastra notas por la pantalla, cambia su tamaño y personaliza colores a tu gusto.
            </p>
          </div>
        </div>

        {/* Controles Modulares: Modo Libre / Cuadrícula, Auto-Alinear, Filtro de Color y Nuevo */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Selector de Modo: Pizarra Libre vs Cuadrícula */}
          <div className="flex items-center bg-[#F8F6FC] p-1 rounded-xl border border-[#D8CFF0]">
            <button
              type="button"
              onClick={() => handleChangeBoardMode('free')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                boardMode === 'free'
                  ? 'bg-[#8E0E75] text-white shadow-2xs'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
              title="Mover y redimensionar post-its libremente por la pantalla"
            >
              <Move className="h-3.5 w-3.5" />
              <span>Pizarra Libre</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeBoardMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                boardMode === 'grid'
                  ? 'bg-[#8E0E75] text-white shadow-2xs'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
              title="Organizar notas en cuadrícula uniforme"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cuadrícula</span>
            </button>
          </div>

          {/* Botón Auto-Alinear (solo visible en modo libre) */}
          {boardMode === 'free' && (
            <button
              type="button"
              onClick={handleAutoAlign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer shadow-2xs"
              title="Auto-organizar todas las notas en posiciones ordenadas"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#8E0E75]" />
              <span className="hidden sm:inline">Auto-Alinear</span>
            </button>
          )}

          {/* Swatches de Filtro por Color */}
          <div className="hidden md:flex items-center gap-1 bg-[#F8F6FC] p-1 rounded-xl border border-[#D8CFF0]">
            <button
              type="button"
              onClick={() => setSelectedColorFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase transition-all cursor-pointer ${
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
                  className={`w-5 h-5 rounded-md ${cfg.bg} ${cfg.border} border-2 transition-all cursor-pointer ${
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[11px] font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Post-it</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO: PIZARRA LIBRE O CUADRÍCULA */}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-[#D8CFF0] bg-white shadow-xs flex flex-col">
        {filteredPostIts.length === 0 ? (
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center bg-[#F8F6FC]">
            <div className="p-3.5 rounded-2xl bg-[#FEF08A] text-[#713F12] border border-[#FACC15] mb-2 shadow-xs">
              <StickyNote className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-black text-[#292929] uppercase tracking-tight">No hay notas en esta vista</h3>
            <p className="text-xs text-[#4A4A4A] max-w-sm mt-1">
              Crea tu primer post-it interactivo con recordatorios programados (ej. 20d, 15d, 1d y 1h antes).
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8E0E75] text-white text-xs font-black uppercase tracking-wider hover:bg-[#700B5C] cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Crear mi primer Post-it</span>
            </button>
          </div>
        ) : boardMode === 'free' ? (
          /* MODO 1: PIZARRA LIBRE INTERACTIVA (DRAG & RESIZE LIBRE CON FONDO DE CUADRÍCULA) */
          <div 
            className="relative flex-1 w-full h-full min-h-[850px] overflow-auto"
            style={{
              backgroundColor: '#F8F6FC',
              backgroundImage: 'radial-gradient(#D0C4EA 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          >
            {filteredPostIts.map((item, index) => {
              const coords = getCoords(item, index);
              const dims = getDimensions(item);
              const cfg = POSTIT_COLORS[item.color] || POSTIT_COLORS.yellow;
              const daysRemaining = getDaysRemainingText(item.targetDate);
              const isColorMenuOpen = colorPickerNoteId === item.id;

              return (
                <div
                  key={item.id}
                  onPointerDown={(e) => handleStartDrag(e, item, coords.x, coords.y)}
                  style={{
                    position: 'absolute',
                    left: `${coords.x}px`,
                    top: `${coords.y}px`,
                    width: `${dims.w}px`,
                    height: `${dims.h}px`,
                    zIndex: item.zIndex || 10,
                  }}
                  className={`group flex flex-col justify-between rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-3.5 shadow-md hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing ${
                    item.isCompleted ? 'opacity-65' : ''
                  }`}
                >
                  {/* Cinta Adhesiva Superior Realista */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/70 backdrop-blur-xs border border-black/10 rounded-xs shadow-2xs rotate-[-1deg] pointer-events-none" />

                  {/* Cabecera del Post-It: Pin, Drag, Selector de Tamaño y Alertas */}
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-1 mb-2 pt-0.5">
                      <div className="flex items-center gap-1.5 no-drag">
                        {/* Pin / Chincheta */}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(item.id)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            item.isPinned ? 'text-[#8E0E75] bg-black/10' : 'text-black/35 hover:text-black/80'
                          }`}
                          title={item.isPinned ? 'Desfijar' : 'Fijar nota'}
                        >
                          <Pin className="h-3.5 w-3.5 fill-current" />
                        </button>

                        {/* Píldoras Rápidas de Tamaño: S / M / L */}
                        <div className="hidden sm:inline-flex items-center gap-0.5 bg-black/5 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleSetQuickSize(item.id, 'small')}
                            className="px-1 py-0.5 rounded-xs text-[9px] font-black uppercase text-black/60 hover:text-black hover:bg-black/10 cursor-pointer"
                            title="Tamaño Compacto (240x210)"
                          >
                            S
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuickSize(item.id, 'medium')}
                            className="px-1 py-0.5 rounded-xs text-[9px] font-black uppercase text-black/60 hover:text-black hover:bg-black/10 cursor-pointer"
                            title="Tamaño Normal (290x250)"
                          >
                            M
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuickSize(item.id, 'large')}
                            className="px-1 py-0.5 rounded-xs text-[9px] font-black uppercase text-black/60 hover:text-black hover:bg-black/10 cursor-pointer"
                            title="Tamaño Amplio (380x320)"
                          >
                            L
                          </button>
                        </div>

                        {/* Paleta Rápida de Cambio de Color */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setColorPickerNoteId(isColorMenuOpen ? null : item.id)}
                            className="p-1 rounded-lg text-black/40 hover:text-black/80 hover:bg-black/5 cursor-pointer"
                            title="Cambiar color del post-it"
                          >
                            <Palette className="h-3 w-3" />
                          </button>

                          {isColorMenuOpen && (
                            <div className="absolute left-0 top-full mt-1 z-50 flex items-center gap-1 p-1 bg-white rounded-xl shadow-xl border border-[#D8CFF0] animate-in zoom-in-95">
                              {(Object.keys(POSTIT_COLORS) as PostItColor[]).map((cKey) => {
                                const cCfg = POSTIT_COLORS[cKey];
                                return (
                                  <button
                                    key={cKey}
                                    type="button"
                                    onClick={() => handleQuickChangeColor(item.id, cKey)}
                                    className={`w-4 h-4 rounded-full ${cCfg.bg} ${cCfg.border} border-2 hover:scale-125 transition-transform cursor-pointer`}
                                    title={cCfg.name}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Badge con tiempo restante */}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badge}`}>
                        {daysRemaining}
                      </span>
                    </div>

                    {/* Título de la Nota */}
                    <h3 className={`font-black text-xs leading-tight mb-1.5 ${cfg.text} ${item.isCompleted ? 'line-through' : ''}`}>
                      {item.title}
                    </h3>
                  </div>

                  {/* Cuerpo / Texto de la Nota (con scroll interno si es extenso) */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${cfg.text} opacity-95 font-medium`}>
                      {item.content}
                    </p>
                  </div>

                  {/* Bloque Inferior: Fecha, Recordatorios y Barra de Acciones */}
                  <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1.5 shrink-0">
                    {/* Fecha y hora */}
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-80">
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

                    {/* Alertas programadas */}
                    {item.reminders && item.reminders.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                        {item.reminders.map((rem) => (
                          <span
                            key={rem.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/80 border border-black/10 text-[9px] font-bold text-[#292929]"
                            title="Alerta automática en panel"
                          >
                            <Bell className="h-2.5 w-2.5 text-[#8E0E75]" />
                            <span>{rem.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center justify-between pt-1 no-drag">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item.id)}
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase transition-colors cursor-pointer ${
                          item.isCompleted ? 'text-emerald-800' : 'text-black/60 hover:text-[#8E0E75]'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                        <span>{item.isCompleted ? 'Hecho' : 'Completar'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded-md hover:bg-black/10 text-black/60 hover:text-black cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded-md hover:bg-rose-100 text-black/60 hover:text-rose-700 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tirador de Redimensión en Esquina Inferior Derecha */}
                  <div
                    onPointerDown={(e) => handleStartResize(e, item, dims.w, dims.h)}
                    className="resize-handle absolute bottom-1 right-1 p-1 text-black/40 hover:text-black/90 cursor-se-resize select-none no-drag"
                    title="Arrastra para hacer la nota más grande o más pequeña"
                  >
                    <MoveDiagonal2 className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO 2: CUADRÍCULA ORDENADA */
          <div className="flex-1 p-4 overflow-y-auto bg-[#F8F6FC]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPostIts.map((item) => {
                const cfg = POSTIT_COLORS[item.color] || POSTIT_COLORS.yellow;
                const daysRemaining = getDaysRemainingText(item.targetDate);
                const isColorMenuOpen = colorPickerNoteId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-3.5 shadow-md hover:shadow-lg transition-all min-h-[240px] ${
                      item.isCompleted ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Cinta adhesiva superior */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/70 backdrop-blur-xs border border-black/10 rounded-xs shadow-2xs rotate-[-1deg]" />

                    {/* Cabecera */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item.id)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              item.isPinned ? 'text-[#8E0E75] bg-black/10' : 'text-black/35 hover:text-black/80'
                            }`}
                            title={item.isPinned ? 'Desfijar' : 'Fijar nota'}
                          >
                            <Pin className="h-3.5 w-3.5 fill-current" />
                          </button>

                          {/* Paleta de Color */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setColorPickerNoteId(isColorMenuOpen ? null : item.id)}
                              className="p-1 rounded-lg text-black/40 hover:text-black/80 hover:bg-black/5 cursor-pointer"
                              title="Cambiar color del post-it"
                            >
                              <Palette className="h-3 w-3" />
                            </button>

                            {isColorMenuOpen && (
                              <div className="absolute left-0 top-full mt-1 z-50 flex items-center gap-1 p-1 bg-white rounded-xl shadow-xl border border-[#D8CFF0] animate-in zoom-in-95">
                                {(Object.keys(POSTIT_COLORS) as PostItColor[]).map((cKey) => {
                                  const cCfg = POSTIT_COLORS[cKey];
                                  return (
                                    <button
                                      key={cKey}
                                      type="button"
                                      onClick={() => handleQuickChangeColor(item.id, cKey)}
                                      className={`w-4 h-4 rounded-full ${cCfg.bg} ${cCfg.border} border-2 hover:scale-125 transition-transform cursor-pointer`}
                                      title={cCfg.name}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badge}`}>
                          {daysRemaining}
                        </span>
                      </div>

                      <h3 className={`font-black text-xs leading-tight mb-1.5 ${cfg.text} ${item.isCompleted ? 'line-through' : ''}`}>
                        {item.title}
                      </h3>

                      <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${cfg.text} opacity-95 font-medium`}>
                        {item.content}
                      </p>
                    </div>

                    {/* Bloque Inferior */}
                    <div className="mt-3 pt-2 border-t border-black/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold opacity-80">
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

                      {item.reminders && item.reminders.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.reminders.map((rem) => (
                            <span
                              key={rem.id}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/80 border border-black/10 text-[9px] font-bold text-[#292929]"
                            >
                              <Bell className="h-2.5 w-2.5 text-[#8E0E75]" />
                              <span>{rem.label}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(item.id)}
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase transition-colors cursor-pointer ${
                            item.isCompleted ? 'text-emerald-800' : 'text-black/60 hover:text-[#8E0E75]'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          <span>{item.isCompleted ? 'Hecho' : 'Completar'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded-md hover:bg-black/10 text-black/60 hover:text-black cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-md hover:bg-rose-100 text-black/60 hover:text-rose-700 cursor-pointer"
                            title="Eliminar"
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
          </div>
        )}
      </div>

      {/* Modal de Creación / Edición de Post-it (Zero-Scroll & 2 Columnas) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-[#D8CFF0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Cabecera del modal */}
            <div className="px-5 py-3.5 bg-[#191654] bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 border border-white/30 text-white">
                  <StickyNote className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    {editingPostIt ? 'Editar Post-it' : 'Nuevo Post-it y Recordatorios'}
                  </h3>
                  <p className="text-[10px] text-white/80">
                    Configura la fecha pactada y las alertas automáticas de antelación
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulario 2 Columnas Compacto (DM-15 Zero-Scroll) */}
            <form onSubmit={handleSave} className="p-4 flex flex-col overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Columna Izquierda: Datos del Post-It */}
                <div className="md:col-span-6 space-y-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                      Título o Asunto del Recordatorio *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="ej. Entrega de informe mensual"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] focus:border-[#8E0E75] focus:outline-hidden font-bold text-[#292929]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                      Contenido de la Nota adhesiva
                    </label>
                    <textarea
                      rows={3}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Escribe aquí los detalles del recordatorio..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] focus:border-[#8E0E75] focus:outline-hidden resize-none text-[#292929]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                      Color del Post-it
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(POSTIT_COLORS) as PostItColor[]).map((cKey) => {
                        const cfg = POSTIT_COLORS[cKey];
                        return (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => setColor(cKey)}
                            className={`py-1.5 px-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-tight text-center cursor-pointer transition-all ${cfg.bg} ${cfg.border} ${
                              color === cKey ? 'ring-2 ring-[#8E0E75] scale-102 shadow-xs' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            {cfg.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fecha y Hora con AppCalendar in-app */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                        Fecha Límite *
                      </label>
                      <AppCalendar
                        value={targetDate}
                        onChange={setTargetDate}
                        className="w-full"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] focus:border-[#8E0E75] focus:outline-hidden font-bold text-[#292929]"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Recordatorios y Alertas */}
                <div className="md:col-span-6 space-y-3 bg-[#F8F6FC] p-3.5 rounded-2xl border border-[#D8CFF0]">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#191654]">
                        Alertas Automáticas de Antelación
                      </label>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {selectedReminders.length} activas
                      </span>
                    </div>
                    <p className="text-[10px] text-[#4A4A4A] leading-tight">
                      El sistema te enviará notificaciones al panel de control cuando falte este tiempo.
                    </p>
                  </div>

                  {/* Botones de Recordatorios Predefinidos */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Opciones recomendadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_REMINDERS.map((preset) => {
                        const isSelected = selectedReminders.some((r) => r.offsetMinutes === preset.offsetMinutes);
                        return (
                          <button
                            key={preset.offsetMinutes}
                            type="button"
                            onClick={() => togglePresetReminder(preset)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                                : 'bg-white text-slate-700 border-[#D8CFF0] hover:border-[#8E0E75]/50'
                            }`}
                          >
                            <Bell className="h-2.5 w-2.5" />
                            <span>{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Añadir Recordatorio Personalizado */}
                  <div className="pt-2 border-t border-[#D8CFF0]/60 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      O añade días específicos:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="ej. 30"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomReminder();
                          }
                        }}
                        className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-[#D8CFF0] bg-white text-[#292929] font-bold focus:border-[#8E0E75] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomReminder}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#D8CFF0] hover:border-[#8E0E75] text-[#8E0E75] text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        + Añadir días antes
                      </button>
                    </div>
                  </div>

                  {/* Resumen de Recordatorios Programados */}
                  <div className="pt-2 border-t border-[#D8CFF0]/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Alertas programadas para este post-it:
                    </span>
                    {selectedReminders.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">
                        Sin alertas. Selecciona al menos una opción para recibir avisos.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {selectedReminders.map((rem) => (
                          <span
                            key={rem.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-[#8E0E75] border border-purple-200 text-[10px] font-black"
                          >
                            <span>{rem.label}</span>
                            <button
                              type="button"
                              onClick={() => removeReminder(rem.id)}
                              className="hover:text-red-600 cursor-pointer"
                              title="Quitar recordatorio"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción del Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8CFF0] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
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
