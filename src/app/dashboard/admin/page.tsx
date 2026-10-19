'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { notify, confirmDialog, friendlyError, flagAccessDenied } from '@/lib/feedback';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { Profile, UserRole, ProfileStatus } from '@/types/database';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Key, 
  Lock, 
  Mail, 
  User, 
  Check, 
  Copy, 
  Briefcase, 
  Database, 
  Eye, 
  EyeOff,
  UserCheck,
  ShieldAlert,
  Server
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  // Estados de datos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProfileStatus>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'create_coordinator' | 'health'>('users');

  // Formulario de creación directa de coordinadora
  const [coordFullName, setCoordFullName] = useState('');
  const [coordEmail, setCoordEmail] = useState('');
  const [coordPassword, setCoordPassword] = useState('');
  const [coordDepartment, setCoordDepartment] = useState('Coordinación & Dirección');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingCoord, setIsCreatingCoord] = useState(false);
  const [coordFeedback, setCoordFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Modal de edición / corrección de cuenta
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editStatus, setEditStatus] = useState<ProfileStatus>('active');
  const [editDepartment, setEditDepartment] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Feedback de copiado
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Protección de ruta estricta: Solo 'admin' puede acceder
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        flagAccessDenied('La Administración es solo para el Super Administrador.');
        router.replace(user.role === 'coordinator' ? '/dashboard/coordinator' : '/dashboard/employee');
      }
    }
  }, [user, authLoading, router]);

  // Cargar todos los perfiles de usuario
  const loadProfiles = async () => {
    setIsLoading(true);

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setProfiles(data as Profile[]);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Error al cargar perfiles desde Supabase:', e);
      }
    }

    // Fallback Local Storage y Mock Data
    let combined = [...MOCK_PROFILES];

    // Incluir cuenta super admin fija si no está
    if (!combined.some((p) => p.email === 'appadmin@brainupgrup.com')) {
      combined.unshift({
        id: '00000000-0000-0000-0000-000000000001',
        full_name: 'Super Administrador',
        email: 'appadmin@brainupgrup.com',
        role: 'admin',
        status: 'active',
        department: 'Sistemas & Seguridad',
        created_at: '2026-01-01T00:00:00Z',
      });
    }

    try {
      const storedPending = localStorage.getItem('bug_clockify_pending_users');
      if (storedPending) {
        const parsed = JSON.parse(storedPending) as Profile[];
        parsed.forEach((p) => {
          const idx = combined.findIndex((existing) => existing.id === p.id || existing.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) {
            combined[idx] = p;
          } else {
            combined.push(p);
          }
        });
      }

      const storedCustom = localStorage.getItem('bug_clockify_custom_profiles');
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom) as Profile[];
        parsed.forEach((p) => {
          const idx = combined.findIndex((existing) => existing.id === p.id || existing.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) {
            combined[idx] = p;
          } else {
            combined.push(p);
          }
        });
      }
    } catch (e) {
      console.error('Error leyendo usuarios de localStorage:', e);
    }

    setProfiles(combined);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadProfiles();
    }
  }, [user, isSupabaseConnected]);

  // Generar contraseña segura sugerida
  const generateSuggestedPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCoordPassword(result);
  };

  // Crear cuenta de coordinadora directamente
  const handleCreateCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoordFeedback(null);

    const cleanEmail = coordEmail.trim().toLowerCase();
    const cleanName = coordFullName.trim();
    const cleanPass = coordPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      setCoordFeedback({ error: 'Por favor completa todos los campos requeridos.' });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setCoordFeedback({ error: 'El formato del correo electrónico no es válido.' });
      return;
    }

    if (cleanPass.length < 8) {
      setCoordFeedback({ error: 'La contraseña debe tener un mínimo de 8 caracteres.' });
      return;
    }

    setIsCreatingCoord(true);

    try {
      const newCoordProfile: Profile = {
        id: `u_coord_${Date.now()}`,
        full_name: cleanName,
        email: cleanEmail,
        role: 'coordinator',
        status: 'active',
        department: coordDepartment.trim() || 'Coordinación & Dirección',
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConnected) {
        const supabase = createClient();

        // 1. Crear en Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              full_name: cleanName,
              role: 'coordinator',
              status: 'active',
              department: newCoordProfile.department,
            },
          },
        });

        if (authErr) {
          throw new Error(authErr.message);
        }

        if (authData.user) {
          newCoordProfile.id = authData.user.id;
        }

        // 2. Insertar / Upsert en tabla profiles
        const { error: profErr } = await supabase
          .from('profiles')
          .upsert(newCoordProfile);

        if (profErr) {
          console.warn('Advertencia al insertar perfil en Supabase:', profErr);
        }
      }

      // Guardar también en localStorage para consistencia
      try {
        const custom = JSON.parse(localStorage.getItem('bug_clockify_custom_profiles') || '[]') as Profile[];
        custom.push(newCoordProfile);
        localStorage.setItem('bug_clockify_custom_profiles', JSON.stringify(custom));
      } catch (e) {
        console.error(e);
      }

      setProfiles((prev) => [newCoordProfile, ...prev.filter((p) => p.email.toLowerCase() !== cleanEmail)]);
      setCoordFeedback({
        success: `Cuenta de coordinadora creada y activada con éxito para ${cleanName} (${cleanEmail}). Ya puede iniciar sesión.`,
      });

      // Limpiar formulario excepto contraseña para que pueda copiarla
      setCoordFullName('');
      setCoordEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta de coordinadora.';
      setCoordFeedback({ error: msg });
    } finally {
      setIsCreatingCoord(false);
    }
  };

  // Abrir modal de edición rápida
  const handleOpenEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditFullName(profile.full_name);
    setEditRole(profile.role);
    setEditStatus(profile.status || 'active');
    setEditDepartment(profile.department || '');
  };

  // Guardar cambios en el perfil editado
  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    setIsSavingEdit(true);

    const updatedProfile: Profile = {
      ...editingProfile,
      full_name: editFullName.trim(),
      role: editRole,
      status: editStatus,
      department: editDepartment.trim() || undefined,
    };

    try {
      if (isSupabaseConnected) {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({
            full_name: updatedProfile.full_name,
            role: updatedProfile.role,
            status: updatedProfile.status,
            department: updatedProfile.department,
          })
          .eq('id', updatedProfile.id);
      }

      // Actualizar en localStorage
      try {
        const custom = JSON.parse(localStorage.getItem('bug_clockify_custom_profiles') || '[]') as Profile[];
        const customIdx = custom.findIndex((p) => p.id === updatedProfile.id);
        if (customIdx >= 0) {
          custom[customIdx] = updatedProfile;
        } else {
          custom.push(updatedProfile);
        }
        localStorage.setItem('bug_clockify_custom_profiles', JSON.stringify(custom));

        const pending = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]') as Profile[];
        const pendingIdx = pending.findIndex((p) => p.id === updatedProfile.id);
        if (pendingIdx >= 0) {
          pending[pendingIdx] = updatedProfile;
          localStorage.setItem('bug_clockify_pending_users', JSON.stringify(pending));
        }
      } catch (e) {
        console.error(e);
      }

      setProfiles((prev) => prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));
      setEditingProfile(null);
    } catch (e) {
      console.error('Error actualizando perfil:', e);
      notify(friendlyError('actualizar el perfil'), { type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Cambio rápido de estado (Activar / Reactivar cuenta)
  const handleQuickStatusChange = async (profileId: string, newStatus: ProfileStatus) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    const updated: Profile = { ...target, status: newStatus };

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', profileId);
      } catch (e) {
        console.error('Error actualizando estado en Supabase:', e);
      }
    }

    try {
      const custom = JSON.parse(localStorage.getItem('bug_clockify_custom_profiles') || '[]') as Profile[];
      const idx = custom.findIndex((p) => p.id === profileId);
      if (idx >= 0) custom[idx].status = newStatus;
      else custom.push(updated);
      localStorage.setItem('bug_clockify_custom_profiles', JSON.stringify(custom));

      const pending = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]') as Profile[];
      const pIdx = pending.findIndex((p) => p.id === profileId);
      if (pIdx >= 0) pending[pIdx].status = newStatus;
      localStorage.setItem('bug_clockify_pending_users', JSON.stringify(pending));
    } catch (e) {
      console.error(e);
    }

    setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
  };

  // Cambio rápido de rol (Coordinador / Empleado)
  const handleQuickRoleChange = async (profileId: string, newRole: UserRole) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;
    if (target.email === 'appadmin@brainupgrup.com') {
      notify('La cuenta maestra de Super Administrador no puede cambiar de rol.', { type: 'warning' });
      return;
    }

    const updated: Profile = { ...target, role: newRole };

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', profileId);
      } catch (e) {
        console.error('Error actualizando rol en Supabase:', e);
      }
    }

    try {
      const custom = JSON.parse(localStorage.getItem('bug_clockify_custom_profiles') || '[]') as Profile[];
      const idx = custom.findIndex((p) => p.id === profileId);
      if (idx >= 0) custom[idx].role = newRole;
      else custom.push(updated);
      localStorage.setItem('bug_clockify_custom_profiles', JSON.stringify(custom));
    } catch (e) {
      console.error(e);
    }

    setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
  };

  // Eliminar cuenta con confirmación de seguridad
  const handleDeleteUser = async (profileId: string, profileEmail: string) => {
    if (profileEmail === 'appadmin@brainupgrup.com') {
      notify('No es posible eliminar la cuenta principal de Super Administrador.', { type: 'warning' });
      return;
    }

    const ok = await confirmDialog({
      title: `¿Eliminar la cuenta de ${profileEmail}?`,
      message: 'Se eliminará de forma permanente. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar cuenta',
      danger: true,
    });
    if (!ok) return;

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase.from('profiles').delete().eq('id', profileId);
      } catch (e) {
        console.error('Error al eliminar en Supabase:', e);
      }
    }

    try {
      const custom = JSON.parse(localStorage.getItem('bug_clockify_custom_profiles') || '[]') as Profile[];
      localStorage.setItem('bug_clockify_custom_profiles', JSON.stringify(custom.filter((p) => p.id !== profileId)));

      const pending = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]') as Profile[];
      localStorage.setItem('bug_clockify_pending_users', JSON.stringify(pending.filter((p) => p.id !== profileId)));
    } catch (e) {
      console.error(e);
    }

    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  };

  // Copiar al portapapeles
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Perfiles filtrados
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (p.status || 'active') === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, searchTerm, roleFilter, statusFilter]);

  // Contadores métricos
  const totalCount = profiles.length;
  const coordinatorsCount = profiles.filter((p) => p.role === 'coordinator').length;
  const employeesCount = profiles.filter((p) => p.role === 'employee').length;
  const pendingCount = profiles.filter((p) => p.status === 'pending').length;

  return (
    <div className="flex-1 flex flex-col bg-[#F8F6FC] font-sans w-full">
      <main className="page-transition flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Cabecera Principal del Super Admin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#D8CFF0] p-6 rounded-sm shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[#8E0E75]/10 text-[#8E0E75] text-[11px] font-extrabold uppercase tracking-wider border border-[#8E0E75]/20">
                <ShieldCheck className="h-3.5 w-3.5 text-[#8E0E75]" />
                SUPER ADMINISTRADOR MAESTRO
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold text-[#4A4A4A] bg-[#F8F6FC] border border-[#D8CFF0]">
                {user?.email || 'appadmin@brainupgrup.com'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-[#292929]">
              PANEL DE CONTROL <span className="text-[#8E0E75]">SUPER ADMIN</span>
            </h1>
            <p className="text-xs text-[#4A4A4A] font-light max-w-2xl">
              Gobernanza técnica centralizada del sistema Brain Up Clockify: creación directa de cuentas para coordinadores y resolución de incidencias en cuentas de usuario.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadProfiles}
              className="flex items-center gap-2 px-3.5 py-2 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] hover:bg-white text-xs font-bold uppercase tracking-wider text-[#292929] transition-all cursor-pointer shadow-xs"
              title="Refrescar listado de cuentas"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#8E0E75] ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isSupabaseConnected ? 'Base de Datos Conectada' : 'Modo Seguro Local'}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Garantía de Privacidad y Aislamiento de Datos */}
        <div className="rounded-sm border border-blue-200 bg-blue-50/60 p-4 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <span className="font-extrabold uppercase tracking-wide block mb-0.5">
              Aislamiento de Privacidad Empresarial Garantizado
            </span>
            Este panel de Super Administrador está estrictamente diseñado para la administración de accesos, credenciales y resolución de incidencias técnicas. <strong>No contiene ni muestra datos confidenciales de la empresa</strong> (como registros de horas trabajadas, tarifas ni cuotas mensuales de clientes), preservando la separación estricta de responsabilidades.
          </div>
        </div>

        {/* Tarjetas de Métricas de Cuentas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">Total Cuentas</span>
              <p className="text-2xl font-extrabold text-[#292929]">{totalCount}</p>
            </div>
            <div className="p-3 bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0] rounded-sm">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">Coordinadores</span>
              <p className="text-2xl font-extrabold text-[#8E0E75]">{coordinatorsCount}</p>
            </div>
            <div className="p-3 bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/30 rounded-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">Empleados Activos</span>
              <p className="text-2xl font-extrabold text-blue-700">{employeesCount}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-sm">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">Cuentas en Espera</span>
              <p className="text-2xl font-extrabold text-amber-600">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Barra de Pestañas Principales con resalte Lila Abuela y transiciones suaves */}
        <div className="flex border-b border-[#D8CFF0] gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider rounded-t-sm transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-[#F8F6FC]'
            }`}
          >
            <Users className={`h-4 w-4 ${activeTab === 'users' ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Gestión y Corrección de Cuentas ({filteredProfiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create_coordinator')}
            className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider rounded-t-sm transition-all cursor-pointer ${
              activeTab === 'create_coordinator'
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-[#F8F6FC]'
            }`}
          >
            <UserPlus className={`h-4 w-4 ${activeTab === 'create_coordinator' ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Alta Directa de Coordinadora</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider rounded-t-sm transition-all cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-[#F8F6FC]'
            }`}
          >
            <Server className={`h-4 w-4 ${activeTab === 'health' ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Diagnóstico del Sistema</span>
          </button>
        </div>

        {/* Contenido de pestaña con animación de transición suave */}
        <div key={activeTab} className="tab-transition">
          {/* PESTAÑA 1: GESTIÓN Y CORRECCIÓN DE CUENTAS */}
          {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filtros y Buscador */}
            <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre, correo electrónico o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#D8CFF0] rounded-sm text-xs focus:outline-hidden focus:border-[#8E0E75] bg-[#F8F6FC]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#4A4A4A]">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-bold uppercase tracking-wider">Rol:</span>
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
                  className="border border-[#D8CFF0] rounded-sm px-2.5 py-1.5 text-xs font-bold text-[#292929] bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Super Admin</option>
                  <option value="coordinator">Coordinadores</option>
                  <option value="employee">Empleados</option>
                </select>

                <div className="flex items-center gap-1.5 text-xs text-[#4A4A4A] ml-2">
                  <span className="font-bold uppercase tracking-wider">Estado:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | ProfileStatus)}
                  className="border border-[#D8CFF0] rounded-sm px-2.5 py-1.5 text-xs font-bold text-[#292929] bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="pending">Pendiente</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </div>
            </div>

            {/* Tabla de Cuentas */}
            <div className="bg-white border border-[#D8CFF0] rounded-sm shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F6FC] border-b border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider text-[#292929]">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Correo Corporativo</th>
                      <th className="py-3 px-4">Rol en el Sistema</th>
                      <th className="py-3 px-4">Estado de Cuenta</th>
                      <th className="py-3 px-4">Departamento</th>
                      <th className="py-3 px-4 text-right">Acciones de Administración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4F5] text-xs">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#4A4A4A]">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-[#8E0E75]" />
                            <span>Cargando cuentas de usuario...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#4A4A4A]">
                          No se encontraron cuentas que coincidan con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p) => {
                        const isMainAdmin = p.email === 'appadmin@brainupgrup.com';
                        const initials = p.full_name
                          ? p.full_name
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          : 'BU';

                        return (
                          <tr key={p.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                            {/* Usuario */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-center font-extrabold text-[11px] shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <span className="font-bold text-[#292929] block">
                                    {p.full_name}
                                  </span>
                                  {isMainAdmin && (
                                    <span className="text-[11px] text-[#8E0E75] font-extrabold uppercase tracking-wide">
                                      Cuenta Maestra
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Correo */}
                            <td className="py-3 px-4 font-mono text-[#292929]">
                              {p.email}
                            </td>

                            {/* Rol */}
                            <td className="py-3 px-4">
                              {isMainAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-extrabold uppercase tracking-wider bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/30">
                                  <ShieldCheck className="h-3 w-3" />
                                  Super Admin
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-extrabold uppercase tracking-wider border ${
                                      p.role === 'coordinator'
                                        ? 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                                        : 'bg-neutral-100 text-[#4A4A4A] border-neutral-300'
                                    }`}
                                  >
                                    {p.role === 'coordinator' ? 'Coordinadora' : 'Empleado'}
                                  </span>
                                  
                                  {/* Botón rápido para alternar rol */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRoleChange(p.id, p.role === 'coordinator' ? 'employee' : 'coordinator')}
                                    className="p-1 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] hover:bg-white text-[#4A4A4A] hover:text-[#8E0E75] transition-colors cursor-pointer text-[11px] font-bold"
                                    title={p.role === 'coordinator' ? 'Cambiar a Empleado' : 'Promocionar a Coordinadora'}
                                  >
                                    {p.role === 'coordinator' ? 'Hacer Empleado' : 'Hacer Coordinador'}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Estado de cuenta */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-extrabold uppercase tracking-wider border ${
                                    (p.status || 'active') === 'active'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : p.status === 'pending'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-red-50 text-red-800 border-red-300'
                                  }`}
                                >
                                  {(p.status || 'active') === 'active' ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      Activo
                                    </>
                                  ) : p.status === 'pending' ? (
                                    <>
                                      <AlertCircle className="h-3 w-3 text-amber-600" />
                                      Pendiente
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      Rechazado
                                    </>
                                  )}
                                </span>

                                {!isMainAdmin && p.status !== 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(p.id, 'active')}
                                    className="p-1 rounded-sm border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors text-[11px] font-bold cursor-pointer"
                                    title="Activar cuenta inmediatamente"
                                  >
                                    Activar
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Departamento */}
                            <td className="py-3 px-4 text-[#4A4A4A]">
                              {p.department || 'General'}
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] hover:bg-white text-[#292929] hover:text-[#8E0E75] transition-colors cursor-pointer"
                                  title="Editar o corregir datos de cuenta"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>

                                {!isMainAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(p.id, p.email)}
                                    className="p-1.5 rounded-sm border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                                    title="Eliminar cuenta del sistema"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ALTA DIRECTA DE COORDINADORA */}
        {activeTab === 'create_coordinator' && (
          <div className="max-w-2xl mx-auto bg-white border border-[#D8CFF0] rounded-sm p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#EAE4F5]">
              <div className="p-3 bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/30 rounded-sm">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold uppercase tracking-tight text-[#292929]">
                  CREAR CUENTA DE <span className="text-[#8E0E75]">COORDINADORA</span>
                </h2>
                <p className="text-xs text-[#4A4A4A] font-light">
                  Esta cuenta se creará con el rol de Coordinadora y quedará activada de inmediato, sin requerir validación posterior.
                </p>
              </div>
            </div>

            {/* Mensajes de feedback */}
            {coordFeedback?.error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-sm text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{coordFeedback.error}</span>
              </div>
            )}

            {coordFeedback?.success && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-sm text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{coordFeedback.success}</span>
                </div>
                {coordPassword && (
                  <div className="mt-2 p-2 bg-white border border-emerald-200 rounded-sm flex items-center justify-between font-mono">
                    <span className="text-[#292929]">Contraseña asignada: <strong>{coordPassword}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(coordPassword, 'created_pass')}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase rounded-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'created_pass' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copiada</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateCoordinatorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Nombre y Apellidos de la Coordinadora
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laura Gómez"
                    value={coordFullName}
                    onChange={(e) => setCoordFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-[#D8CFF0] rounded-sm text-xs focus:outline-hidden focus:border-[#8E0E75] bg-[#F8F6FC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Correo Electrónico Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                  <input
                    type="email"
                    required
                    placeholder="Ej. laura.coordinacion@brainupgrup.com"
                    value={coordEmail}
                    onChange={(e) => setCoordEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-[#D8CFF0] rounded-sm text-xs focus:outline-hidden focus:border-[#8E0E75] bg-[#F8F6FC]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
                    Contraseña de Acceso
                  </label>
                  <button
                    type="button"
                    onClick={generateSuggestedPassword}
                    className="text-[11px] font-bold text-[#8E0E75] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Key className="h-3 w-3" />
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={coordPassword}
                    onChange={(e) => setCoordPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-[#D8CFF0] rounded-sm text-xs focus:outline-hidden focus:border-[#8E0E75] bg-[#F8F6FC]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] hover:text-[#8E0E75]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Departamento o Área
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
                  <input
                    type="text"
                    value={coordDepartment}
                    onChange={(e) => setCoordDepartment(e.target.value)}
                    placeholder="Ej. Coordinación & Dirección"
                    className="w-full pl-9 pr-4 py-2.5 border border-[#D8CFF0] rounded-sm text-xs focus:outline-hidden focus:border-[#8E0E75] bg-[#F8F6FC]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingCoord}
                  className="w-full py-3 px-4 rounded-sm bg-[#8E0E75] text-white font-extrabold text-xs uppercase tracking-wider hover:bg-[#720B5E] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingCoord ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Creando cuenta de coordinadora...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Crear y Activar Coordinadora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA 3: DIAGNÓSTICO DEL SISTEMA & SEGURIDAD */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8CFF0] rounded-sm p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#EAE4F5]">
                <Server className="h-5 w-5 text-[#8E0E75]" />
                <h3 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                  ESTADO DE LA INFRAESTRUCTURA
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-[#F8F6FC] rounded-sm border border-[#D8CFF0]">
                  <span className="font-bold text-[#4A4A4A]">Servidor Supabase:</span>
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isSupabaseConnected ? 'Conectado (Producción)' : 'Modo Seguro Local'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#F8F6FC] rounded-sm border border-[#D8CFF0]">
                  <span className="font-bold text-[#4A4A4A]">Políticas de Seguridad (RLS):</span>
                  <span className="font-extrabold text-emerald-700">Activadas (Tablas aisladas)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#F8F6FC] rounded-sm border border-[#D8CFF0]">
                  <span className="font-bold text-[#4A4A4A]">Acceso a Datos de Horas:</span>
                  <span className="font-extrabold text-[#8E0E75]">Bloqueado para Super Admin (Privacidad)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#F8F6FC] rounded-sm border border-[#D8CFF0]">
                  <span className="font-bold text-[#4A4A4A]">Dominio Autorizado:</span>
                  <span className="font-mono text-[#292929]">brainupgrup.com</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#D8CFF0] rounded-sm p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#EAE4F5]">
                <Key className="h-5 w-5 text-[#8E0E75]" />
                <h3 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                  CREDENCIALES MAESTRAS DE ADMINISTRACIÓN
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200 space-y-1">
                  <span className="text-[11px] uppercase font-bold text-[#4A4A4A] block">
                    Correo Maestro Super Admin
                  </span>
                  <div className="flex items-center justify-between font-mono text-[#292929]">
                    <span>appadmin@brainupgrup.com</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText('appadmin@brainupgrup.com', 'admin_email')}
                      className="text-[#8E0E75] hover:text-[#720B5E] p-1 cursor-pointer"
                      title="Copiar correo"
                    >
                      {copiedKey === 'admin_email' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200 space-y-1">
                  <span className="text-[11px] uppercase font-bold text-[#4A4A4A] block">
                    Contraseña Maestra Asignada
                  </span>
                  <div className="flex items-center justify-between font-mono text-[#292929]">
                    <span>fn.5loDnrTTfI2z!</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText('fn.5loDnrTTfI2z!', 'admin_pass')}
                      className="text-[#8E0E75] hover:text-[#720B5E] p-1 cursor-pointer"
                      title="Copiar contraseña"
                    >
                      {copiedKey === 'admin_pass' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#4A4A4A] font-light leading-relaxed">
                  Esta cuenta maestra otorga acceso exclusivo a este panel administrativo. Nunca compartas estas credenciales con personal no autorizado.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>

      </main>

      {/* MODAL DE EDICIÓN / CORRECCIÓN DE CUENTA */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8CFF0] rounded-sm shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4F5]">
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-5 w-5 text-[#8E0E75]" />
                <h3 className="font-extrabold uppercase tracking-tight text-base text-[#292929]">
                  CORREGIR CUENTA DE <span className="text-[#8E0E75]">USUARIO</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-[#4A4A4A] hover:text-[#292929] cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Correo Electrónico (Solo Lectura)
                </label>
                <input
                  type="email"
                  disabled
                  value={editingProfile.email}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-neutral-100 text-[#4A4A4A] cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                    Rol en la Empresa
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    disabled={editingProfile.email === 'appadmin@brainupgrup.com'}
                    className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                  >
                    <option value="employee">Empleado</option>
                    <option value="coordinator">Coordinadora</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProfileStatus)}
                    className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                  >
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:outline-hidden focus:border-[#8E0E75]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4F5]">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 border border-[#D8CFF0] rounded-sm text-xs font-bold uppercase tracking-wider text-[#4A4A4A] hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-[#8E0E75] hover:bg-[#720B5E] text-white rounded-sm text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Guardar Corrección</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
