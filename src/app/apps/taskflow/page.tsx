'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';
import { Company, Profile } from '@/types/database';
import { canUserAccessHubApp, BRAIN_UP_HUB_APPS } from '@/lib/hub-apps';
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
  MoveRight, 
  MoveLeft, 
  LayoutGrid, 
  Sparkles,
  Filter,
  Search,
  Check
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  companyName: string;
  assigneeName: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'alta' | 'media' | 'baja'; // Alta = Rojo, Media = Amarillo, Baja = Verde
  estimatedHours: number;
  createdAt: string;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Diseño de creatividades y copies para campaña Instagram',
    companyName: 'Restaurante El Gourmet',
    assigneeName: 'Equipo Creativo',
    status: 'in_progress',
    priority: 'alta',
    estimatedHours: 4,
    createdAt: '2026-10-14',
  },
  {
    id: 'task-2',
    title: 'Auditoría SEO mensual y revisión de palabras clave',
    companyName: 'Clínica Dental Sonrisas',
    assigneeName: 'Especialista SEO',
    status: 'todo',
    priority: 'media',
    estimatedHours: 3,
    createdAt: '2026-10-15',
  },
  {
    id: 'task-3',
    title: 'Actualización de catálogo e-commerce y banners principales',
    companyName: 'Boutique Moda Bella',
    assigneeName: 'Desarrollo Web',
    status: 'review',
    priority: 'alta',
    estimatedHours: 2.5,
    createdAt: '2026-10-13',
  },
  {
    id: 'task-4',
    title: 'Entrega final y aprobación de informe mensual cuota',
    companyName: 'Abogados & Consultores Asociados',
    assigneeName: 'Coordinación Brain Up',
    status: 'done',
    priority: 'baja',
    estimatedHours: 1.5,
    createdAt: '2026-10-12',
  },
];

const STORAGE_KEY_TASKS = 'bug_taskflow_tasks';

function TaskFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolParam = searchParams.get('tool') || 'taskflow';
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'alta' | 'media' | 'baja'>('all');

  // Formulario de nueva tarea
  const [newTitle, setNewTitle] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPriority, setNewPriority] = useState<'alta' | 'media' | 'baja'>('media');
  const [newEstimatedHours, setNewEstimatedHours] = useState('2');
  const [isCreating, setIsCreating] = useState(false);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar tareas desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TASKS);
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        setTasks(INITIAL_TASKS);
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
      }
    } catch (e) {
      console.warn(e);
      setTasks(INITIAL_TASKS);
    }
  }, []);

  // Cargar empresas para el selector
  useEffect(() => {
    try {
      const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
      if (cachedComp) {
        const parsed = JSON.parse(cachedComp) as Company[];
        setCompanies(parsed);
        if (parsed.length > 0 && !newCompanyName) {
          setNewCompanyName(parsed[0].name);
        }
      } else {
        setCompanies(MOCK_COMPANIES);
      }
    } catch {
      setCompanies(MOCK_COMPANIES);
    }
  }, [newCompanyName]);

  // Guardar tareas en localStorage al cambiar
  const saveTasks = (updated: TaskItem[]) => {
    setTasks(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Crear tarea
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TaskItem = {
      id: 'task_' + Date.now(),
      title: newTitle.trim(),
      companyName: newCompanyName.trim() || 'Cliente General',
      assigneeName: user?.full_name || 'Trabajador',
      status: 'todo',
      priority: newPriority,
      estimatedHours: parseFloat(newEstimatedHours) || 1,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveTasks([newTask, ...tasks]);
    setNewTitle('');
    setIsCreating(false);
  };

  // Cambiar estado de tarea
  const handleChangeStatus = (taskId: string, nextStatus: TaskItem['status']) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t));
    saveTasks(updated);
  };

  // Eliminar tarea
  const handleDeleteTask = (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea del tablero?')) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
  };

  // Verificar si el usuario tiene permiso para esta herramienta
  const hasAccess = canUserAccessHubApp(user, toolParam);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Brain Up TaskFlow...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de Acceso Denegado si el coordinador restringió esta app
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#F8F6FC] flex flex-col font-sans">
        <Navbar />
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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a mi HUB de Aplicaciones</span>
          </Link>
        </main>
      </div>
    );
  }

  // Tareas filtradas
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assigneeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const columns: {
    id: TaskItem['status'];
    title: string;
    badgeStyle: string;
    countStyle: string;
  }[] = [
    {
      id: 'todo',
      title: 'Por Hacer',
      badgeStyle: 'bg-slate-100 text-[#4A4A4A] border-slate-300',
      countStyle: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'in_progress',
      title: 'En Proceso',
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300',
      countStyle: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'review',
      title: 'En Revisión',
      badgeStyle: 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30',
      countStyle: 'bg-[#8E0E75]/20 text-[#8E0E75]',
    },
    {
      id: 'done',
      title: 'Completada',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      countStyle: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--hub-bg,#F8F6FC)] flex flex-col font-sans">
      <Navbar />

      <main className="page-transition flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Barra Superior con Enlace Directo de Regreso al HUB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white border border-[#D8CFF0] text-xs font-extrabold uppercase tracking-wider text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white transition-all shadow-xs cursor-pointer group"
              title="Volver a la selección de aplicaciones"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Volver al HUB</span>
            </Link>

            <div className="h-5 w-px bg-[#D8CFF0] hidden sm:block" />

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#292929] flex items-center gap-2">
                <CheckSquare className="h-6 w-6 text-[#8E0E75]" />
                <span>BRAIN UP <span className="text-[#8E0E75]">TASKFLOW</span></span>
              </h1>
              <p className="text-xs text-[#4A4A4A] font-light">
                Aplicación de prueba del HUB para gestión de proyectos, tareas y entregables de equipo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isCreating ? 'Cancelar' : 'Nueva Tarea'}</span>
            </button>
          </div>
        </div>

        {/* Formulario Desplegable de Creación de Tarea */}
        {isCreating && (
          <div className="rounded-sm border border-[#8E0E75]/30 bg-white p-5 shadow-sm space-y-4 tab-transition">
            <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4F5]">
              <Sparkles className="h-4 w-4 text-[#8E0E75]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
                CREAR NUEVA TAREA EN EL HUB
              </h3>
            </div>

            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Título de la Tarea / Entregable
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Google Ads y copies de aterrizaje..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-medium"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Cliente / Empresa Asignada
                </label>
                <input
                  type="text"
                  placeholder="ej. Restaurante El Gourmet"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Prioridad
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as 'alta' | 'media' | 'baja')}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:border-[#8E0E75] font-bold"
                >
                  <option value="alta">Alta (Rojo)</option>
                  <option value="media">Media (Amarillo)</option>
                  <option value="baja">Baja (Verde)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[#8E0E75] hover:bg-[#700B5C] text-white rounded-sm text-xs font-extrabold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Añadir
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros y Buscador de Tareas */}
        <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
            <input
              type="text"
              placeholder="Buscar tareas por título, cliente o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">Prioridad:</span>
            <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPriorityFilter('all')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  priorityFilter === 'all' ? 'bg-[#8E0E75] text-white shadow-xs' : 'text-[#4A4A4A]'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('alta')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  priorityFilter === 'alta' ? 'bg-red-600 text-white shadow-xs' : 'text-red-600'
                }`}
              >
                Alta
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('media')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  priorityFilter === 'media' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700'
                }`}
              >
                Media
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('baja')}
                className={`px-2 py-0.5 rounded-sm transition-all ${
                  priorityFilter === 'baja' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                }`}
              >
                Baja
              </button>
            </div>
          </div>
        </div>

        {/* Tablero Kanban de 4 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-white border border-[#D8CFF0] rounded-sm shadow-xs flex flex-col min-h-[420px]"
              >
                {/* Cabecera de Columna */}
                <div className="p-3.5 border-b border-[#EAE4F5] bg-[#F8F6FC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-[#292929]">
                      {col.title}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold font-mono ${col.countStyle}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tarjetas de la Columna */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      Sin tareas en esta columna
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-sm border border-[#D8CFF0] bg-white p-3.5 shadow-xs hover:border-[#8E0E75]/40 transition-all space-y-2.5"
                      >
                        {/* Fila 1: Prioridad y Cliente */}
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded-sm font-extrabold uppercase tracking-wider border ${
                              task.priority === 'alta'
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : task.priority === 'media'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {task.priority === 'alta' ? 'Urgente' : task.priority === 'media' ? 'Media' : 'Baja'}
                          </span>

                          <span className="font-mono text-slate-400">
                            {task.createdAt}
                          </span>
                        </div>

                        {/* Título */}
                        <h4 className="text-xs font-bold text-[#292929] leading-snug">
                          {task.title}
                        </h4>

                        {/* Fila 2: Empresa y Responsable */}
                        <div className="flex flex-col gap-1 text-[11px] text-[#4A4A4A] pt-1 border-t border-[#F8F6FC]">
                          <div className="flex items-center gap-1 truncate text-[#8E0E75] font-semibold">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.companyName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{task.assigneeName}</span>
                            </span>
                            <span className="font-mono tabular-nums font-bold text-[#292929]">
                              ~{task.estimatedHours}h
                            </span>
                          </div>
                        </div>

                        {/* Selector Rápido de Estado y Eliminar */}
                        <div className="pt-2 border-t border-[#EAE4F5] flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {col.id !== 'todo' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prev = col.id === 'done' ? 'review' : col.id === 'review' ? 'in_progress' : 'todo';
                                  handleChangeStatus(task.id, prev);
                                }}
                                className="p-1 rounded-sm border border-[#D8CFF0] hover:bg-[#F8F6FC] text-[#4A4A4A] cursor-pointer"
                                title="Mover a columna anterior"
                              >
                                <MoveLeft className="h-3 w-3" />
                              </button>
                            )}

                            {col.id !== 'done' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = col.id === 'todo' ? 'in_progress' : col.id === 'in_progress' ? 'review' : 'done';
                                  handleChangeStatus(task.id, next);
                                }}
                                className="px-2 py-0.5 rounded-sm bg-[#8E0E75] text-white text-[10px] font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all cursor-pointer flex items-center gap-1"
                                title="Avanzar estado"
                              >
                                <span>Avanzar</span>
                                <MoveRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}

export default function TaskFlowAppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Cargando Brain Up TaskFlow...
            </p>
          </div>
        </div>
      }
    >
      <TaskFlowContent />
    </Suspense>
  );
}
