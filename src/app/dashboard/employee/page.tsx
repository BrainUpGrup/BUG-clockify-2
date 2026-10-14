'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { TimeTrackerBar } from '@/components/employee/time-tracker-bar';
import { EmployeeStats } from '@/components/employee/employee-stats';
import { TimeEntriesList } from '@/components/employee/time-entries-list';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_TIME_ENTRIES } from '@/lib/mock-data';
import { Company, TimeEntry } from '@/types/database';
import { Clock, ShieldCheck } from 'lucide-react';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Cargar datos estrictamente aislados del usuario actual
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setIsLoading(true);

      if (isSupabaseConnected) {
        try {
          const supabase = createClient();

          // 1. Cargar Empresas activas
          const { data: compData } = await supabase
            .from('companies')
            .select('*')
            .eq('is_active', true)
            .order('name');

          // 2. Cargar exclusivamente las horas del usuario actual
          const { data: entriesData } = await supabase
            .from('time_entries')
            .select('*, company:companies(*), profile:profiles(*)')
            .eq('user_id', user.id)
            .order('work_date', { ascending: false })
            .order('created_at', { ascending: false });

          if (compData) setCompanies(compData as Company[]);
          if (entriesData) setEntries(entriesData as unknown as TimeEntry[]);
        } catch (err) {
          console.error('Error cargando datos de Supabase:', err);
          setCompanies(MOCK_COMPANIES);
          const userEntries = MOCK_TIME_ENTRIES.filter((e) => e.user_id === user.id);
          setEntries(userEntries);
        }
      } else {
        setCompanies(MOCK_COMPANIES);
        // Filtrado estricto por user.id para proteger datos privados entre trabajadores
        const userEntries = MOCK_TIME_ENTRIES.filter((e) => e.user_id === user.id);
        setEntries(userEntries);
      }
      setIsLoading(false);
    }

    if (user) {
      fetchData();
    }
  }, [user, isSupabaseConnected]);

  // Handler para agregar nuevo registro
  const handleAddEntry = async (newEntryData: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'>) => {
    const selectedCompany = companies.find((c) => c.id === newEntryData.company_id);

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
          compute_type: newEntryData.compute_type || (selectedCompany?.client_type === 'cuota' ? 'cuota' : 'puntual'),
        })
        .select('*, company:companies(*), profile:profiles(*)')
        .single();

      if (error) {
        alert('Error al guardar el registro en Supabase: ' + error.message);
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
        compute_type: newEntryData.compute_type || (selectedCompany?.client_type === 'cuota' ? 'cuota' : 'puntual'),
        created_at: new Date().toISOString(),
        company: selectedCompany,
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
        alert('Error actualizando registro: ' + error.message);
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
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col w-full">
      <Navbar />

      {/* Contenedor Líquido a pantalla completa */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabecera Limpia y Perfectamente Alineada */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#292929] flex items-center gap-2.5">
              <Clock className="h-6 w-6 text-[#8E0E75] shrink-0" />
              <span>MI REGISTRO <span className="text-[#8E0E75]">HORARIO</span></span>
            </h1>
            <p className="text-xs text-[#4A4A4A] font-light mt-0.5">
              Control de jornada y tiempo imputado directamente por cliente
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider text-[#8E0E75]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#8E0E75]" />
              Supervisión de Agencia
            </span>
          </div>
        </div>

        {/* Barra superior de registro por empresa */}
        <section aria-label="Barra de entrada de horas" className="w-full">
          <TimeTrackerBar
            companies={companies}
            onAddEntry={handleAddEntry}
          />
        </section>

        {/* Resumen de horas en tarjetas fluidas */}
        <section aria-label="Resumen de horas" className="w-full">
          <EmployeeStats entries={entries} />
        </section>

        {/* Historial de registros agrupados */}
        <section aria-label="Historial de registros" className="w-full pt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-[#292929]">
                REGISTROS RECIENTES <span className="text-[#8E0E75]">POR CLIENTE</span>
              </h2>
              <p className="text-xs text-[#4A4A4A] font-light">Haz clic sobre cualquier hora o descripción para editarlo al instante</p>
            </div>
            <div className="text-xs text-[#4A4A4A] font-medium tabular-nums">
              Total de registros: <span className="font-extrabold text-[#8E0E75]">{entries.length}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="w-full p-12 text-center text-sm text-[#4A4A4A] bg-white rounded-sm border border-[#D8CFF0]">
              Cargando registros de tiempo...
            </div>
          ) : (
            <TimeEntriesList
              entries={entries}
              companies={companies}
              onUpdateEntry={handleUpdateEntry}
            />
          )}
        </section>
      </main>
    </div>
  );
}
