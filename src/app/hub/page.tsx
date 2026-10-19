'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  MessageSquare,
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

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const targetTab = hoveredTab || activeTab;

  useEffect(() => {
    const updatePill = () => {
      if (!tabsContainerRef.current) return;
      const targetEl = tabsContainerRef.current.querySelector(`[data-tab-id="${targetTab}"]`) as HTMLElement;
      if (targetEl) {
        setPillStyle({
          left: targetEl.offsetLeft,
          width: targetEl.offsetWidth,
          opacity: 1,
        });
      }
    };
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [targetTab, activeTab, authorizedApps.length]);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar aplicaciones autorizadas para el usuario actual con sincronización en tiempo real
  useEffect(() => {
    if (!user) return;
    const updateApps = () => {
      const apps = getAuthorizedAppsForUser(user);
      setAuthorizedApps(apps);
    };
    updateApps();
    window.addEventListener('bug_permissions_updated', updateApps);
    window.addEventListener('storage', updateApps);
    return () => {
      window.removeEventListener('bug_permissions_updated', updateApps);
      window.removeEventListener('storage', updateApps);
    };
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
            const existingIds = new Set(data.map((p) => p.id));
            const merged = [...data];
            MOCK_PROFILES.forEach((mockP) => {
              if (!existingIds.has(mockP.id)) merged.push(mockP);
            });
            setAllProfiles(merged as Profile[]);
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
          const parsed = JSON.parse(stored);
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const merged = [...parsed];
          MOCK_PROFILES.forEach((mockP) => {
            if (!existingIds.has(mockP.id)) merged.push(mockP);
          });
          setAllProfiles(merged);
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
      case 'MessageSquare':
        return <MessageSquare className={className} />;
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
    <div className="flex-1 flex flex-col w-full font-sans">
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10">
        
        {/* Cabecera Principal del HUB con Dimensiones Hero */}
        <div className="rounded-2xl border-2 border-[#D8CFF0] bg-white p-7 sm:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#8E0E75]/10 text-[#8E0E75] text-xs sm:text-sm font-extrabold uppercase tracking-tight border border-[#8E0E75]/30">
                <LayoutGrid className="h-4 w-4 text-[#8E0E75]" />
                SUITE EMPRESARIAL INTERCONECTADA
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#4A4A4A] bg-[#F8F6FC] px-3.5 py-1 rounded-md border border-[#D8CFF0]">
                {authorizedApps.length} {authorizedApps.length === 1 ? 'herramienta habilitada' : 'herramientas habilitadas'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#292929] leading-tight">
              HUB CENTRAL <span className="text-[#8E0E75]">BRAIN UP</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-[#4A4A4A] font-light max-w-3xl leading-relaxed">
              Hola, <strong className="font-bold text-[#191654]">{user.full_name}</strong>. Accede a tus herramientas de trabajo autorizadas desde este panel central unificado.
            </p>
          </div>

          {/* Tarjeta de Rol & Estado en Escala Destacada */}
          <div className="flex items-center gap-4 shrink-0 self-start md:self-auto bg-[#F8F6FC] p-3 sm:p-4 rounded-2xl border-2 border-[#D8CFF0]">
            <div className="text-right">
              <span className="block text-sm sm:text-base font-black text-[#292929]">
                {user.role === 'admin' ? 'Super Administrador' : user.role === 'coordinator' ? 'Coordinadora de Agencia' : 'Trabajador / Empleado'}
              </span>
              <span className="text-xs sm:text-sm font-mono text-[#8E0E75] font-bold">
                {user.email}
              </span>
            </div>
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-tr from-[#191654] via-[#700B5C] to-[#8E0E75] text-white flex items-center justify-center font-black text-lg sm:text-2xl shadow-md ring-4 ring-[#8E0E75]/25">
              {user.full_name?.charAt(0) || 'B'}
            </div>
          </div>
        </div>

        {/* Pestañas de Gestión para Coordinadoras y Administradores con Pastilla Morada Deslizante */}
        {isCoordinatorOrAdmin && (
          <div 
            ref={tabsContainerRef}
            onMouseLeave={() => setHoveredTab(null)}
            className="relative flex items-center bg-[#F8F6FC] p-2 border-2 border-[#D8CFF0] rounded-2xl gap-3 flex-wrap shadow-2xs select-none"
          >
            {/* Pastilla morada deslizante fluida */}
            <div
              className="absolute rounded-xl bg-[#8E0E75] shadow-md shadow-[#8E0E75]/35 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{
                left: `${pillStyle.left}px`,
                width: `${pillStyle.width}px`,
                top: '8px',
                bottom: '8px',
                opacity: pillStyle.opacity,
              }}
            />

            <button
              type="button"
              data-tab-id="apps"
              onClick={() => setActiveTab('apps')}
              onMouseEnter={() => setHoveredTab('apps')}
              className={`relative z-10 flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm sm:text-base uppercase tracking-tight transition-colors duration-200 cursor-pointer ${
                targetTab === 'apps'
                  ? 'text-white font-extrabold'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
              }`}
            >
              <LayoutGrid className={`h-5 w-5 shrink-0 transition-transform ${targetTab === 'apps' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
              <span>Mis Herramientas ({authorizedApps.length})</span>
            </button>

            <button
              type="button"
              data-tab-id="permissions"
              onClick={() => setActiveTab('permissions')}
              onMouseEnter={() => setHoveredTab('permissions')}
              className={`relative z-10 flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm sm:text-base uppercase tracking-tight transition-colors duration-200 cursor-pointer ${
                targetTab === 'permissions'
                  ? 'text-white font-extrabold'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
              }`}
            >
              <ShieldCheck className={`h-5 w-5 shrink-0 transition-transform ${targetTab === 'permissions' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
              <span>Matriz de Permisos por Trabajador</span>
            </button>

            <button
              type="button"
              data-tab-id="customizer"
              onClick={() => setActiveTab('customizer')}
              onMouseEnter={() => setHoveredTab('customizer')}
              className={`relative z-10 flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm sm:text-base uppercase tracking-tight transition-colors duration-200 cursor-pointer ${
                targetTab === 'customizer'
                  ? 'text-white font-extrabold'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75]'
              }`}
            >
              <Palette className={`h-5 w-5 shrink-0 transition-transform ${targetTab === 'customizer' ? 'scale-110 text-white' : 'text-[#8E0E75]'}`} />
              <span>Personalización de Colores RGB</span>
            </button>
          </div>
        )}

        {/* CONTENIDO CON ANIMACIÓN SUAVE SEGÚN PESTAÑA */}
        <div key={activeTab} className="tab-transition">
          
          {/* VISTA 1: DASHBOARD DE APLICACIONES PERMITIDAS */}
          {activeTab === 'apps' && (
            <div className="space-y-8">
              
              {/* Resumen de Herramientas Disponibles con Mayor Presencia */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE4F5]">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-[#292929]">
                    APLICACIONES <span className="text-[#8E0E75]">DISPONIBLES</span>
                  </h2>
                  <p className="text-sm sm:text-base text-[#4A4A4A] font-light mt-0.5">
                    Selecciona la herramienta con la que deseas trabajar hoy
                  </p>
                </div>

                <div className="text-xs sm:text-sm text-[#191654] font-bold bg-[#F8F6FC] px-4 py-2 rounded-xl border-2 border-[#D8CFF0] self-start sm:self-auto shadow-2xs">
                  {authorizedApps.length} de {BRAIN_UP_HUB_APPS.length} herramientas en tu perfil
                </div>
              </div>

              {/* Grid de Aplicaciones del HUB: Tarjetas Heroicas y Espaciosas */}
              <div className={`grid gap-8 lg:gap-10 ${
                authorizedApps.length <= 2 
                  ? 'grid-cols-1 md:grid-cols-2' 
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {authorizedApps.map((app) => {
                  // Destino de Clockify según si es coordinador o empleado
                  let targetHref = app.route;
                  if (app.id === 'clockify') {
                    targetHref = user.role === 'coordinator' ? '/dashboard/coordinator' : '/dashboard/employee';
                  }

                  return (
                    <div
                      key={app.id}
                      className="group relative rounded-3xl border-2 border-[#D8CFF0] bg-white p-8 sm:p-10 shadow-sm hover:shadow-xl hover:border-[#8E0E75] transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Cabecera de la Tarjeta en Escala Ampliada */}
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F6FC] text-[#8E0E75] border-2 border-[#D8CFF0] group-hover:bg-[#8E0E75] group-hover:text-white transition-all shadow-xs group-hover:scale-105 duration-200">
                            {renderAppIcon(app.iconName, 'h-9 w-9 sm:h-11 sm:w-11')}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-extrabold uppercase tracking-tight border-2 shadow-2xs ${
                                app.id === 'clockify'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : app.id === 'taskflow'
                                  ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {app.badge}
                            </span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">
                              v{app.version}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-black text-2xl sm:text-3xl lg:text-4xl text-[#292929] group-hover:text-[#8E0E75] transition-colors uppercase tracking-tight">
                            {app.name}
                          </h3>
                          <p className="text-sm sm:text-base font-bold text-[#8E0E75] mt-1.5">
                            {app.tagline}
                          </p>
                        </div>

                        <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                          {app.description}
                        </p>
                      </div>

                      {/* Botón Gigante de Entrada a la Aplicación */}
                      <div className="pt-6 mt-6 border-t-2 border-[#EAE4F5]">
                        <Link
                          href={targetHref}
                          className="w-full flex items-center justify-center gap-3 px-6 py-4 sm:py-5 rounded-2xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-black text-base sm:text-lg uppercase tracking-tight shadow-lg shadow-[#8E0E75]/25 hover:shadow-2xl hover:shadow-[#8E0E75]/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group/btn"
                        >
                          <span>Acceder a la Aplicación</span>
                          <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover/btn:translate-x-2 transition-transform" />
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Si el trabajador tiene permisos reducidos, aviso positivo de limpieza visual con Mayor Amplitud */}
              {authorizedApps.length < BRAIN_UP_HUB_APPS.length && !isCoordinatorOrAdmin && (
                <div className="p-6 sm:p-7 rounded-2xl border-2 border-[#D8CFF0] bg-white flex items-center gap-4 text-sm sm:text-base text-[#4A4A4A] shadow-xs">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-[#8E0E75] shrink-0" />
                  <span className="leading-relaxed">
                    Tu perfil está configurado en <strong className="font-extrabold text-[#191654]">Modo Limpio</strong> con {authorizedApps.length} de las {BRAIN_UP_HUB_APPS.length} herramientas totales de Brain Up. Si precisas activar herramientas adicionales, consulta con tu coordinadora de cuenta.
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
