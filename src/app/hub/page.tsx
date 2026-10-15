'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { Profile } from '@/types/database';
import { 
  BRAIN_UP_HUB_APPS, 
  HubApp, 
  getAuthorizedAppsForUser 
} from '@/lib/hub-apps';
import { HubPermissionsMatrix } from '@/components/coordinator/hub-permissions-matrix';
import { LayerColorCustomizer } from '@/components/coordinator/layer-color-customizer';
import { 
  LayoutGrid, 
  Clock, 
  CheckSquare, 
  Image, 
  Users, 
  Receipt, 
  BookOpen, 
  Share2, 
  ArrowRight, 
  ShieldCheck, 
  Palette, 
  Sliders, 
  Sparkles,
  Lock,
  Layers,
  ExternalLink
} from 'lucide-react';

export default function BrainUpHubPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  const [activeTab, setActiveTab] = useState<'apps' | 'permissions' | 'customizer'>('apps');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [authorizedApps, setAuthorizedApps] = useState<HubApp[]>([]);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar aplicaciones autorizadas para el usuario actual
  useEffect(() => {
    if (!user) return;
    const apps = getAuthorizedAppsForUser(user);
    setAuthorizedApps(apps);
  }, [user, activeTab]);

  // Cargar lista de empleados si es coordinadora o admin
  useEffect(() => {
    if (!user || user.role === 'employee') return;

    async function loadTeam() {
      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');
          if (data && data.length > 0) {
            setAllProfiles(data as Profile[]);
            return;
          }
        } catch (e) {
          console.warn('Error loading team for hub permissions:', e);
        }
      }

      // Fallback local
      try {
        const stored = localStorage.getItem('bug_clockify_cache_profiles');
        if (stored) {
          setAllProfiles(JSON.parse(stored));
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      setAllProfiles(MOCK_PROFILES);
    }

    loadTeam();
  }, [user, isSupabaseConnected]);

  const renderAppIcon = (iconName: HubApp['iconName'], className = 'h-6 w-6') => {
    switch (iconName) {
      case 'Clock':
        return <Clock className={className} />;
      case 'CheckSquare':
        return <CheckSquare className={className} />;
      case 'Image':
        return <Image className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'Receipt':
        return <Receipt className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Share2':
        return <Share2 className={className} />;
      default:
        return <CheckSquare className={className} />;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Iniciando HUB Brain Up...
          </p>
        </div>
      </div>
    );
  }

  const isCoordinatorOrAdmin = user.role === 'coordinator' || user.role === 'admin';

  return (
    <div className="min-h-screen bg-[var(--hub-bg,#F8F6FC)] flex flex-col w-full font-sans">
      <Navbar />

      <main className="page-transition flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Cabecera Principal del HUB */}
        <div className="rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[#8E0E75]/10 text-[#8E0E75] text-[11px] font-extrabold uppercase tracking-wider border border-[#8E0E75]/20">
                <LayoutGrid className="h-3.5 w-3.5 text-[#8E0E75]" />
                SUITE EMPRESARIAL INTERCONECTADA
              </span>
              <span className="text-xs font-bold text-[#4A4A4A] bg-[#F8F6FC] px-2 py-0.5 rounded-sm border border-[#D8CFF0]">
                {authorizedApps.length} {authorizedApps.length === 1 ? 'herramienta habilitada' : 'herramientas habilitadas'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#292929]">
              HUB CENTRAL <span className="text-[#8E0E75]">BRAIN UP</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#4A4A4A] font-light max-w-2xl">
              Hola, <strong>{user.full_name}</strong>. Accede a tus herramientas de trabajo autorizadas desde este panel central unificado.
            </p>
          </div>

          {/* Tarjeta de Rol & Estado */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="text-right">
              <span className="block text-xs font-extrabold text-[#292929]">
                {user.role === 'admin' ? 'Super Administrador' : user.role === 'coordinator' ? 'Coordinadora de Agencia' : 'Trabajador / Empleado'}
              </span>
              <span className="text-[11px] font-mono text-[#8E0E75]">
                {user.email}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
              {user.full_name?.charAt(0) || 'B'}
            </div>
          </div>
        </div>

        {/* Pestañas de Gestión para Coordinadoras y Administradores */}
        {isCoordinatorOrAdmin && (
          <div className="flex border-b border-[#D8CFF0] gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('apps')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-sm text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'apps'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <LayoutGrid className={`h-4 w-4 ${activeTab === 'apps' ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Mis Herramientas ({authorizedApps.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-sm text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <ShieldCheck className={`h-4 w-4 ${activeTab === 'permissions' ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Matriz de Permisos por Trabajador</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-sm text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'customizer'
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white'
              }`}
            >
              <Palette className={`h-4 w-4 ${activeTab === 'customizer' ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Personalización de Colores RGB</span>
            </button>
          </div>
        )}

        {/* CONTENIDO CON ANIMACIÓN SUAVE SEGÚN PESTAÑA */}
        <div key={activeTab} className="tab-transition">
          
          {/* VISTA 1: DASHBOARD DE APLICACIONES PERMITIDAS */}
          {activeTab === 'apps' && (
            <div className="space-y-6">
              
              {/* Resumen de Herramientas Disponibles */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-[#292929]">
                    APLICACIONES <span className="text-[#8E0E75]">DISPONIBLES</span>
                  </h2>
                  <p className="text-xs text-[#4A4A4A] font-light">
                    Selecciona la herramienta con la que deseas trabajar hoy
                  </p>
                </div>

                <div className="text-xs text-[#4A4A4A] font-medium">
                  {authorizedApps.length} de {BRAIN_UP_HUB_APPS.length} herramientas en tu perfil
                </div>
              </div>

              {/* Grid de Aplicaciones del HUB */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {authorizedApps.map((app) => {
                  // Destino de Clockify según si es coordinador o empleado
                  let targetHref = app.route;
                  if (app.id === 'clockify') {
                    targetHref = user.role === 'coordinator' ? '/dashboard/coordinator' : '/dashboard/employee';
                  }

                  return (
                    <div
                      key={app.id}
                      className="group relative rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-xs hover:shadow-md hover:border-[#8E0E75]/60 transition-all duration-200 flex flex-col justify-between"
                    >
                      {/* Cabecera de la Tarjeta */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0] group-hover:bg-[#8E0E75] group-hover:text-white transition-all shadow-xs">
                            {renderAppIcon(app.iconName, 'h-6 w-6')}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                                app.id === 'clockify'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : app.id === 'taskflow'
                                  ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {app.badge}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              v{app.version}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-base text-[#292929] group-hover:text-[#8E0E75] transition-colors uppercase tracking-tight">
                            {app.name}
                          </h3>
                          <p className="text-xs font-semibold text-[#8E0E75] mt-0.5">
                            {app.tagline}
                          </p>
                        </div>

                        <p className="text-xs text-[#4A4A4A] leading-relaxed line-clamp-3 font-light">
                          {app.description}
                        </p>
                      </div>

                      {/* Botón de Entrada a la Aplicación */}
                      <div className="pt-5 mt-4 border-t border-[#EAE4F5]">
                        <Link
                          href={targetHref}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-[#F8F6FC] hover:bg-[#8E0E75] text-[#292929] hover:text-white font-extrabold text-xs uppercase tracking-wider border border-[#D8CFF0] hover:border-[#8E0E75] transition-all cursor-pointer group/btn"
                        >
                          <span>Acceder a la Aplicación</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Si el trabajador tiene permisos reducidos, aviso positivo de limpieza visual */}
              {authorizedApps.length < BRAIN_UP_HUB_APPS.length && !isCoordinatorOrAdmin && (
                <div className="p-4 rounded-sm border border-[#D8CFF0] bg-white flex items-center gap-3 text-xs text-[#4A4A4A]">
                  <Sparkles className="h-5 w-5 text-[#8E0E75] shrink-0" />
                  <span>
                    Tu perfil está configurado en <strong>Modo Limpio</strong> con {authorizedApps.length} de las {BRAIN_UP_HUB_APPS.length} herramientas totales de Brain Up. Si precisas activar herramientas adicionales, consulta con tu coordinadora de cuenta.
                  </span>
                </div>
              )}

            </div>
          )}

          {/* VISTA 2: MATRIZ DE PERMISOS PARA COORDINADORES */}
          {activeTab === 'permissions' && isCoordinatorOrAdmin && (
            <HubPermissionsMatrix employees={allProfiles} />
          )}

          {/* VISTA 3: PERSONALIZADOR DE COLORES RGB POR CAPAS */}
          {activeTab === 'customizer' && isCoordinatorOrAdmin && (
            <LayerColorCustomizer />
          )}

        </div>

      </main>
    </div>
  );
}
