'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useTimer } from '@/context/timer-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';
import { Company, Profile } from '@/types/database';
import { canUserAccessHubApp } from '@/lib/hub-apps';
import { removeWithUndo, flagAccessDenied } from '@/lib/feedback';
import { AppSelect } from '@/components/ui/app-select';
import { 
  TaskFlowItem, 
  TaskPriority, 
  TaskStatus, 
  TaskList,
  DEFAULT_TASK_LISTS,
  downloadAllEventsIcs 
} from '@/lib/calendar-export';
import { NativeCalendar } from '@/components/taskflow/native-calendar';
import { PostItBoard } from '@/components/taskflow/post-it-board';
import { TaskListView } from '@/components/taskflow/task-list-view';
import { TaskModal } from '@/components/taskflow/task-modal';
import { PostItItem } from '@/types/postit';
import { useNotifications } from '@/context/notifications-context';
import { 
  CheckSquare, 
  Plus, 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Building2, 
  Tag, 
  Trash2, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  Sparkles,
  Filter,
  Search,
  Users,
  Download,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  List,
  RotateCw,
  FolderPlus,
  Layers,
  StickyNote
} from 'lucide-react';

import { 
  STORAGE_KEY_ITEMS_V2, 
  SEED_TASKFLOW_ITEMS, 
  getStoredTaskFlowItems 
} from '@/lib/taskflow-data';
const STORAGE_KEY_POSTITS = 'bug_taskflow_postits_v1';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getFutureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

