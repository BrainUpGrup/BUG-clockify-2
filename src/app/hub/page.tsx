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
  BarChart3,
  Image, 
  Users, 
  Receipt, 
  BookOpen, 
  Share2, 
  MessageSquare,
  Video,
  Server,
  ArrowRight, 
  ShieldCheck, 
  Palette, 
  Sliders, 
  Sparkles,
  Lock,
  Layers,
  ExternalLink,
  Star
} from 'lucide-react';

export default function BrainUpHubPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  const [activeTab, setActiveTab] = useState<'apps' | 'permissions' | 'customizer'>('apps');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [authorizedApps, setAuthorizedApps] = useState<HubApp[]>([]);

  // Gestión de Favoritas (vacío por defecto hasta que el usuario elija sus herramientas preferidas)
  const [favoriteAppIds, setFavoriteAppIds] = useState<string[]>([]);
  const [viewFilter, setViewFilter] = useState<'all' | 'favorites'>('all');

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar favoritas persistidas en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bug_hub_favorite_apps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFavoriteAppIds(parsed);
          return;
        }
      }
      setFavoriteAppIds(['clockify', 'taskflow', 'chat']);
    } catch (e) {
      console.warn('Error cargando apps favoritas:', e);
      setFavoriteAppIds(['clockify', 'taskflow', 'chat']);
    }
  }, []);

  // Alternar favorita de forma instantánea sin animaciones ni retrasos
  const toggleFavorite = (appId: string) => {
    setFavoriteAppIds((prev) => {
      const updated = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];
      try {
        localStorage.setItem('bug_hub_favorite_apps', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('bug_hub_favorites_updated'));
      } catch (e) {
        console.warn('Error guardando apps favoritas:', e);
      }
      return updated;
    });
  };

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

  // Apps a mostrar según la vista:
  // - En 'all': todo el catálogo de herramientas autorizadas
  // - En 'favorites': estrictamente las aplicaciones favoritas marcadas
  const displayedApps = React.useMemo(() => {
    if (viewFilter === 'all') {
      return authorizedApps;
    }
    const favSet = new Set(favoriteAppIds);
    return authorizedApps.filter((a) => favSet.has(a.id));
  }, [authorizedApps, favoriteAppIds, viewFilter]);

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
      case 'Server':
        return <Server className={className} />;
      case 'Video':
        return <Video className={className} />;
      default:
        return <CheckSquare className={className} />;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--hub-bg,#DDD2EA)]">
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
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-6 space-y-6 sm:space-y-7">
        
        {/* Cabecera compacta del HUB con selector de layout modular */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#292929] leading-tight">
              Hola, <span className="text-[#8E0E75]">{user.full_name?.split(' ')[0] || 'equipo'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#4A4A4A] mt-0.5">
              Elige la herramienta con la que quieres trabajar hoy.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Selector de Layout Modular: Todas (Preseleccionado por defecto) vs Favoritas */}
            {activeTab === 'apps' && (
              <div className="flex items-center bg-[#F8F6FC] p-1 rounded-xl border border-[#D8CFF0]">
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewFilter === 'all'
                      ? 'bg-[#8E0E75] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                  }`}
                  title="Ver todo el catálogo de herramientas disponibles"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Todas ({authorizedApps.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('favorites')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewFilter === 'favorites'
                      ? 'bg-[#8E0E75] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                  }`}
                  title="Ver únicamente las herramientas marcadas como favoritas"
                >
                  <Star className={`h-3.5 w-3.5 ${viewFilter === 'favorites' ? 'fill-white text-white' : 'text-amber-500 fill-amber-400'}`} />
                  <span>Favoritas ({favoriteAppIds.length})</span>
                </button>
              </div>
            )}

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
        </div>

        <div className="tab-transition">
          {activeTab === 'apps' && (
            <div className="space-y-5 sm:space-y-6">

              {/* Guía informativa dinámica */}
              {viewFilter === 'all' && (
                <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-xs text-[#4A4A4A]">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                    <span>Pulsa en la <strong>estrella</strong> de cualquier aplicación para fijarla como <strong>favorita</strong> y verla en la barra superior.</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#8E0E75] shrink-0">
                    {favoriteAppIds.length === 0 ? 'Sin favoritas aún' : `${favoriteAppIds.length} en barra superior`}
                  </span>
                </div>
              )}

              {/* Si estamos en vista 'favorites' y no hay ninguna marcada */}
              {viewFilter === 'favorites' && displayedApps.length === 0 ? (
                <div className="w-full p-10 sm:p-14 text-center rounded-2xl bg-[#F8F6FC] border-2 border-dashed border-[#D8CFF0] space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-[#D8CFF0] flex items-center justify-center text-amber-400 shadow-xs">
                    <Star className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-extrabold text-[#292929] uppercase tracking-tight">
                      No tienes herramientas favoritas todavía
                    </h3>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed">
                      Haz clic en la estrella de cualquier aplicación para fijarla aquí y tener acceso directo inmediato en la barra superior.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewFilter('all')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-[#8E0E75]/25 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Explorar todas las aplicaciones</span>
                  </button>
                </div>
              ) : (
                /* Grid de Aplicaciones del HUB (Modular) */
                <div className={`grid gap-6 sm:gap-7 lg:gap-8 transition-all duration-300 ${
                  displayedApps.length <= 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {displayedApps.map((app) => {
                    const isFav = favoriteAppIds.includes(app.id);

                    // Destino de Tiempo según si es coordinador o empleado
                    let targetHref = app.route;
                    if (app.id === 'clockify') {
                      targetHref = '/dashboard/employee';
                    }

                    return (
                      <div
                        key={app.id}
                        className="group relative rounded-3xl border-2 border-[#D8CFF0] bg-white p-7 sm:p-8 lg:p-9 shadow-xs hover:shadow-2xl hover:border-[#8E0E75] transition-all duration-300 flex items-start gap-5 sm:gap-6 min-h-[220px] sm:min-h-[250px]"
                      >
                        {/* Cajón Independiente para la Estrella Favorita */}
                        <div className="absolute top-5 right-5 z-20">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(app.id);
                            }}
                            className={`relative h-12 w-12 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-colors ${
                              isFav
                                ? 'border-amber-400 bg-amber-50 text-amber-500 shadow-xs'
                                : 'border-slate-200 bg-slate-50 text-slate-300 hover:border-slate-300 hover:text-slate-400 hover:bg-slate-100'
                            }`}
                            title={isFav ? 'Quitar de mis favoritas (eliminar de la barra superior)' : 'Fijar como favorita (añadir a la barra superior)'}
                            aria-label={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                          >
                            <Star
                              className={`h-6 w-6 transition-colors ${
                                isFav
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'fill-transparent text-slate-300'
                              }`}
                              strokeWidth={isFav ? 2.2 : 1.75}
                            />
                          </button>
                        </div>

                        {/* Contenido Principal de la Herramienta (enlace clicable independiente) */}
                        <Link
                          href={targetHref}
                          className="flex-1 flex items-start gap-5 sm:gap-6 outline-none focus-visible:ring-2 focus-visible:ring-[#8E0E75] rounded-2xl pr-14 min-w-0"
                        >
                          <div className="relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#F8F6FC] text-[#8E0E75] ring-2 ring-inset ring-[#D8CFF0] group-hover:ring-[#8E0E75] transition-all duration-500 overflow-hidden shrink-0">
                            {/* Estado base: icono lila centrado sobre fondo claro */}
                            <div className="relative z-0">
                              {renderAppIcon(app.iconName, 'h-11 w-11 sm:h-12 sm:w-12')}
                            </div>
                            {/* Relleno suave de abajo hacia arriba: sube capa lila con icono en blanco */}
                            <div
                              aria-hidden="true"
                              className="card-icon-fill absolute -inset-[1px] rounded-2xl sm:rounded-3xl bg-[#8E0E75] text-white flex items-center justify-center pointer-events-none"
                            >
                              {renderAppIcon(app.iconName, 'h-11 w-11 sm:h-12 sm:w-12')}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h2 className="font-black text-2xl sm:text-3xl text-[#292929] group-hover:text-[#8E0E75] transition-colors tracking-tight">
                                {app.name}
                              </h2>
                              {app.badge && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shrink-0 ${
                                    app.badge === 'Mantenimiento'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-[#F8F6FC] text-[#8E0E75] border-[#D8CFF0]'
                                  }`}
                                >
                                  {app.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-sm sm:text-base font-extrabold text-[#8E0E75] mt-1.5">{app.tagline}</p>
                            <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed mt-2.5 line-clamp-3">{app.description}</p>
                            {app.id === 'clockify' && user.role === 'coordinator' ? (
                              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8E0E75] text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-2xs group-hover:bg-[#700B5C]">
                                  <Clock className="h-4 w-4" />
                                  <span>Mi Fichaje (Horas)</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push('/dashboard/coordinator');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-[#8E0E75] text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95"
                                  title="Acceder al panel de informes, cuotas y coordinación de equipo"
                                >
                                  <BarChart3 className="h-4 w-4 text-[#8E0E75]" />
                                  <span>Panel Coordinación</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-[#8E0E75]" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-[#F8F6FC] group-hover:bg-[#8E0E75] text-[#8E0E75] group-hover:text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-2xs">
                              <span>{app.badge === 'Mantenimiento' ? 'Ver estado' : 'Abrir Herramienta'}</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
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
