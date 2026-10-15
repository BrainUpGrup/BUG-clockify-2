'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { MonthlyReports } from '@/components/coordinator/monthly-reports';
import { CompanyCrud } from '@/components/coordinator/company-crud';
import { UserManagement } from '@/components/coordinator/user-management';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { 
  MOCK_COMPANIES, 
  MOCK_PROFILES, 
  MOCK_TIME_ENTRIES 
} from '@/lib/mock-data';
import { Company, Profile, TimeEntry, ClientType, UserRole } from '@/types/database';
import { 
  BarChart3, 
  Building2, 
  Users, 
  ShieldCheck,
  Palette,
  Sliders
} from 'lucide-react';
import { HubPermissionsMatrix } from '@/components/coordinator/hub-permissions-matrix';
import { LayerColorCustomizer } from '@/components/coordinator/layer-color-customizer';

export default function CoordinatorDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'reports' | 'companies' | 'users' | 'permissions' | 'customizer'>('reports');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Protección de ruta: Si no hay usuario va a login; si no es coordinadora va a su panel de empleado
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (user.role !== 'coordinator') {
        router.replace('/dashboard/employee');
      }
    }
  }, [user, authLoading, router]);

  // Cargar todos los datos clasificados por empresa y empleados en paralelo y con caché instantánea
  useEffect(() => {
    if (!user || user.role !== 'coordinator') return;

    // 1. Restaurar instantáneamente de caché local para 0ms de espera
    try {
      const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
      const cachedProf = localStorage.getItem('bug_clockify_cache_profiles');
      const cachedEntr = localStorage.getItem('bug_clockify_cache_entries');
      if (cachedComp) setCompanies(JSON.parse(cachedComp));
      if (cachedProf) setEmployees(JSON.parse(cachedProf));
      if (cachedEntr) setAllEntries(JSON.parse(cachedEntr));
      if (cachedComp || cachedProf) setIsLoading(false);
    } catch (e) {
      console.warn('Cache read notice:', e);
    }

    async function loadCoordinatorData() {
      if (isSupabaseConnected) {
        try {
          const supabase = createClient();

          // Ejecución ultra-rápida en PARALELO con Promise.all (sin efecto cascada)
          const [compRes, profRes, entriesRes] = await Promise.all([
            supabase.from('companies').select('*').order('name'),
            supabase.from('profiles').select('*').order('full_name'),
            supabase.from('time_entries').select('*, company:companies(*), profile:profiles(*)').order('work_date', { ascending: false }),
          ]);

          if (compRes.data) {
            setCompanies(compRes.data as Company[]);
            localStorage.setItem('bug_clockify_cache_companies', JSON.stringify(compRes.data));
          }
          if (profRes.data) {
            setEmployees(profRes.data as Profile[]);
            localStorage.setItem('bug_clockify_cache_profiles', JSON.stringify(profRes.data));
          }
          if (entriesRes.data) {
            setAllEntries(entriesRes.data as unknown as TimeEntry[]);
            localStorage.setItem('bug_clockify_cache_entries', JSON.stringify(entriesRes.data));
          }
        } catch (err) {
          console.error('Error cargando datos de Supabase, usando fallback:', err);
          setCompanies(MOCK_COMPANIES);
          setEmployees(MOCK_PROFILES);
          setAllEntries(MOCK_TIME_ENTRIES);
        }
      } else {
        // Fallback datos locales sin proyectos
        let allProfiles = [...MOCK_PROFILES];
        try {
          const storedPending = localStorage.getItem('bug_clockify_pending_users');
          if (storedPending) {
            const parsed = JSON.parse(storedPending) as Profile[];
            const existingIds = new Set(allProfiles.map((p) => p.id));
            parsed.forEach((p) => {
              if (!existingIds.has(p.id)) allProfiles.push(p);
            });
          }
        } catch (e) {
          console.error(e);
        }

        setCompanies(MOCK_COMPANIES);
        setEmployees(allProfiles);
        setAllEntries(MOCK_TIME_ENTRIES);
      }

      setIsLoading(false);
    }

    loadCoordinatorData();
  }, [user, isSupabaseConnected]);

  // Manejar creación rápida de empresas (soporta clientes cuota con horas y clientes puntuales)
  const handleCreateCompany = async (
    name: string,
    clientType: ClientType = 'cuota',
    quotaHours: number | null = 15,
    cif?: string,
    contactName?: string,
    contactEmail?: string
  ) => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .insert({
            name,
            client_type: clientType,
            monthly_hours_quota: clientType === 'cuota' ? quotaHours : null,
            cif: cif || null,
            contact_name: contactName || null,
            contact_email: contactEmail || null,
            is_active: true,
          })
          .select()
          .single();

        if (!error && data) {
          setCompanies((prev) => [...prev, data as Company]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const newComp: Company = {
        id: `c_${Date.now()}`,
        name,
        client_type: clientType,
        monthly_hours_quota: clientType === 'cuota' ? quotaHours : null,
        cif: cif || 'B-87654321',
        contact_name: contactName || 'Dirección de Marketing',
        contact_email: contactEmail || 'contacto@empresa.com',
        account_manager: 'Alejandro Ramos',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setCompanies((prev) => [...prev, newComp]);
    }
  };

  // Manejar aprobación de empleado registrado vía enlace de empresa
  const handleApproveUser = async (id: string) => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }

    // Actualizar también en localStorage si estaba guardado allí
    try {
      const stored = localStorage.getItem('bug_clockify_pending_users');
      if (stored) {
        const list = JSON.parse(stored) as Profile[];
        const updated = list.map((u) => (u.id === id ? { ...u, status: 'active' as const } : u));
        localStorage.setItem('bug_clockify_pending_users', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    setEmployees((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'active' as const } : u))
    );
  };

  // Manejar rechazo de solicitud de empleado
  const handleRejectUser = async (id: string) => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const stored = localStorage.getItem('bug_clockify_pending_users');
      if (stored) {
        const list = JSON.parse(stored) as Profile[];
        const filtered = list.filter((u) => u.id !== id);
        localStorage.setItem('bug_clockify_pending_users', JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }

    setEmployees((prev) => prev.filter((u) => u.id !== id));
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async (id: string) => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    setEmployees((prev) => prev.filter((u) => u.id !== id));
  };

  // Manejar toggle de estado de empresa (activar/archivar)
  const handleToggleCompanyStatus = async (id: string, currentStatus: boolean) => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase
          .from('companies')
          .update({ is_active: !currentStatus })
          .eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
    );
  };

  // Manejar eliminación de empresa
  const handleDeleteCompany = async (id: string) => {
    const hasEntries = allEntries.some((e) => e.company_id === id);
    if (hasEntries) {
      alert('No se puede eliminar una empresa que tiene horas imputadas. Puedes archivarla en su lugar.');
      return;
    }

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase.from('companies').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  if (authLoading || !user || user.role !== 'coordinator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Verificando permisos de coordinación...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF]">
      <Navbar />

      {/* Contenedor Líquido a Pantalla Completa con Animación de Entrada */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 page-transition">
        {/* Cabecera del Panel Líquida con Identidad Brain Up */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE4F5]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#292929] flex items-center gap-2.5">
              <BarChart3 className="h-6 w-6 text-[#8E0E75] shrink-0" />
              <span>PANEL GLOBAL <span className="text-[#8E0E75]">DE COORDINACIÓN</span></span>
            </h1>
            <p className="text-xs text-[#4A4A4A] font-light mt-0.5">
              Control de cuotas al milímetro, estadísticas profesionales, gestión de clientes y altas de usuarios
            </p>
          </div>

          {/* Navegación por Pestañas con Estilo Lila Abuela */}
          <div className="flex flex-wrap items-center rounded-sm bg-[#F8F6FC] p-1 border border-[#D8CFF0] text-xs font-bold shrink-0 gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Estadísticas e Informes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'companies'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Gestión de Empresas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Gestión de Usuarios</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Permisos del HUB</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'customizer'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Colores RGB</span>
            </button>
          </div>
        </div>

        {/* Contenido según la pestaña activa con transición animada suave */}
        <div key={activeTab} className="tab-transition">
          {isLoading ? (
            <div className="w-full p-12 text-center text-sm text-[#4A4A4A] bg-white rounded-sm border border-[#D8CFF0]">
              Cargando datos del panel de coordinador...
            </div>
          ) : activeTab === 'reports' ? (
            <MonthlyReports
              entries={allEntries}
              companies={companies}
              employees={employees}
            />
          ) : activeTab === 'companies' ? (
            <CompanyCrud
              companies={companies}
              entries={allEntries}
              onCreateCompany={handleCreateCompany}
              onToggleCompanyStatus={handleToggleCompanyStatus}
              onDeleteCompany={handleDeleteCompany}
            />
          ) : activeTab === 'users' ? (
            <UserManagement
              employees={employees}
              entries={allEntries}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              onDeleteUser={handleDeleteUser}
            />
          ) : activeTab === 'permissions' ? (
            <HubPermissionsMatrix employees={employees} />
          ) : (
            <LayerColorCustomizer />
          )}
        </div>
      </main>
    </div>
  );
}
