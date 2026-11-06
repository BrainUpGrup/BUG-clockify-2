'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  User, 
  LogOut,
  LayoutGrid,
  CheckSquare,
  Building2,
  MessageSquare,
  Video,
  Server,
  Play,
  Square,
  ExternalLink,
  Pin,
  ChevronDown,
  HelpCircle,
  Keyboard,
  Image,
  Users,
  Receipt,
  BookOpen,
  Share2,
  Camera,
  ChevronRight
} from 'lucide-react';
import { useTimer, useTimerSeconds } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';
import { canUserAccessHubApp, BRAIN_UP_HUB_APPS, HubApp } from '@/lib/hub-apps';
import { UserAvatar } from '@/components/ui/user-avatar';

function NavbarTimerDisplay({ isTimerRunning }: { isTimerRunning: boolean }) {
  const seconds = useTimerSeconds();
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {isTimerRunning ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      ) : (
        <Clock className="h-4 w-4 text-[#8E0E75]" />
      )}
      <span className={`font-mono tabular-nums text-sm sm:text-base font-black ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
        {formatSecondsToTimer(seconds)}
      </span>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeCompany, activeCompanyId, isTimerRunning, startTimer, stopTimer } = useTimer();

  // Escuchar cambios de permisos en tiempo real
  const [permVersion, setPermVersion] = React.useState(0);
  React.useEffect(() => {
    const handlePermUpdate = () => setPermVersion((v) => v + 1);
    window.addEventListener('bug_permissions_updated', handlePermUpdate);
    window.addEventListener('storage', handlePermUpdate);
    return () => {
      window.removeEventListener('bug_permissions_updated', handlePermUpdate);
      window.removeEventListener('storage', handlePermUpdate);
    };
  }, []);

  const isHubActive = pathname === '/hub';
  const isEmployeeActive = pathname.includes('/employee');
  const isCoordinatorActive = pathname.includes('/coordinator');
  const isClockifyActive = isEmployeeActive || isCoordinatorActive;
  const isTaskFlowActive = pathname.includes('/taskflow');
  const isChatActive = pathname.includes('/chat');
  const isHostingActive = pathname.includes('/hosting');
  const isSubtitulosActive = pathname.includes('/subtitulos');
  const isAdminActive = pathname.includes('/admin');
  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.role === 'coordinator';

  // Permisos efectivos de acceso por rol y matriz de coordinación
  const canAccessClockify = isAdmin || isCoordinator || canUserAccessHubApp(user, 'clockify');
  const canAccessTaskflow = isAdmin || isCoordinator || canUserAccessHubApp(user, 'taskflow');
  const canAccessChat = isAdmin || isCoordinator || canUserAccessHubApp(user, 'chat');
  const canAccessHosting = isAdmin || isCoordinator || canUserAccessHubApp(user, 'hosting');
  const canAccessSubtitulos = isAdmin || isCoordinator || canUserAccessHubApp(user, 'subtitulos');

  const handleLogoutClick = async () => {
    await logout();
    router.push('/login');
  };

  // Iniciales del usuario actual
  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'BU';

  // Destino del logo: siempre al HUB Central
  const logoHref = '/hub';


  // Gestión de Favoritas para el layout modular de la barra superior (por defecto: Tiempo, Agenda y Chat)
  const [favoriteAppIds, setFavoriteAppIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const updateFavorites = () => {
      try {
        const stored = localStorage.getItem('bug_hub_favorite_apps');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavoriteAppIds(parsed);
            return;
          }
        }
        if (stored === null) {
          setFavoriteAppIds(['clockify', 'taskflow', 'chat']);
          return;
        }
        setFavoriteAppIds([]);
      } catch (e) {
        console.warn('Error loading favorite apps in navbar:', e);
        setFavoriteAppIds(['clockify', 'taskflow', 'chat']);
      }
    };

    updateFavorites();
    window.addEventListener('bug_hub_favorites_updated', updateFavorites);
    window.addEventListener('storage', updateFavorites);
    return () => {
      window.removeEventListener('bug_hub_favorites_updated', updateFavorites);
      window.removeEventListener('storage', updateFavorites);
    };
  }, []);

  const getAppNavIcon = (iconName: HubApp['iconName']) => {
    switch (iconName) {
      case 'Clock': return Clock;
      case 'CheckSquare': return CheckSquare;
      case 'MessageSquare': return MessageSquare;
      case 'Server': return Server;
      case 'Video': return Video;
      case 'Image': return Image;
      case 'Users': return Users;
      case 'Receipt': return Receipt;
      case 'BookOpen': return BookOpen;
      case 'Share2': return Share2;
      default: return CheckSquare;
    }
  };

  const getAppNavLabel = (app: HubApp) => {
    if (app.id === 'clockify') return 'Brain Time';
    if (app.id === 'taskflow') return 'Brain Schedule';
    if (app.id === 'hosting') return 'Hosting Control';
    if (app.id === 'subtitulos') return 'Brain Subtitles';
    if (app.id === 'chat') return 'Brain Chat';
    return app.name;
  };

  // Lista modular y dinámica de enlaces de navegación según las favoritas del usuario y rol dual
  const navLinks = React.useMemo(() => {
    const links = [
      { href: '/hub', label: 'HUB Apps', icon: LayoutGrid, isActive: isHubActive, visible: true },
    ];

    let hasClockifyInNav = false;

    favoriteAppIds.forEach((appId) => {
      const app = BRAIN_UP_HUB_APPS.find((a) => a.id === appId);
      if (!app) return;

      const hasAccess = isAdmin || isCoordinator || canUserAccessHubApp(user, app.id);
      if (!hasAccess) return;

      let href = app.route;
      let isActive = false;

      if (app.id === 'clockify') {
        hasClockifyInNav = true;
        if (isCoordinator) {
          // Rol Dual Perpetuo (DM-05): Coordinadora tiene acceso simultáneo a Mi Tiempo y Coordinación
          links.push({
            href: '/dashboard/employee',
            label: 'Mi Tiempo',
            icon: Clock,
            isActive: isEmployeeActive,
            visible: true,
          });
          links.push({
            href: '/dashboard/coordinator',
            label: 'Coordinación',
            icon: BarChart3,
            isActive: isCoordinatorActive,
            visible: true,
          });
          return;
        } else {
          href = '/dashboard/employee';
          isActive = isEmployeeActive;
        }
      } else if (app.id === 'taskflow') {
        isActive = isTaskFlowActive;
      } else if (app.id === 'chat') {
        isActive = isChatActive;
      } else if (app.id === 'hosting') {
        isActive = isHostingActive;
      } else if (app.id === 'subtitulos') {
        isActive = isSubtitulosActive;
      } else {
        const cleanRoute = app.route.split('?')[0];
        isActive = pathname === cleanRoute || pathname.startsWith(cleanRoute);
      }

      links.push({
        href,
        label: getAppNavLabel(app),
        icon: getAppNavIcon(app.iconName),
        isActive,
        visible: true,
      });
    });

    // Si el usuario está navegando dentro del módulo de tiempo y no estaba entre sus favoritas,
    // añadir contextualmente para que la pastilla y la navegación sigan activas
    if (!hasClockifyInNav && isClockifyActive) {
      if (isCoordinator) {
        links.push({
          href: '/dashboard/employee',
          label: 'Mi Tiempo',
          icon: Clock,
          isActive: isEmployeeActive,
          visible: true,
        });
        links.push({
          href: '/dashboard/coordinator',
          label: 'Coordinación',
          icon: BarChart3,
          isActive: isCoordinatorActive,
          visible: true,
        });
      } else {
        links.push({
          href: '/dashboard/employee',
          label: 'Tiempo',
          icon: Clock,
          isActive: isEmployeeActive,
          visible: true,
        });
      }
    }

    if (isAdmin) {
      links.push({
        href: '/dashboard/admin',
        label: 'Admin',
        icon: ShieldCheck,
        isActive: isAdminActive,
        visible: true,
      });
    }

    return links;
  }, [
    favoriteAppIds,
    user,
    isAdmin,
    isCoordinator,
    isHubActive,
    isEmployeeActive,
    isCoordinatorActive,
    isClockifyActive,
    isTaskFlowActive,
    isChatActive,
    isSubtitulosActive,
    isAdminActive,
    pathname,
  ]);

  const desktopNavRef = React.useRef<HTMLElement>(null);
  const mobileNavRef = React.useRef<HTMLDivElement>(null);

  const [desktopPill, setDesktopPill] = React.useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const [mobilePill, setMobilePill] = React.useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const [hasPositionedDesktop, setHasPositionedDesktop] = React.useState(false);
  const [hasPositionedMobile, setHasPositionedMobile] = React.useState(false);
  const [hoveredHref, setHoveredHref] = React.useState<string | null>(null);

  // Menú desplegable para perfil de usuario compacto
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeLink = navLinks.find((l) => l.isActive);
  const targetHref = hoveredHref || activeLink?.href;

  // Actualizar posición de la pastilla morada en escritorio
  React.useEffect(() => {
    const updateDesktopPill = () => {
      if (!desktopNavRef.current) return;
      const targetEl = targetHref ? (desktopNavRef.current.querySelector(`[data-nav-href="${targetHref}"]`) as HTMLElement) : null;
      if (targetEl) {
        setDesktopPill({
          left: targetEl.offsetLeft,
          width: targetEl.offsetWidth,
          opacity: 1,
        });
        requestAnimationFrame(() => {
          setHasPositionedDesktop(true);
        });
      } else {
        setDesktopPill((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateDesktopPill();
    window.addEventListener('resize', updateDesktopPill);
    return () => window.removeEventListener('resize', updateDesktopPill);
  }, [targetHref, activeLink?.href, pathname, permVersion, navLinks.length, favoriteAppIds]);

  // Actualizar posición de la pastilla morada en móvil
  React.useEffect(() => {
    const updateMobilePill = () => {
      if (!mobileNavRef.current) return;
      const activeEl = mobileNavRef.current.querySelector(`[data-nav-href="${activeLink?.href}"]`) as HTMLElement;
      if (activeEl) {
        setMobilePill({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
        requestAnimationFrame(() => {
          setHasPositionedMobile(true);
        });
      }
    };

    updateMobilePill();
    window.addEventListener('resize', updateMobilePill);
    return () => window.removeEventListener('resize', updateMobilePill);
  }, [activeLink?.href, pathname, permVersion, navLinks.length]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#EAE4F5] bg-white shadow-xs transition-colors duration-200">
      <div className="w-full flex h-20 items-center justify-between px-3 sm:px-6 lg:px-8 gap-2.5 sm:gap-4">
        
        {/* Logo Corporativo de Brain Up Grup ("La Abuela") - Solo Logo para Maximizar Espacio */}
        <Link
          href={logoHref}
          className="flex items-center shrink-0 group select-none"
          title="Ir al HUB de Aplicaciones Brain Up"
          aria-label="Ir al HUB de Aplicaciones Brain Up"
        >
          <div className="relative h-12 w-12 sm:h-13 sm:w-13 shrink-0 rounded-full ring-2 ring-[#8E0E75]/25 group-hover:ring-[#8E0E75] transition-all bg-[#F8F6FC] shadow-2xs flex items-center justify-center p-2 sm:p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/isotipo.svg"
              alt="Brain Up Grup"
              className="h-full w-full object-contain group-hover:scale-105 transition-transform"
            />
          </div>
        </Link>

        {/* Widget Central: Empresa Fijada y Temporizador (Persistente y visible en todas las páginas) */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#FAF8FD] border-2 border-[#D8CFF0] shadow-xs transition-all min-w-0 ml-1 sm:ml-2 mr-auto">
          {/* Logo / Hueco de la empresa con salto a Clockify */}
          <Link
            href="/dashboard/employee"
            className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
            title="Ir al registro horario de esta empresa"
          >
            <div className="h-7 w-7 rounded-md bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75] overflow-hidden group-hover:border-[#8E0E75] transition-colors shadow-2xs">
              {activeCompany?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCompany.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
              ) : (
                <Building2 className="h-4 w-4 text-[#8E0E75]" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#8E0E75] leading-none">
                Cliente en curso
              </span>
              <span
                className="text-sm font-bold text-[#191654] truncate max-w-[130px] 2xl:max-w-[190px] leading-tight group-hover:text-[#8E0E75] transition-colors"
                title={activeCompany?.name || 'Elegir cliente'}
              >
                {activeCompany?.name || 'Elegir cliente'}
              </span>
            </div>
          </Link>

          {/* Divisor vertical */}
          <div className="h-6 w-px bg-[#D8CFF0] shrink-0" />

          {/* Temporizador Aislado: solo este bloque se actualiza cada segundo */}
          <NavbarTimerDisplay isTimerRunning={isTimerRunning} />

          {/* Divisor vertical */}
          <div className="h-6 w-px bg-[#D8CFF0] shrink-0" />

          {/* Botones de Control Grandes y Táctiles */}
          <div className="flex items-center gap-2 shrink-0">
            {isTimerRunning ? (
              <button
                type="button"
                onClick={() => stopTimer()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-red-500/25 transition-all cursor-pointer font-bold text-sm"
                title="Detener temporizador y guardar registro"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>Parar</span>
              </button>
            ) : activeCompanyId && activeCompany ? (
              <button
                type="button"
                onClick={() => startTimer(activeCompanyId)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-emerald-500/25 transition-all cursor-pointer font-bold text-sm"
                title="Iniciar temporizador en esta empresa"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Iniciar</span>
              </button>
            ) : (
              <Link
                href="/dashboard/employee"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border-2 border-[#D8CFF0] hover:border-[#8E0E75] text-[#8E0E75] font-bold text-sm"
                title="Elige un cliente para poder iniciar el temporizador"
              >
                <Building2 className="h-4 w-4" />
                <span>Elegir cliente</span>
              </Link>
            )}

            {/* Abrir Ventana Flotante Always-on-Top */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('bug_open_pip_window'));
                }
              }}
              className="p-2 2xl:px-3 rounded-lg bg-white hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border-2 border-[#D8CFF0] hover:border-[#8E0E75] shadow-xs transition-all cursor-pointer flex items-center gap-1.5 text-sm font-semibold"
              title="Abrir ventana flotante siempre visible"
              aria-label="Abrir ventana flotante"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden 2xl:inline">Flotante</span>
            </button>

            {/* Activar/Fijar Widget Arrastrable dentro del Hub */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('bug_open_floating_widget'));
                }
              }}
              className="p-2 rounded-lg bg-white hover:bg-[#F8F6FC] text-[#8E0E75] border-2 border-[#D8CFF0] hover:border-[#8E0E75] shadow-xs transition-all cursor-pointer"
              title="Fijar widget arrastrable en pantalla"
              aria-label="Fijar widget del temporizador"
            >
              <Pin className="h-4 w-4 text-[#8E0E75]" />
            </button>
          </div>
        </div>

        {/* Navigation Links con Botones Aún Más Grandes y Pastilla Morada Deslizante Fluida */}
        <nav 
          ref={desktopNavRef}
          onMouseLeave={() => setHoveredHref(null)}
          aria-label="Aplicaciones"
          className="hidden md:flex items-center gap-1 bg-[#F8F6FC] p-1.5 rounded-xl border-2 border-[#D8CFF0] shrink-0 ml-auto shadow-xs relative select-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        >
          {/* Pastilla morada que se desliza suavemente */}
          <div
            className={`absolute rounded-lg bg-[#8E0E75] shadow-md shadow-[#8E0E75]/35 pointer-events-none ${
              hasPositionedDesktop ? 'transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]' : 'transition-none'
            }`}
            style={{
              left: `${desktopPill.left}px`,
              width: `${desktopPill.width}px`,
              top: '6px',
              bottom: '6px',
              opacity: desktopPill.opacity,
            }}
          />

          {navLinks.map((link, index) => {
            const isTargeted = targetHref === link.href;
            const Icon = link.icon;
            const isHub = link.href === '/hub';
            const totalFavs = favoriteAppIds.length;

            // Modo adaptativo compacto para evitar desbordar el layout con muchas favoritas:
            // 1. HUB Apps: siempre muestra texto.
            // 2. Enlace Activo: siempre muestra texto para orientar al usuario en qué aplicación se encuentra.
            // 3. Si hay más de 3 favoritas (zona extendida):
            //    - Las primeras 2 favoritas (index 1 y 2) muestran texto en pantallas anchas (xl/2xl).
            //    - De la 3ª favorita en adelante ("pasada la zona x"), SOLO SE MUESTRA EL LOGO (icono).
            const isIconOnly = !isHub && !link.isActive && (
              totalFavs > 3 ? index > 2 : false
            );

            // Visibilidad responsive para el texto
            let textVisibilityClass = 'hidden lg:inline';
            if (isHub || link.isActive) {
              textVisibilityClass = 'hidden sm:inline';
            } else if (totalFavs > 5) {
              textVisibilityClass = 'hidden 2xl:inline';
            } else {
              textVisibilityClass = 'hidden xl:inline';
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                data-nav-href={link.href}
                onClick={() => setHoveredHref(null)}
                onMouseEnter={() => setHoveredHref(link.href)}
                aria-current={link.isActive ? 'page' : undefined}
                title={link.label}
                aria-label={link.label}
                className={`animate-nav-item relative z-10 whitespace-nowrap flex items-center justify-center transition-all duration-200 cursor-pointer rounded-lg text-sm ${
                  isIconOnly
                    ? 'px-2.5 py-2'
                    : 'gap-2 px-3 lg:px-3.5 py-2'
                } ${
                  isTargeted
                    ? 'text-white font-bold'
                    : 'text-[#4A4A4A] font-semibold hover:text-[#8E0E75]'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 ${
                    isTargeted ? 'text-white' : 'text-[#8E0E75]'
                  }`}
                />
                {!isIconOnly && (
                  <span className={textVisibilityClass}>
                    {link.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Botón Circular Minimalista de Atajos de Teclado (A juego con el Avatar) */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('bug_open_shortcuts'));
            }
          }}
          className="hidden sm:flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#FAF8FD] hover:bg-white text-[#8E0E75] hover:text-[#191654] border-2 border-[#D8CFF0] hover:border-[#8E0E75] shadow-2xs hover:shadow-sm transition-all cursor-pointer group hover:scale-105 active:scale-95 shrink-0 ml-1"
          title="Atajos de teclado y trucos de velocidad (Pulsa ?)"
          aria-label="Atajos de teclado y ayuda"
        >
          <Keyboard className="h-5 w-5 text-[#8E0E75] group-hover:text-[#191654] transition-colors" />
        </button>

        {/* Perfil del Usuario: Clic directo en la foto o inicial navega a la subpágina /profile */}
        <div ref={profileMenuRef} className="relative flex items-center gap-1.5 shrink-0 ml-1">
          <Link
            href="/profile"
            className="flex items-center rounded-full ring-2 ring-transparent hover:ring-[#8E0E75] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={`${user?.full_name || 'Usuario'} · Clic para abrir mi perfil y cambiar foto`}
            aria-label="Ir a mi perfil y cambiar foto"
          >
            <UserAvatar
              src={user?.avatar_url}
              name={user?.full_name}
              size="md"
              showOnline={true}
              isOnline={true}
              className="group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Flecha discreta para abrir menú desplegable con opciones rápidas */}
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            aria-label="Opciones de perfil y sesión"
            className="p-1 rounded-full hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] transition-colors cursor-pointer"
            title="Opciones de usuario"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable Compacto del Perfil */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border-2 border-[#D8CFF0] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <Link
                href="/profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 pb-3 border-b border-[#EAE4F5] hover:bg-[#FAF8FD] p-2 rounded-xl transition-all cursor-pointer group/prof"
                title="Abrir página de perfil y cambiar fotografía"
              >
                <UserAvatar
                  src={user?.avatar_url}
                  name={user?.full_name}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-[#292929] truncate group-hover/prof:text-[#8E0E75] transition-colors">
                    {user?.full_name || 'Usuario'}
                  </h4>
                  <p className="text-xs text-[#4A4A4A] truncate font-medium">
                    {user?.email || 'usuario@brainupgrup.com'}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-black uppercase tracking-wider text-[#8E0E75] bg-[#F8F6FC] px-2 py-0.5 rounded-md border border-[#D8CFF0]">
                    {isAdmin ? 'Super Administrador' : isCoordinator ? 'Coordinadora & Empleada' : 'Empleado / Trabajador'}
                  </span>
                </div>
              </Link>

              <div className="pt-3 space-y-2">
                {isCoordinator && (
                  <>
                    <Link
                      href="/dashboard/employee"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#FAF8FD] text-[#191654] hover:text-[#8E0E75] text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-[#D8CFF0]"
                      title="Ir al registro de horas de clientes"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#8E0E75]" />
                        <span>Registro de Horas Clientes</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8E0E75]" />
                    </Link>

                    <Link
                      href="/dashboard/coordinator"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#FAF8FD] text-[#191654] hover:text-[#8E0E75] text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-[#D8CFF0]"
                      title="Ir al panel de coordinación de equipo e informes"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[#8E0E75]" />
                        <span>Panel de Coordinación</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8E0E75]" />
                    </Link>
                  </>
                )}

                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#FAF8FD] text-[#191654] hover:text-[#8E0E75] text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-[#D8CFF0]"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[#8E0E75]" />
                    <span>Mi Perfil y Cambiar Foto</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8E0E75]" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('bug_open_shortcuts'));
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#FAF8FD] text-[#191654] hover:text-[#8E0E75] text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-[#D8CFF0]"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-[#8E0E75]" />
                    <span>Guía de Atajos</span>
                  </div>
                  <kbd className="text-[10px] font-mono font-bold bg-[#F8F6FC] px-1.5 py-0.5 rounded border border-[#D8CFF0] text-[#191654]">?</kbd>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider border border-red-200 transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Navegación móvil para pantallas estrechas con soporte de scroll horizontal sin rotura */}
      <div 
        ref={mobileNavRef}
        className="flex md:hidden items-center justify-start sm:justify-around bg-[#F8F6FC] border-t border-[#D8CFF0] p-2 relative select-none overflow-x-auto no-scrollbar gap-1"
      >
        {/* Pastilla morada deslizante móvil */}
        <div
          className={`absolute rounded-md bg-[#8E0E75] shadow-sm pointer-events-none ${
            hasPositionedMobile ? 'transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]' : 'transition-none'
          }`}
          style={{
            left: `${mobilePill.left}px`,
            width: `${mobilePill.width}px`,
            top: '6px',
            bottom: '6px',
            opacity: mobilePill.opacity,
          }}
        />

        {navLinks.map((link) => {
          const isCurrentActive = link.isActive;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              data-nav-href={link.href}
              aria-label={link.label}
              title={link.label}
              aria-current={isCurrentActive ? 'page' : undefined}
              className={`relative z-10 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors duration-200 shrink-0 ${
                isCurrentActive
                  ? 'text-white'
                  : 'text-[#4A4A4A]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isCurrentActive ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