const SEED_POST_ITS: PostItItem[] = [
  {
    id: 'postit-seed-1',
    title: 'Revisión cuotas y contratos anuales clientes',
    content: 'Revisar la renovación de contratos con los clientes clave de la agencia antes del nuevo ciclo. Preparar propuesta de actualización de tarifas.',
    targetDate: getFutureDateString(30),
    targetTime: '10:00',
    color: 'yellow',
    isPinned: true,
    isCompleted: false,
    reminders: [
      { id: 'rem-20d', label: '20 días antes', offsetMinutes: 20 * 24 * 60 },
      { id: 'rem-15d', label: '15 días antes', offsetMinutes: 15 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
      { id: 'rem-1h', label: '1 hora antes', offsetMinutes: 60 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'postit-seed-2',
    title: 'Cierre mensual de horas y facturación',
    content: 'Confirmar con los empleados que todas las horas en Brain Up Clockify estén imputadas a proyectos antes del día 30.',
    targetDate: getFutureDateString(14),
    targetTime: '18:00',
    color: 'pink',
    isPinned: true,
    isCompleted: false,
    reminders: [
      { id: 'rem-7d', label: '7 días antes (1 sem)', offsetMinutes: 7 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'postit-seed-3',
    title: 'Sesión de brainstorming trimestral',
    content: 'Definir nuevas plantillas creativas para redes de clientes del sector restauración y automoción.',
    targetDate: getFutureDateString(21),
    targetTime: '11:00',
    color: 'green',
    isPinned: false,
    isCompleted: false,
    reminders: [
      { id: 'rem-3d', label: '3 días antes', offsetMinutes: 3 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
    ],
    createdAt: new Date().toISOString(),
  },
];



function TaskFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolParam = searchParams.get('tool') || 'taskflow';
  const { user, isLoading: authLoading } = useAuth();
  
  // Timer Context para integración directa con Clockify (iniciar temporizador desde tarea)
  const { startTimerWithEntry } = useTimer();

  // Estados principales de TaskFlow
  const [items, setItems] = useState<TaskFlowItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Hook central de notificaciones interconectadas
  const { syncPostItReminders } = useNotifications();

  // Modos de visualización: Calendario L-V, Mural de Post-its y Lista
  const [viewMode, setViewMode] = useState<'calendar' | 'postits' | 'list'>('calendar');

  // Estado para Plegar / Desplegar Secciones 1 y 2 (Modo Portátil Amplio para ganar altura)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bug_taskflow_header_collapsed') === 'true';
    }
    return false;
  });

  const toggleHeaderCollapse = () => {
    setIsHeaderCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('bug_taskflow_header_collapsed', String(next));
      }
      return next;
    });
  };

  // Pastilla morada deslizante para el conmutador de vistas
  const viewSwitcherRef = useRef<HTMLDivElement>(null);
  const [viewPill, setViewPill] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const [hoveredView, setHoveredView] = useState<string | null>(null);

  const targetView = hoveredView || viewMode;

  useEffect(() => {
    const updateViewPill = () => {
      if (!viewSwitcherRef.current) return;
      const targetEl = viewSwitcherRef.current.querySelector(`[data-view-tab="${targetView}"]`) as HTMLElement;
      if (targetEl) {
        setViewPill({
          left: targetEl.offsetLeft,
          width: targetEl.offsetWidth,
          opacity: 1,
        });
      }
    };
    updateViewPill();
    window.addEventListener('resize', updateViewPill);
    return () => window.removeEventListener('resize', updateViewPill);
    // user/authLoading: la barra no existe mientras se muestra la pantalla de carga,
    // así que hay que volver a medir cuando aparece (si no, la pestaña activa queda en blanco)
  }, [targetView, viewMode, user, authLoading]);

  // Estado de Post-its / Recordatorios
  const [postIts, setPostIts] = useState<PostItItem[]>([]);

  // Sincronizar tab desde URL si aplica
  useEffect(() => {
    if (searchParams.get('tab') === 'postits') {
      setViewMode('postits');
    }
  }, [searchParams]);

  // Filtros (Prioridad eliminada por requerimiento)
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'shared' | 'meetings'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#8E0E75');

  // Listas de tareas con colores asignados
  const [taskLists, setTaskLists] = useState<TaskList[]>(DEFAULT_TASK_LISTS);

  // Modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskFlowItem | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(getTodayString());

  // Notificación Toast interactiva
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'alert' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Redirigir a login si no hay sesión, o al hub si el usuario no tiene permisos para TaskFlow
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'employee' && !canUserAccessHubApp(user, 'taskflow')) {
        flagAccessDenied('No tienes acceso a TaskFlow. Pídeselo a tu coordinadora.');
        router.replace('/hub');
      }
    }
  }, [user, authLoading, router]);

  // Cargar listas de tareas personalizadas
  useEffect(() => {
    try {
      const storedLists = localStorage.getItem('bug_taskflow_lists_v1');
      if (storedLists) {
        setTaskLists(JSON.parse(storedLists));
      } else {
        localStorage.setItem('bug_taskflow_lists_v1', JSON.stringify(DEFAULT_TASK_LISTS));
      }
    } catch {}
  }, []);

  const handleCreateList = (newList: TaskList) => {
    setTaskLists((prev) => {
      const updated = [...prev, newList];
      try {
        localStorage.setItem('bug_taskflow_lists_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Lista "${newList.name}" creada con éxito`, 'success');
  };

  // Cargar elementos desde localStorage o seed + Rutina de auto-desplazamiento
  useEffect(() => {
    try {
      const today = getTodayString();
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS_V2);
      if (stored) {
        const parsed = JSON.parse(stored);
        let currentItems: TaskFlowItem[] = [];
        if (Array.isArray(parsed) && parsed.length < 10) {
          currentItems = SEED_TASKFLOW_ITEMS;
        } else {
          currentItems = parsed;
        }

        // Auto-desplazamiento: si una tarea tiene autoReschedule activado y su fecha es anterior a hoy, se desplaza automáticamente a hoy
        let autoRolloverCount = 0;
        const rolledItems = currentItems.map((it) => {
          if (it.status !== 'done' && it.autoReschedule && it.date < today) {
            autoRolloverCount++;
            return {
              ...it,
              date: today,
            };
          }
          return it;
        });

        setItems(rolledItems);
        localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(rolledItems));

        if (autoRolloverCount > 0) {
          setTimeout(() => {
            showToast(`Se han desplazado ${autoRolloverCount} tareas pendientes automáticamente al día de hoy como recordatorio activo`, 'info');
          }, 1200);
        }
      } else {
        setItems(SEED_TASKFLOW_ITEMS);
        localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(SEED_TASKFLOW_ITEMS));
      }
    } catch (e) {
      console.warn('Error loading TaskFlow items:', e);
      setItems(SEED_TASKFLOW_ITEMS);
    }
  }, []);

  // Guardar elementos en localStorage
  const saveItems = (updated: TaskFlowItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving TaskFlow items:', e);
    }
  };

  // Reprogramación manual instantánea de todas las tareas vencidas a hoy (+1 día)
  const handleRescheduleOverdue = () => {
    const today = getTodayString();
    let count = 0;
    const updated = items.map((it) => {
      if (it.status !== 'done' && it.date < today) {
        count++;
        return {
          ...it,
          date: today,
        };
      }
      return it;
    });

    if (count > 0) {
      saveItems(updated);
      showToast(`Se han desplazado ${count} tareas pendientes al día de hoy para que sigas teniéndolas activas`, 'success');
    } else {
      showToast('No hay tareas pendientes vencidas para desplazar', 'info');
    }
  };

  // Desplazamiento manual en cualquier momento del día (al siguiente día hábil, saltando sábados y domingos)
  const handleQuickReschedule = (itemId: string, daysToAdd: number = 1) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const baseDate = new Date(item.date || getTodayString());
    let added = 0;
    while (added < daysToAdd) {
      baseDate.setDate(baseDate.getDate() + 1);
      const day = baseDate.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    const nextDateStr = baseDate.toISOString().split('T')[0];

    const updated = items.map((i) => (i.id === itemId ? { ...i, date: nextDateStr } : i));
    saveItems(updated);
    showToast(`"${item.title}" desplazada al ${nextDateStr} (siguiente día hábil)`, 'success');
  };

  // Cargar post-its desde localStorage o seed y sincronizar recordatorios
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTITS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPostIts(parsed);
          syncPostItReminders(parsed);
        } else {
          setPostIts(SEED_POST_ITS);
          localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(SEED_POST_ITS));
          syncPostItReminders(SEED_POST_ITS);
        }
      } else {
        setPostIts(SEED_POST_ITS);
        localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(SEED_POST_ITS));
        syncPostItReminders(SEED_POST_ITS);
      }
    } catch {
      setPostIts(SEED_POST_ITS);
      syncPostItReminders(SEED_POST_ITS);
    }
  }, [syncPostItReminders]);

  // Guardar post-its y disparar sincronización de alertas para el panel de notificaciones
  const savePostIts = (updated: PostItItem[]) => {
    setPostIts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    syncPostItReminders(updated);
  };

  // Cargar empresas desde caché o base de datos
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
        if (cachedComp) {
          setCompanies(JSON.parse(cachedComp));
          return;
        }
        const supabase = createClient();
        const { data } = await supabase.from('companies').select('*').order('name');
        if (data && data.length > 0) {
          setCompanies(data);
          localStorage.setItem('bug_clockify_cache_companies', JSON.stringify(data));
        } else {
          setCompanies(MOCK_COMPANIES);
        }
      } catch {
        setCompanies(MOCK_COMPANIES);
      }
    };
    loadCompanies();
  }, []);

  // Cargar perfiles de equipo para la colaboración
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const cachedProf = localStorage.getItem('bug_clockify_cache_profiles');
        if (cachedProf) {
          setProfiles(JSON.parse(cachedProf));
          return;
        }
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('*').order('full_name');
        if (data && data.length > 0) {
          setProfiles(data);
          localStorage.setItem('bug_clockify_cache_profiles', JSON.stringify(data));
        } else {
          setProfiles(MOCK_PROFILES);
        }
      } catch {
        setProfiles(MOCK_PROFILES);
      }
    };
    loadProfiles();
  }, []);

  // Manejar creación / guardado de elemento
  const handleSaveItem = (itemToSave: TaskFlowItem) => {
    const exists = items.some((i) => i.id === itemToSave.id);
    let updated: TaskFlowItem[];
    if (exists) {
      updated = items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
      showToast(`Elemento "${itemToSave.title}" actualizado con éxito.`, 'success');
    } else {
      updated = [itemToSave, ...items];
      showToast(
        `${itemToSave.type === 'meeting' ? 'Reunión' : 'Tarea'} "${itemToSave.title}" programada en el calendario.`,
        'success'
      );
    }
    saveItems(updated);
  };

  // Cambiar estado de elemento
  const handleChangeStatus = (itemId: string, nextStatus: TaskStatus) => {
    const item = items.find((i) => i.id === itemId);
    const updated = items.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i));
    saveItems(updated);
    if (item) {
      const statusLabels: Record<TaskStatus, string> = {
        todo: 'Por hacer',
        in_progress: 'En proceso',
        review: 'En revisión',
        done: 'Completada / Bien hecho',
      };
      showToast(`"${item.title}" movida a: ${statusLabels[nextStatus]}`, nextStatus === 'done' ? 'success' : 'info');
    }
  };

  // Mover elemento de fecha mediante Drag & Drop (arrastrar y soltar entre días)
  const handleMoveItemDate = (itemId: string, newDate: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.date === newDate) return;

    const updated = items.map((i) => (i.id === itemId ? { ...i, date: newDate } : i));
    saveItems(updated);

    try {
      const parts = newDate.split('-');
      const dayNum = parseInt(parts[2], 10);
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthStr = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      showToast(`"${item.title}" movida al ${dayNum} de ${monthStr}`, 'success');
    } catch {
      showToast(`"${item.title}" movida al ${newDate}`, 'success');
    }
  };

  // Eliminar elemento
  const handleDeleteItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const previous = items;
    removeWithUndo(
      `"${item?.title || 'Elemento'}" eliminado de TaskFlow.`,
      () => saveItems(items.filter((i) => i.id !== itemId)),
      () => saveItems(previous)
    );
  };

  // Iniciar temporizador directo en Clockify
  const handleStartClockifyTimer = (item: TaskFlowItem) => {
    // Buscar la empresa en la lista
    let targetCompany = companies.find((c) => c.name.toLowerCase() === item.companyName.toLowerCase());
    
    // Si no existe pero tenemos companyId, buscar por ID
    if (!targetCompany && item.companyId) {
      targetCompany = companies.find((c) => c.id === item.companyId);
    }

    if (targetCompany) {
      startTimerWithEntry(targetCompany.id, item.title);
      showToast(
        `▶ Temporizador de Clockify iniciado para "${targetCompany.name}" (${item.title})`,
        'success'
      );
    } else {
      // Si la empresa es genérica o interna, usar la primera empresa disponible o avisar
      if (companies.length > 0) {
        startTimerWithEntry(companies[0].id, `[${item.companyName}] ${item.title}`);
        showToast(
          `▶ Temporizador iniciado en Clockify para "${companies[0].name}" con la tarea`,
          'success'
        );
      } else {
        showToast(
          `No se encontró la empresa "${item.companyName}" en Clockify. Crea la empresa primero en el panel.`,
          'alert'
        );
      }
    }
  };

  // Abrir modal para crear
  const handleOpenCreateModal = (defaultDate?: string) => {
    setEditingItem(null);
    setModalDefaultDate(defaultDate || getTodayString());
    setIsModalOpen(true);
  };

  // Atajo universal Ctrl + N / Cmd + N para crear nueva tarea en TaskFlow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          handleOpenCreateModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Abrir modal para editar
  const handleOpenEditModal = (item: TaskFlowItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Formatear segundos del temporizador activo para la cabecera
  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Verificar si el usuario tiene permiso para esta herramienta
  const hasAccess = canUserAccessHubApp(user, toolParam);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--hub-bg,#DDD2EA)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Brain Up Agenda...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de Acceso Denegado si el coordinador restringió esta app
  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col font-sans w-full">
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="p-4 rounded-full bg-amber-50 text-amber-700 border border-amber-300 w-16 h-16 mx-auto flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-[#292929]">
              HERRAMIENTA NO DISPONIBLE EN TU PERFIL
            </h1>
            <p className="text-sm text-[#4A4A4A] leading-relaxed">
              Tu cuenta de usuario no tiene asignado el permiso de acceso para <strong>{toolParam.toUpperCase()}</strong> en la configuración de la coordinadora.
            </p>
          </div>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a mi HUB de Aplicaciones</span>
          </Link>
        </main>
      </div>
    );
  }

  // Filtrar elementos
  const currentUserName = user.full_name || 'Trabajador Brain Up';
  const defaultListId = taskLists[0]?.id;
  const resolveListId = (item: TaskFlowItem) =>
    item.listId && taskLists.some((l) => l.id === item.listId) ? item.listId : defaultListId;

  const filteredItems = items.filter((item) => {
    // Filtro por texto de búsqueda
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.assignees && item.assignees.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase())));

    // Filtro por ámbito / compartición
    let matchesScope = true;
    if (scopeFilter === 'mine') {
      matchesScope =
        item.createdBy === currentUserName ||
        (item.assignees && item.assignees.includes(currentUserName));
    } else if (scopeFilter === 'shared') {
      matchesScope = item.isShared === true;
    } else if (scopeFilter === 'meetings') {
      matchesScope = item.type === 'meeting';
    }

    // Filtro por cliente
    const matchesClient = clientFilter === 'all' || item.companyName === clientFilter;

    // Filtro por lista de tareas (las tareas sin lista cuentan como de la primera lista)
    const matchesList = selectedListFilter === 'all' || resolveListId(item) === selectedListFilter;

    return matchesSearch && matchesScope && matchesClient && matchesList;
  });

  return (
    <div className="flex-1 min-h-0 h-full max-h-full flex flex-col font-sans w-full overflow-hidden">
      {/* Notificación Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-[#8E0E75] p-3.5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-[#292929] leading-tight flex-1">
            {toastMessage.text}
          </p>
        </div>
      )}

      <main className="page-transition flex-1 min-h-0 h-full w-full max-w-none px-3 sm:px-5 lg:px-6 py-2 flex flex-col space-y-2 overflow-hidden">
        
        {/* SECCIÓN 1: Barra de Herramientas (Conmutador de Vistas + Filtros de Ámbito y Buscador) */}
        {!isHeaderCollapsed && (
          <div className="bg-white border border-[#D8CFF0] px-3.5 py-2 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200">
            
            {/* Conmutador de Vistas con Pastilla Morada Deslizante Fluida */}
            <div 
              ref={viewSwitcherRef}
              onMouseLeave={() => setHoveredView(null)}
              className="relative flex items-center rounded-2xl bg-[#F8F6FC] p-1 border-2 border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider select-none shadow-2xs"
            >
              {/* Pastilla morada deslizante */}
              <div
                className="absolute rounded-xl bg-[#8E0E75] shadow-sm pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{
                  left: `${viewPill.left}px`,
                  width: `${viewPill.width}px`,
                  top: '4px',
                  bottom: '4px',
                  opacity: viewPill.opacity,
                }}
              />

              <button
                type="button"
                data-view-tab="calendar"
                onClick={() => setViewMode('calendar')}
                onMouseEnter={() => setHoveredView('calendar')}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors duration-200 cursor-pointer ${
                  targetView === 'calendar'
                    ? 'text-white font-black'
                    : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
                }`}
              >
                <CalendarIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${targetView === 'calendar' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
                <span>Calendario (L-V)</span>
              </button>

              <button
                type="button"
                data-view-tab="postits"
                onClick={() => setViewMode('postits')}
                onMouseEnter={() => setHoveredView('postits')}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors duration-200 cursor-pointer ${
                  targetView === 'postits'
                    ? 'text-white font-black'
                    : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
                }`}
              >
                <StickyNote className={`h-3.5 w-3.5 shrink-0 transition-transform ${targetView === 'postits' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
                <span>Mural de Post-its</span>
                {postIts.length > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    targetView === 'postits' ? 'bg-white/25 text-white' : 'bg-[#D8CFF0] text-[#8E0E75]'
                  }`}>
                    {postIts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                data-view-tab="list"
                onClick={() => setViewMode('list')}
                onMouseEnter={() => setHoveredView('list')}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors duration-200 cursor-pointer ${
                  targetView === 'list'
                    ? 'text-white font-black'
                    : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
                }`}
              >
                <List className={`h-3.5 w-3.5 shrink-0 transition-transform ${targetView === 'list' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
                <span>Lista</span>
              </button>
            </div>

            {/* Micro-distinción visual de conceptos (Calendario vs Post-its) */}
            <div className="hidden xl:flex items-center gap-2 text-[11px] font-medium text-[#4A4A4A] bg-[#F8F6FC] px-2.5 py-1 rounded-xl border border-[#D8CFF0]">
              <span className="text-[#8E0E75] font-black uppercase tracking-wider text-[10px]">Guía:</span>
              <span><strong>Calendario:</strong> entregables con fecha</span>
              <span className="text-[#D8CFF0]">·</span>
              <span><strong>Post-its:</strong> alertas recurrentes e ideas</span>
            </div>

            {/* Filtros de Ámbito */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] mr-0.5 hidden md:inline">
                Ver:
              </span>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                    : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todas ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('mine')}
                className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  scopeFilter === 'mine'
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                    : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
                }`}
              >
                Mis Tareas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('shared')}
                className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  scopeFilter === 'shared'
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                    : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
                }`}
              >
                Compartidas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('meetings')}
                className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  scopeFilter === 'meetings'
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                    : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
                }`}
              >
                Reuniones ({items.filter(it => it.type === 'meeting').length})
              </button>
            </div>

            {/* Filtro de lista (desplegable con recuento) + creación rápida de lista */}
            <div className="flex items-center gap-1.5">
              <div className="w-60">
                <AppSelect
                  value={selectedListFilter}
                  onChange={setSelectedListFilter}
                  ariaLabel="Filtrar por lista"
                  icon={<Layers className="h-4 w-4" />}
                  options={[
                    { value: 'all', label: `Todas las listas (${items.length})` },
                    ...taskLists.map((list) => ({
                      value: list.id,
                      label: `${list.name} (${items.filter((it) => resolveListId(it) === list.id).length})`,
                      icon: <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: list.color }} />,
                    })),
                  ]}
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNewListForm((v) => !v)}
                  aria-expanded={showNewListForm}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#D8CFF0] hover:border-[#8E0E75] text-[#8E0E75] text-sm font-semibold hover:bg-[#F8F6FC] transition-all cursor-pointer"
                  title="Crear una nueva lista"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden xl:inline">Nueva lista</span>
                </button>
                {showNewListForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newListName.trim()) return;
                      handleCreateList({
                        id: 'list-' + Date.now(),
                        name: newListName.trim(),
                        color: newListColor,
                        createdAt: new Date().toISOString(),
                      });
                      setNewListName('');
                      setShowNewListForm(false);
                    }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white border border-[#D8CFF0] rounded-xl shadow-xl p-3 space-y-2"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setShowNewListForm(false)}
                      placeholder="Nombre de la lista"
                      aria-label="Nombre de la nueva lista"
                      className="w-full px-2.5 py-2 text-sm border border-[#D8CFF0] rounded-lg outline-none focus:border-[#8E0E75]"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Color de la lista">
                      {['#D50000', '#F4511E', '#F6BF26', '#33B679', '#039BE5', '#3F51B5', '#8E24AA', '#8E0E75'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          role="radio"
                          aria-checked={newListColor === hex}
                          aria-label={`Color ${hex}`}
                          onClick={() => setNewListColor(hex)}
                          className={`h-6 w-6 rounded-full cursor-pointer ${newListColor === hex ? 'ring-2 ring-offset-1 ring-[#191654]' : ''}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-sm font-bold cursor-pointer"
                    >
                      Crear lista
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Botón de Desplazar Pendientes Vencidas */}
            <button
              type="button"
              onClick={handleRescheduleOverdue}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D8CFF0] hover:border-[#8E0E75] bg-[#F8F6FC] hover:bg-white text-[#8E0E75] text-[11px] font-bold transition-all cursor-pointer"
              title="Desplazar tareas pendientes vencidas a hoy como recordatorio activo"
            >
              <RotateCw className="h-3 w-3" />
              <span>Desplazar Vencidas a Hoy</span>
            </button>

            {/* Buscador Compacto y Botón de Plegar Secciones 1 y 2 */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48 lg:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4A4A4A]" />
                <input
                  type="text"
                  placeholder="Buscar tareas, clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 border border-[#D8CFF0] rounded-xl text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-medium"
                />
              </div>

              {/* Botón para Plegar Secciones 1 y 2 (Modo Portátil Amplio) */}
              <button
                type="button"
                onClick={toggleHeaderCollapse}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D8CFF0] hover:border-[#8E0E75] bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] text-xs font-black transition-all cursor-pointer shadow-2xs group shrink-0"
                title="Plegar secciones 1 y 2 para maximizar el área del calendario en portátiles (Modo Portátil Amplio)"
                aria-label="Plegar cabeceras"
              >
                <ChevronUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                <span className="hidden xl:inline">Plegar Cabeceras</span>
              </button>
            </div>

          </div>
        )}

        {/* Barra ultra-compacta cuando está plegado en vista Lista */}
        {isHeaderCollapsed && viewMode === 'list' && (
          <div className="bg-white border border-[#D8CFF0] px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleHeaderCollapse}
                className="px-2.5 py-1 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-102 active:scale-98"
                title="Desplegar cabecera de filtros y herramientas"
              >
                <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                <span>Desplegar Cabeceras</span>
              </button>

              <span className="text-xs font-black text-[#292929] uppercase tracking-wider">
                Vista de Lista de Tareas
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className="px-2.5 py-1 rounded-lg border border-[#D8CFF0] bg-[#F8F6FC] text-[#8E0E75] hover:bg-white transition-all cursor-pointer flex items-center gap-1"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Calendario (L-V)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('postits')}
                className="px-2.5 py-1 rounded-lg border border-[#D8CFF0] bg-[#F8F6FC] text-[#8E0E75] hover:bg-white transition-all cursor-pointer flex items-center gap-1"
              >
                <StickyNote className="h-3.5 w-3.5" />
                <span>Post-its</span>
              </button>
            </div>
          </div>
        )}

        {/* Vista Renderizada: Calendario Nativo (L-V con panel de notificaciones), Mural de Post-its o Lista */}
        {viewMode === 'calendar' && (
          <div className="flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col">
            <NativeCalendar
              items={filteredItems}
              postIts={postIts}
              onOpenPostIt={() => setViewMode('postits')}
              onSelectItem={handleOpenEditModal}
              onDeleteItem={handleDeleteItem}
              onToggleStatus={handleChangeStatus}
              onStartClockifyTimer={handleStartClockifyTimer}
              onOpenCreateModal={handleOpenCreateModal}
              onRescheduleOverdue={handleRescheduleOverdue}
              onMoveItemDate={handleMoveItemDate}
              onQuickReschedule={handleQuickReschedule}
              currentUserName={currentUserName}
              isHeaderCollapsed={isHeaderCollapsed}
              onToggleHeaderCollapse={toggleHeaderCollapse}
              onChangeViewMode={(mode) => setViewMode(mode)}
            />
          </div>
        )}

        {viewMode === 'postits' && (
          <PostItBoard
            postIts={postIts}
            onSavePostIts={savePostIts}
            isHeaderCollapsed={isHeaderCollapsed}
            onToggleHeaderCollapse={toggleHeaderCollapse}
            onChangeViewMode={(mode) => setViewMode(mode)}
          />
        )}

        {viewMode === 'list' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TaskListView
              items={filteredItems}
              onSelectItem={handleOpenEditModal}
              onDeleteItem={handleDeleteItem}
              onChangeStatus={handleChangeStatus}
              onStartClockifyTimer={handleStartClockifyTimer}
            />
          </div>
        )}

      </main>

      {/* Modal Unificado de Creación y Edición */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        defaultDate={modalDefaultDate}
        companies={companies}
        profiles={profiles}
        currentUserName={currentUserName}
        taskLists={taskLists}
        onCreateList={handleCreateList}
      />
    </div>
  );
}

export default function TaskFlowAppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--hub-bg,#DDD2EA)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Cargando Brain Up Agenda...
            </p>
          </div>
        </div>
      }
    >
      <TaskFlowContent />
    </Suspense>
  );
}
