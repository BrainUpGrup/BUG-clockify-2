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
  Play,
  Square,
  ExternalLink,
  Pin,
  ChevronDown
} from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';
import { canUserAccessHubApp } from '@/lib/hub-apps';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeCompany, activeCompanyId, isTimerRunning, timerSeconds, startTimer, stopTimer } = useTimer();

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
  const isAdminActive = pathname.includes('/admin');
  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.role === 'coordinator';

  // Permisos efectivos de acceso por rol y matriz de coordinación
  const canAccessClockify = isAdmin || isCoordinator || canUserAccessHubApp(user, 'clockify');
  const canAccessTaskflow = isAdmin || isCoordinator || canUserAccessHubApp(user, 'taskflow');
  const canAccessChat = isAdmin || isCoordinator || canUserAccessHubApp(user, 'chat');

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


  // Lista unificada de enlaces de navegación con control de permisos
  const navLinks = [
    { href: '/hub', label: 'HUB Apps', icon: LayoutGrid, isActive: isHubActive, visible: true },
    { href: isCoordinator ? '/dashboard/coordinator' : '/dashboard/employee', label: 'Clockify', icon: Clock, isActive: isClockifyActive, visible: canAccessClockify },
    { href: '/apps/taskflow', label: 'TaskFlow', icon: CheckSquare, isActive: isTaskFlowActive, visible: canAccessTaskflow },
    { href: '/apps/chat', label: 'Chat', icon: MessageSquare, isActive: isChatActive, visible: canAccessChat },
    { href: '/dashboard/admin', label: 'Admin', icon: ShieldCheck, isActive: isAdminActive, visible: isAdmin },
  ].filter((l) => l.visible);

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

  const activeLink = navLinks.find((l) => l.isActive) || navLinks[0];
  const targetHref = hoveredHref || activeLink?.href;

  // Actualizar posición de la pastilla morada en escritorio
  React.useEffect(() => {
    const updateDesktopPill = () => {
      if (!desktopNavRef.current) return;
      const targetEl = desktopNavRef.current.querySelector(`[data-nav-href="${targetHref}"]`) as HTMLElement;
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
        const activeEl = desktopNavRef.current.querySelector(`[data-nav-href="${activeLink?.href}"]`) as HTMLElement;
        if (activeEl) {
          setDesktopPill({
            left: activeEl.offsetLeft,
            width: activeEl.offsetWidth,
            opacity: 1,
          });
          requestAnimationFrame(() => {
            setHasPositionedDesktop(true);
          });
        }
      }
    };

    updateDesktopPill();
    window.addEventListener('resize', updateDesktopPill);
    return () => window.removeEventListener('resize', updateDesktopPill);
  }, [targetHref, activeLink?.href, pathname, permVersion, navLinks.length]);

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
      <div className="w-full flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 sm:gap-5">
        
        {/* Logo Corporativo de Brain Up Grup ("La Abuela") - Tamaño Visual Ampliado */}
        <Link
          href={logoHref}
          className="flex items-center gap-3 shrink-0 group select-none"
          title="Ir al HUB de Aplicaciones"
        >
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[#8E0E75]/30 group-hover:ring-[#8E0E75] transition-all bg-[#F8F6FC] shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Brain Up Grup - La Abuela"
              className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
            />
          </div>
          {/* BRAIN arriba y UP justo abajo con tipografía destacada */}
          <div className="flex flex-col justify-center leading-none">
            <span className="font-black text-[15px] sm:text-[17px] tracking-tight text-[#292929] uppercase leading-none">
              BRAIN
            </span>
            <span className="font-black text-[15px] sm:text-[17px] tracking-tight text-[#8E0E75] uppercase leading-none mt-0.5">
              UP
            </span>
          </div>
        </Link>

        {/* Widget Central: Empresa Fijada y Temporizador. Se oculta en la propia pantalla de
            imputación (que ya tiene su selector y botón) para no duplicar controles. */}
        <div className={`${isEmployeeActive ? 'hidden' : 'hidden xl:flex'} items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#F8F6FC] border-2 border-[#D8CFF0] shadow-xs transition-all min-w-0 ml-2 mr-auto`}>
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
                className="text-sm font-bold text-[#191654] truncate max-w-[110px] 2xl:max-w-[180px] leading-tight group-hover:text-[#8E0E75] transition-colors"
                title={activeCompany?.name || 'Elegir cliente'}
              >
                {activeCompany?.name || 'Elegir cliente'}
              </span>
            </div>
          </Link>

          {/* Divisor vertical */}
          <div className="h-6 w-px bg-[#D8CFF0] shrink-0" />

          {/* Temporizador */}
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
              {formatSecondsToTimer(timerSeconds)}
            </span>
          </div>

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
          className="hidden md:flex items-center gap-1 bg-[#F8F6FC] p-1.5 rounded-xl border-2 border-[#D8CFF0] shrink-0 ml-auto shadow-xs relative select-none"
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

          {navLinks.map((link) => {
            const isTargeted = targetHref === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                data-nav-href={link.href}
                onClick={() => setHoveredHref(null)}
                onMouseEnter={() => setHoveredHref(link.href)}
                aria-current={link.isActive ? 'page' : undefined}
                title={link.label}
                className={`relative z-10 whitespace-nowrap flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-lg text-sm transition-colors duration-200 cursor-pointer ${
                  isTargeted
                    ? 'text-white font-bold'
                    : 'text-[#4A4A4A] font-semibold hover:text-[#8E0E75]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 ${isTargeted ? 'text-white' : 'text-[#8E0E75]'}`} />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Perfil del Usuario Compacto & Reformulado (No satura el layout) */}
        <div ref={profileMenuRef} className="relative flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            aria-label={`Menú de ${user?.full_name || 'usuario'}: perfil y cerrar sesión`}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#F8F6FC] border-2 border-transparent hover:border-[#D8CFF0] transition-all cursor-pointer group"
            title={`${user?.full_name || 'Usuario'} · Perfil y cerrar sesión`}
          >
            <div className="relative">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#191654] via-[#700B5C] to-[#8E0E75] text-white font-black text-xs sm:text-sm shadow-sm group-hover:scale-105 transition-transform ring-2 ring-[#8E0E75]/25">
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <ChevronDown className={`h-4 w-4 text-[#4A4A4A] group-hover:text-[#8E0E75] transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable Compacto del Perfil */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border-2 border-[#D8CFF0] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-[#EAE4F5]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#191654] via-[#700B5C] to-[#8E0E75] text-white font-black text-sm shadow-md shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-[#292929] truncate">
                    {user?.full_name || 'Usuario'}
                  </h4>
                  <p className="text-xs text-[#4A4A4A] truncate font-medium">
                    {user?.email || 'usuario@brainupgrup.com'}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-black uppercase tracking-wider text-[#8E0E75] bg-[#F8F6FC] px-2 py-0.5 rounded-md border border-[#D8CFF0]">
                    {isAdmin ? 'Super Administrador' : isCoordinator ? 'Coordinadora & Empleada' : 'Empleado / Trabajador'}
                  </span>
                </div>
              </div>

              <div className="pt-3">
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

      {/* Navegación móvil para pantallas estrechas con botones ampliados y pastilla deslizante */}
      <div 
        ref={mobileNavRef}
        className="flex md:hidden items-center justify-around bg-[#F8F6FC] border-t border-[#D8CFF0] p-2 relative select-none"
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
              aria-current={isCurrentActive ? 'page' : undefined}
              className={`relative z-10 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
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
