'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompanyHeroBanner } from '@/components/employee/company-hero-banner';
import { TimeTrackerBar } from '@/components/employee/time-tracker-bar';
import { EmployeeStats } from '@/components/employee/employee-stats';
import { TimeEntriesList } from '@/components/employee/time-entries-list';
import { useAuth } from '@/context/auth-context';
import { CollapsiblePageHeader } from '@/context/layout-collapse-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_TIME_ENTRIES } from '@/lib/mock-data';
import { Company, TimeEntry } from '@/types/database';
import { Clock, ShieldCheck, BarChart3, ArrowRight, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { notify, friendlyError, removeWithUndo } from '@/lib/feedback';
import { formatMinutes, safeSetLocalStorage, safeGetLocalStorage } from '@/lib/utils';
import {
  saveLocalFirstEntry,
  updateLocalFirstEntry,
  deleteLocalFirstEntry,
  initOfflineSyncListeners,
  getPendingSyncCount,
} from '@/lib/services/offline-time-sync';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();
  const { setActiveCompany, activeCompanyId, setActiveCompanyId, startTimerWithEntry } = useTimer();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Inicializar observadores de sincronización Offline-First (LocalStorage -> Nube)
  useEffect(() => {
    setPendingSyncCount(getPendingSyncCount());
    const cleanup = initOfflineSyncListeners((count) => {
      setPendingSyncCount(count);
    });
    return cleanup;
  }, []);

  // Redirigir a login si no hay sesión o a admin si es super admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'admin') {
        router.replace('/dashboard/admin');
      }
    }
  }, [user, authLoading, router]);

  // Cargar datos estrictamente aislados del usuario actual en paralelo con caché instantánea
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    // 1. Restaurar al instante desde caché local (0ms de retraso)
    try {
      const cachedComp = safeGetLocalStorage<Company[] | null>('bug_clockify_cache_companies', null);
      const cachedEntr = safeGetLocalStorage<TimeEntry[] | null>(`bug_clockify_cache_entries_${currentUserId}`, null);
      if (cachedComp) setCompanies(cachedComp);
      if (cachedEntr) setEntries(cachedEntr);
      if (cachedComp) setIsLoading(false);
    } catch (e) {
      console.warn('Cache read notice:', e);
    }

    async function fetchData() {
      if (isSupabaseConnected) {
        try {
          const supabase = createClient();

          // Ejecución en paralelo ultra-rápida (empresas y registros del usuario a la vez)
          const [compRes, entriesRes] = await Promise.all([
            supabase.from('companies').select('*').eq('is_active', true).order('name'),
            supabase
              .from('time_entries')
              .select('*, company:companies(*), profile:profiles(*)')
              .eq('user_id', currentUserId)
              .order('work_date', { ascending: false })
              .order('created_at', { ascending: false }),
          ]);

          if (compRes.data && compRes.data.length > 0) {
            setCompanies(compRes.data as Company[]);
            safeSetLocalStorage('bug_clockify_cache_companies', compRes.data);
          }
          if (entriesRes.data && entriesRes.data.length > 0) {
            const cloudEntries = entriesRes.data as unknown as TimeEntry[];
            // Preservar cualquier registro local que aún esté en cola de sincronización
            const cachedLocal = safeGetLocalStorage<TimeEntry[]>(`bug_clockify_cache_entries_${currentUserId}`, []);
            const pendingLocals = cachedLocal.filter((e) => e.id.startsWith('local_') && !cloudEntries.some((c) => c.id === e.id));
            const merged = [...pendingLocals, ...cloudEntries];
            setEntries(merged);
            safeSetLocalStorage(`bug_clockify_cache_entries_${currentUserId}`, merged, 200);
          }
        } catch (err) {
          console.error('Error cargando datos de Supabase:', err);
          setCompanies(MOCK_COMPANIES);
          const userEntries = MOCK_TIME_ENTRIES.filter((e) => e.user_id === currentUserId);
          setEntries(userEntries);
        }
      } else {
        setCompanies(MOCK_COMPANIES);
        // Filtrado estricto por user.id para proteger datos privados entre trabajadores
        const userEntries = MOCK_TIME_ENTRIES.filter((e) => e.user_id === currentUserId);
        setEntries(userEntries);
      }
      setIsLoading(false);
    }

    fetchData();
  }, [user, isSupabaseConnected]);

  // Escuchar creaciones o actualizaciones de registros desde ventanas externas (Floating Timer, PiP, etc.)
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    const handleExternalEntry = (entry: TimeEntry) => {
      if (!entry || entry.user_id !== currentUserId) return;
      setEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        return [entry, ...prev];
      });
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'bug_clockify_entry_trigger' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.userId === currentUserId) {
            // Leer la caché actualizada inmediatamente
            const cachedEntr = safeGetLocalStorage<TimeEntry[] | null>(`bug_clockify_cache_entries_${currentUserId}`, null);
            if (cachedEntr) {
              setEntries(cachedEntr);
            }
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TimeEntry>;
      if (customEvent.detail) {
        handleExternalEntry(customEvent.detail);
      }
    };

    const handleMessageEvent = (e: MessageEvent) => {
      if (e.data && e.data.type === 'BUG_ENTRY_CREATED' && e.data.entry) {
        handleExternalEntry(e.data.entry);
      }
    };

    const handleEntrySynced = (e: Event) => {
      const custom = e as CustomEvent<{ tempId: string; realEntry: TimeEntry }>;
      if (custom.detail) {
        const { tempId, realEntry } = custom.detail;
        setEntries((prev) => prev.map((entry) => (entry.id === tempId ? realEntry : entry)));
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('bug_clockify_entry_created', handleCustomEvent);
    window.addEventListener('bug_clockify_entry_synced', handleEntrySynced);
    window.addEventListener('message', handleMessageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('bug_clockify_entry_created', handleCustomEvent);
      window.removeEventListener('bug_clockify_entry_synced', handleEntrySynced);
      window.removeEventListener('message', handleMessageEvent);
    };
  }, [user]);

  // Seleccionar automáticamente la empresa y sincronizar con la cabecera
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      try {
        const preferredId = activeCompanyId || localStorage.getItem('bug_clockify_last_company_id');
        const found = preferredId && companies.find((c) => c.id === preferredId && c.is_active);
        if (found) {
          setSelectedCompanyId(found.id);
          setActiveCompany(found);
          return;
        }
      } catch (e) {
        console.warn('Local storage error:', e);
      }
      const firstActive = companies.find((c) => c.is_active) || companies[0];
      if (firstActive) {
        setSelectedCompanyId(firstActive.id);
        setActiveCompany(firstActive);
      }
    }
  }, [companies, selectedCompanyId, activeCompanyId, setActiveCompany]);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setActiveCompanyId(companyId);
    const comp = companies.find((c) => c.id === companyId) || null;
    setActiveCompany(comp);
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Sincronizar activeCompany en TimerContext cuando cambia selectedCompany
  useEffect(() => {
    if (selectedCompany) {
      setActiveCompany(selectedCompany);
    }
  }, [selectedCompany, setActiveCompany]);

  // Handler para iniciar temporizador repitiendo una tarea previa
  const handleRepeatEntry = (entry: TimeEntry) => {
    setSelectedCompanyId(entry.company_id);
    setActiveCompanyId(entry.company_id);
    const comp = companies.find((c) => c.id === entry.company_id) || null;
    setActiveCompany(comp);
    startTimerWithEntry(entry.company_id, entry.description || '');
  };

  // Handler para agregar nuevo registro (Offline-First: LocalStorage primero, Nube en segundo plano)
  const handleAddEntry = async (newEntryData: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return;
    const targetCompany = companies.find((c) => c.id === newEntryData.company_id) || null;

    // 1. Guardar primero en LocalStorage e insertar en cola de sincronización
    const localEntry = saveLocalFirstEntry(newEntryData, user, targetCompany);

    // 2. Reflejar al instante en la interfaz
    setEntries((prev) => [localEntry, ...prev.filter((e) => e.id !== localEntry.id)]);

    notify('Registro guardado en tu dispositivo y sincronizándose con la nube.', { type: 'success' });
  };

  // Handler para actualizar registro (Offline-First)
  const handleUpdateEntry = async (id: string, updatedFields: Partial<TimeEntry>) => {
    if (!user) return;

    // 1. Actualizar primero en LocalStorage y encolar sincronización
    updateLocalFirstEntry(id, updatedFields, user.id, companies);

    // 2. Reflejar al instante en la interfaz
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const newComp = updatedFields.company_id
          ? companies.find((c) => c.id === updatedFields.company_id) || entry.company
          : entry.company;

        return {
          ...entry,
          ...updatedFields,
          company: newComp,
        };
      })
    );
  };

  // Handler para eliminar registro horario: se borra al instante de LocalStorage y se ofrece "Deshacer"
  const handleDeleteEntry = async (id: string) => {
    const removed = entries.find((entry) => entry.id === id);
    if (!removed || !user) return;

    // 1. Borrar primero en LocalStorage y encolar borrado en la nube
    deleteLocalFirstEntry(id, user.id);

    removeWithUndo(
      `Registro eliminado (${removed.company?.name || 'Cliente'} · ${formatMinutes(removed.duration_minutes)})`,
      () => setEntries((prev) => prev.filter((entry) => entry.id !== id)),
      () => {
        const { company_id, work_date, start_time, end_time, duration_minutes, description, compute_type } = removed;
        handleAddEntry({ company_id, work_date, start_time, end_time, duration_minutes, description, compute_type });
      }
    );
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F4F5F7] w-full font-sans">
      {/* Contenedor Amplio y Heroico con Gran Presencia Visual */}
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-7 sm:space-y-8">
        
        {/* Cabecera Ampliada: HORAS POR CLIENTE */}
        <CollapsiblePageHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-[#EAE4F5] gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#292929] flex items-center gap-3">
              <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-[#8E0E75] shrink-0" />
              <span>Horas por <span className="text-[#8E0E75]">cliente</span></span>
            </h1>
            <p className="text-sm sm:text-base text-[#4A4A4A] font-light mt-1">
              Control rápido de jornada y tiempo imputado por cliente
            </p>
          </div>

          {user.role === 'coordinator' && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/coordinator"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-xs sm:text-sm font-extrabold text-[#8E0E75] shadow-2xs hover:shadow-sm transition-all"
              >
                <BarChart3 className="h-4 w-4 text-[#8E0E75]" />
                <span>Panel de Coordinación</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#8E0E75]" />
              </Link>
            </div>
          )}
        </div>
        </CollapsiblePageHeader>

        {/* 1. Empresa actual fijada (Compacta, con hueco para logo, sin CIF ni Responsable) */}
        <section aria-label="Cliente en curso de trabajo" className="w-full">
          <CompanyHeroBanner
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={handleSelectCompany}
            disabled={isTimerRunning}
          />
        </section>

        {/* 2. Barra de control de horas (con pop-ups de horas integrados y ticker de horas por empresa) */}
        <section aria-label="Barra de control de horas" className="w-full">
          <TimeTrackerBar
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            entries={entries}
            onAddEntry={handleAddEntry}
            onTimerRunningChange={setIsTimerRunning}
          />
        </section>

        {/* 3. Historial de registros agrupados con días desplegables y botón Repetir */}
        <section aria-label="Historial de registros" className="w-full pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#EAE4F5] gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#292929]">
                Registros <span className="text-[#8E0E75]">recientes</span>
              </h2>
              <p className="text-sm sm:text-base text-[#4A4A4A] font-light mt-0.5">
                Haz clic en cualquier día para plegar o desplegar • Pulsa &quot;Repetir&quot; para reanudar una tarea
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {pendingSyncCount > 0 ? (
                <div 
                  title="Tus registros están respaldados de forma segura en tu navegador y se subirán a la nube automáticamente al detectar conexión."
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-tight shadow-2xs"
                >
                  <CloudOff className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                  <span>{pendingSyncCount} en cola local (sincronizando...)</span>
                </div>
              ) : (
                <div 
                  title="Todos tus registros están sincronizados con la nube."
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-tight shadow-2xs"
                >
                  <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Sincronizado con la nube</span>
                </div>
              )}
              <div className="text-xs sm:text-sm text-[#191654] font-bold bg-[#F8F6FC] px-4 py-2 rounded-xl border-2 border-[#D8CFF0] tabular-nums shadow-2xs">
                Registros totales: <span className="font-black text-[#8E0E75] text-sm sm:text-base">{entries.length}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="w-full p-8 text-center text-xs text-[#4A4A4A] bg-white rounded-2xl border border-[#D8CFF0]">
              Cargando registros de tiempo...
            </div>
          ) : (
            <TimeEntriesList
              entries={entries}
              companies={companies}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              onRepeatEntry={handleRepeatEntry}
            />
          )}
        </section>
      </main>
    </div>
  );
}
