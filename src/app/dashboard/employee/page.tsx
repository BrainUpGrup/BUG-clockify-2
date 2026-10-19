'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompanyHeroBanner } from '@/components/employee/company-hero-banner';
import { TimeTrackerBar } from '@/components/employee/time-tracker-bar';
import { EmployeeStats } from '@/components/employee/employee-stats';
import { TimeEntriesList } from '@/components/employee/time-entries-list';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_TIME_ENTRIES } from '@/lib/mock-data';
import { Company, TimeEntry } from '@/types/database';
import { Clock, ShieldCheck } from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { notify, friendlyError, removeWithUndo } from '@/lib/feedback';
import { formatMinutes } from '@/lib/utils';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();
  const { setActiveCompany, activeCompanyId, setActiveCompanyId, startTimerWithEntry } = useTimer();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

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
      const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
      const cachedEntr = localStorage.getItem(`bug_clockify_cache_entries_${currentUserId}`);
      if (cachedComp) setCompanies(JSON.parse(cachedComp));
      if (cachedEntr) setEntries(JSON.parse(cachedEntr));
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

          if (compRes.data) {
            setCompanies(compRes.data as Company[]);
            localStorage.setItem('bug_clockify_cache_companies', JSON.stringify(compRes.data));
          }
          if (entriesRes.data) {
            setEntries(entriesRes.data as unknown as TimeEntry[]);
            localStorage.setItem(`bug_clockify_cache_entries_${currentUserId}`, JSON.stringify(entriesRes.data));
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

  // Handler para agregar nuevo registro
  const handleAddEntry = async (newEntryData: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'>) => {
    const targetCompany = companies.find((c) => c.id === newEntryData.company_id);

    if (isSupabaseConnected && user) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: newEntryData.company_id,
          work_date: newEntryData.work_date,
          start_time: newEntryData.start_time,
          end_time: newEntryData.end_time,
          duration_minutes: newEntryData.duration_minutes,
          description: newEntryData.description,
          compute_type: newEntryData.compute_type || (targetCompany?.client_type === 'cuota' ? 'cuota' : 'puntual'),
        })
        .select('*, company:companies(*), profile:profiles(*)')
        .single();

      if (error) {
        console.error(error);
        notify(friendlyError('guardar el registro'), { type: 'error' });
        return;
      }
      if (data) {
        setEntries((prev) => [data as unknown as TimeEntry, ...prev]);
      }
    } else {
      const mockEntry: TimeEntry = {
        id: 'mock_' + Date.now(),
        user_id: user?.id || 'u3',
        company_id: newEntryData.company_id,
        work_date: newEntryData.work_date,
        start_time: newEntryData.start_time,
        end_time: newEntryData.end_time,
        duration_minutes: newEntryData.duration_minutes,
        description: newEntryData.description,
        compute_type: newEntryData.compute_type || (targetCompany?.client_type === 'cuota' ? 'cuota' : 'puntual'),
        created_at: new Date().toISOString(),
        company: targetCompany,
        profile: user || undefined,
      };
      setEntries((prev) => [mockEntry, ...prev]);
    }
  };

  // Handler para actualizar registro
  const handleUpdateEntry = async (id: string, updatedFields: Partial<TimeEntry>) => {
    if (isSupabaseConnected) {
      const supabase = createClient();
      const { error } = await supabase
        .from('time_entries')
        .update(updatedFields)
        .eq('id', id);

      if (error) {
        console.error(error);
        notify(friendlyError('actualizar el registro'), { type: 'error' });
        return;
      }
    }

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

  // Handler para eliminar registro horario: se borra al instante y se ofrece "Deshacer"
  const handleDeleteEntry = async (id: string) => {
    const removed = entries.find((entry) => entry.id === id);
    if (!removed) return;

    if (isSupabaseConnected) {
      const supabase = createClient();
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(error);
        notify(friendlyError('eliminar el registro'), { type: 'error' });
        return;
      }
    }

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
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
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
    <div className="flex-1 flex flex-col bg-[#FFFFFF] w-full">
      {/* Contenedor Amplio y Heroico con Gran Presencia Visual */}
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-7 sm:space-y-8">
        
        {/* Cabecera Ampliada: HORAS POR CLIENTE */}
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F8F6FC] border-2 border-[#D8CFF0] text-xs sm:text-sm font-bold text-[#8E0E75] shadow-2xs hover:border-[#8E0E75]"
              >
                <ShieldCheck className="h-4 w-4 text-[#8E0E75]" />
                Ir a Coordinación
              </Link>
            </div>
          )}
        </div>

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
            <div className="text-xs sm:text-sm text-[#191654] font-bold bg-[#F8F6FC] px-4 py-2 rounded-xl border-2 border-[#D8CFF0] tabular-nums shadow-2xs self-start sm:self-auto">
              Registros totales: <span className="font-black text-[#8E0E75] text-sm sm:text-base">{entries.length}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="w-full p-8 text-center text-xs text-[#4A4A4A] bg-white rounded-sm border border-[#D8CFF0]">
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
