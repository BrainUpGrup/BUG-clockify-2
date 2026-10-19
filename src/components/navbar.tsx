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
  Pin
} from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeCompany, activeCompanyId, isTimerRunning, timerSeconds, startTimer, stopTimer } = useTimer();

  const isHubActive = pathname === '/hub';
  const isEmployeeActive = pathname.includes('/employee');
  const isCoordinatorActive = pathname.includes('/coordinator');
  const isClockifyActive = isEmployeeActive || isCoordinatorActive;
  const isTaskFlowActive = pathname.includes('/taskflow');
  const isChatActive = pathname.includes('/chat');
  const isAdminActive = pathname.includes('/admin');
  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.role === 'coordinator';

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#EAE4F5] bg-white shadow-xs transition-colors duration-200">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 sm:gap-4">
        
        {/* Logo Corporativo de Brain Up Grup ("La Abuela") */}
        <Link
          href={logoHref}
          className="flex items-center gap-2.5 shrink-0 group select-none"
          title="Ir al HUB de Aplicaciones"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#8E0E75]/30 group-hover:ring-[#8E0E75] transition-all bg-[#F8F6FC]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Brain Up Grup - La Abuela"
              className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
            />
          </div>
          {/* BRAIN arriba y UP justo abajo, sin badge de clockify ni textos extras */}
          <div className="flex flex-col justify-center leading-none">
            <span className="font-black text-[14px] sm:text-[15px] tracking-wider text-[#292929] uppercase leading-none">
              BRAIN
            </span>
            <span className="font-black text-[14px] sm:text-[15px] tracking-wider text-[#8E0E75] uppercase leading-none mt-0.5">
              UP
            </span>
          </div>
        </Link>

        {/* Widget Central: Empresa Fijada y Temporizador en la Cabecera con Controles Flotantes */}
        <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] shadow-xs transition-all max-w-[440px] xl:max-w-xl ml-2 mr-auto">
          {/* Logo / Hueco de la empresa con salto a Clockify */}
          <Link
            href="/dashboard/employee"
            className="flex items-center gap-2 min-w-0 group cursor-pointer"
            title="Ir al registro horario de esta empresa"
          >
            <div className="h-6 w-6 rounded-xs bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75] overflow-hidden group-hover:border-[#8E0E75] transition-colors">
              {activeCompany?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCompany.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#8E0E75] leading-none">
                Empresa en Curso
              </span>
              <span 
                className="text-xs font-black uppercase tracking-tight text-[#191654] truncate max-w-[110px] xl:max-w-[150px] leading-tight group-hover:text-[#8E0E75] transition-colors" 
                title={activeCompany?.name || 'Empresa'}
              >
                {activeCompany?.name || 'Selecciona Cliente'}
              </span>
            </div>
          </Link>

          {/* Divisor vertical */}
          <div className="h-5 w-px bg-[#D8CFF0] shrink-0" />

          {/* Temporizador */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isTimerRunning ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            ) : (
              <Clock className="h-3.5 w-3.5 text-[#8E0E75]" />
            )}
            <span className={`font-mono tabular-nums text-xs sm:text-sm font-extrabold ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
              {formatSecondsToTimer(timerSeconds)}
            </span>
            {isTimerRunning && (
              <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded-2xs bg-red-100 text-red-700 tracking-wider animate-pulse hidden xl:inline">
                EN MARCHA
              </span>
            )}
          </div>

          {/* Divisor vertical */}
          <div className="h-5 w-px bg-[#D8CFF0] shrink-0" />

          {/* Controles Rápido: Iniciar/Parar + Ventana Flotante Always-on-Top */}
          <div className="flex items-center gap-1 shrink-0">
            {isTimerRunning ? (
              <button
                type="button"
                onClick={() => stopTimer()}
                className="p-1 rounded-xs bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-transform hover:scale-105 cursor-pointer"
                title="Detener temporizador y guardar registro"
              >
                <Square className="h-3 w-3 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startTimer(activeCompanyId)}
                className="p-1 rounded-xs bg-[#10B981] hover:bg-[#059669] text-white shadow-xs transition-transform hover:scale-105 cursor-pointer"
                title="Iniciar temporizador en esta empresa"
              >
                <Play className="h-3 w-3 fill-white" />
              </button>
            )}

            {/* Abrir Ventana Flotante Always-on-Top (Document Picture-in-Picture) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('bug_open_pip_window'));
                }
              }}
              className="px-1.5 py-1 rounded-xs bg-white hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] shadow-2xs transition-all cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase"
              title="Abrir ventana flotante Always-on-Top (te acompaña a otras páginas de trabajo o programas)"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden xl:inline text-[9px]">Flotante</span>
            </button>

            {/* Activar/Fijar Widget Arrastrable dentro del Hub */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('bug_open_floating_widget'));
                }
              }}
              className="p-1 rounded-xs bg-white hover:bg-slate-100 text-[#4A4A4A] border border-[#D8CFF0] shadow-2xs transition-all cursor-pointer"
              title="Fijar widget arrastrable en pantalla (te sigue entre páginas del Hub)"
            >
              <Pin className="h-3 w-3 text-[#8E0E75]" />
            </button>
          </div>
        </div>

        {/* Navigation Links deslizado a la derecha */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#F8F6FC] p-1 rounded-sm border border-[#D8CFF0] shrink-0 ml-auto mr-2 sm:mr-4">
          
          {/* Botón Principal al HUB */}
          <Link
            href="/hub"
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition-all duration-200 ${
              isHubActive
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white/80'
            }`}
            title="Panel central de selección de aplicaciones"
          >
            <LayoutGrid className={`h-3.5 w-3.5 shrink-0 ${isHubActive ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>HUB Apps</span>
          </Link>

          {/* Clockify */}
          <Link
            href={isCoordinator ? '/dashboard/coordinator' : '/dashboard/employee'}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition-all duration-200 ${
              isClockifyActive
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white/80'
            }`}
            title="Control Horario y Cuotas de Clientes"
          >
            <Clock className={`h-3.5 w-3.5 shrink-0 ${isClockifyActive ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Clockify</span>
          </Link>

          {/* TaskFlow (App de prueba del Hub) */}
          <Link
            href="/apps/taskflow"
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition-all duration-200 ${
              isTaskFlowActive
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white/80'
            }`}
            title="Gestión de Proyectos, Calendario & Post-its"
          >
            <CheckSquare className={`h-3.5 w-3.5 shrink-0 ${isTaskFlowActive ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>TaskFlow</span>
          </Link>

          {/* Brain Up Comms (Chat & Tareas por Cliente estilo Slack) */}
          <Link
            href="/apps/chat"
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition-all duration-200 ${
              isChatActive
                ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white/80'
            }`}
            title="Chat en tiempo real, canales por cliente y tareas anti-ruido"
          >
            <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isChatActive ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Chat</span>
          </Link>

          {/* Acceso para Administrador */}
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition-all duration-200 ${
                isAdminActive
                  ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm scale-[1.02]'
                  : 'text-[#4A4A4A] font-bold hover:text-[#8E0E75] hover:bg-white/80'
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${isAdminActive ? 'text-white' : 'text-[#8E0E75]'}`} />
              <span>Admin</span>
            </Link>
          )}

        </nav>

        {/* Perfil del Usuario y Botón de Salir */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#EAE4F5]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white font-extrabold text-xs shadow-xs shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:block text-right leading-tight">
              <span className="block text-xs font-extrabold text-[#292929] whitespace-nowrap">
                {user?.full_name || 'Usuario'}
              </span>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#8E0E75] whitespace-nowrap">
                {isAdmin ? 'Super Administrador' : isCoordinator ? 'Coordinadora & Empleada' : 'Empleado / Trabajador'}
              </span>
            </div>

            {/* Botón de Cerrar Sesión */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="ml-2 p-2 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] text-[#4A4A4A] hover:bg-white hover:text-red-600 hover:border-red-300 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Navegación móvil para pantallas estrechas */}
      <div className="flex md:hidden items-center justify-around bg-[#F8F6FC] border-t border-[#D8CFF0] p-1.5">
        <Link
          href="/hub"
          className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs uppercase tracking-wider transition-all ${
            isHubActive ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm' : 'text-[#4A4A4A] font-bold'
          }`}
        >
          <LayoutGrid className={`h-3.5 w-3.5 ${isHubActive ? 'text-white' : 'text-[#8E0E75]'}`} />
          <span>HUB</span>
        </Link>

        <Link
          href={isCoordinator ? '/dashboard/coordinator' : '/dashboard/employee'}
          className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs uppercase tracking-wider transition-all ${
            isClockifyActive ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm' : 'text-[#4A4A4A] font-bold'
          }`}
        >
          <Clock className={`h-3.5 w-3.5 ${isClockifyActive ? 'text-white' : 'text-[#8E0E75]'}`} />
          <span>Clockify</span>
        </Link>

        <Link
          href="/apps/taskflow"
          className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs uppercase tracking-wider transition-all ${
            isTaskFlowActive ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm' : 'text-[#4A4A4A] font-bold'
          }`}
        >
          <CheckSquare className={`h-3.5 w-3.5 ${isTaskFlowActive ? 'text-white' : 'text-[#8E0E75]'}`} />
          <span>TaskFlow</span>
        </Link>

        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs uppercase tracking-wider transition-all ${
              isAdminActive ? 'bg-[#8E0E75] text-white font-extrabold shadow-sm' : 'text-[#4A4A4A] font-bold'
            }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${isAdminActive ? 'text-white' : 'text-[#8E0E75]'}`} />
            <span>Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
