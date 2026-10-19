'use client';

import React, { useState, useEffect } from 'react';
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
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Cabecera compacta del HUB */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#292929] leading-tight">
              Hola, <span className="text-[#8E0E75]">{user.full_name?.split(' ')[0] || 'equipo'}</span>
            </h1>
            <p className="text-sm sm:text-base text-[#4A4A4A] mt-1">
              Elige la herramienta con la que quieres trabajar hoy.
            </p>
          </div>
          {/* Ajustes (permisos y colores): viven en Coordinación; el Super Admin, que no
              tiene ese panel, los abre aquí mismo */}
          {user.role === 'coordinator' && (
            <Link
              href="/dashboard/coordinator"
              className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-lg border-2 border-[#D8CFF0] bg-white text-sm font-semibold text-[#8E0E75] hover:border-[#8E0E75]"
            >
              <ShieldCheck className="h-4 w-4" />
              Permisos y colores
            </Link>
          )}
          {user.role === 'admin' && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {([
                ['apps', 'Aplicaciones', LayoutGrid],
                ['permissions', 'Permisos', ShieldCheck],
                ['customizer', 'Colores', Palette],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-pressed={activeTab === id}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 text-sm font-semibold cursor-pointer ${
                    activeTab === id ? 'bg-[#8E0E75] border-[#8E0E75] text-white' : 'bg-white border-[#D8CFF0] text-[#8E0E75] hover:border-[#8E0E75]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tab-transition">
          {activeTab === 'apps' && (
            <div className="space-y-8">

              {/* Grid de Aplicaciones del HUB: la tarjeta entera es el enlace */}
              <div className={`grid gap-6 lg:gap-8 ${
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
                    <Link
                      key={app.id}
                      href={targetHref}
                      className="group relative rounded-2xl border-2 border-[#D8CFF0] bg-white p-6 sm:p-7 shadow-sm hover:shadow-lg hover:border-[#8E0E75] focus-visible:border-[#8E0E75] focus-visible:ring-4 focus-visible:ring-[#8E0E75]/20 outline-none transition-all duration-200 flex items-start gap-5"
                    >
                      <div className="p-4 rounded-2xl bg-[#F8F6FC] text-[#8E0E75] border-2 border-[#D8CFF0] group-hover:bg-[#8E0E75] group-hover:text-white transition-colors shrink-0">
                        {renderAppIcon(app.iconName, 'h-8 w-8')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-black text-xl sm:text-2xl text-[#292929] group-hover:text-[#8E0E75] transition-colors tracking-tight">
                          {app.name}
                        </h2>
                        <p className="text-sm font-bold text-[#8E0E75] mt-0.5">{app.tagline}</p>
                        <p className="text-sm text-[#4A4A4A] leading-relaxed mt-2">{app.description}</p>
                        <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-[#8E0E75]">
                          Abrir
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Si el trabajador tiene permisos reducidos, explicar cómo pedir más */}
              {authorizedApps.length < BRAIN_UP_HUB_APPS.length && !isCoordinatorOrAdmin && (
                <p className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                  <Sparkles className="h-4 w-4 text-[#8E0E75] shrink-0" />
                  ¿Necesitas otra herramienta? Pídesela a tu coordinadora.
                </p>
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
