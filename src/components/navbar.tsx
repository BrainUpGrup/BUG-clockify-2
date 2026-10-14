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
  LogOut 
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isEmployeeActive = pathname.includes('/employee');
  const isCoordinatorActive = pathname.includes('/coordinator');
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#EAE4F5] bg-white/95 backdrop-blur shadow-xs">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* Logo Corporativo de Brain Up Grup ("La Abuela") */}
        <Link
          href={isCoordinator ? '/dashboard/coordinator' : '/dashboard/employee'}
          className="flex items-center gap-3 shrink-0 group"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#8E0E75]/30 group-hover:ring-[#8E0E75] transition-all bg-[#F8F6FC]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Brain Up Grup - La Abuela"
              className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#292929] uppercase">
                BRAIN <span className="text-[#8E0E75]">UP</span>
              </span>
              <span className="rounded-sm bg-[#F8F6FC] px-1.5 py-0.5 text-[10px] font-extrabold text-[#8E0E75] uppercase tracking-wider border border-[#D8CFF0]">
                CLOCKIFY
              </span>
            </div>
            <p className="text-[10px] text-[#4A4A4A] font-light leading-none mt-1">
              Control Horario por Empresa
            </p>
          </div>
        </Link>

        {/* Navigation Links: Solo muestra Panel Coordinador si el usuario es Coordinador */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F8F6FC] p-1 rounded-sm border border-[#D8CFF0] shrink-0">
          <Link
            href="/dashboard/employee"
            className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-extrabold uppercase tracking-wider transition-all ${
              isEmployeeActive
                ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30'
                : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white/60'
            }`}
          >
            <Clock className="h-4 w-4 text-[#8E0E75] shrink-0" />
            <span>Mi Registro Horario</span>
          </Link>

          {isCoordinator && (
            <Link
              href="/dashboard/coordinator"
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-extrabold uppercase tracking-wider transition-all ${
                isCoordinatorActive
                  ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-white/60'
              }`}
            >
              <BarChart3 className="h-4 w-4 text-[#8E0E75] shrink-0" />
              <span>Panel Coordinador</span>
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
                {isCoordinator ? 'Coordinadora' : 'Empleado / Trabajador'}
              </span>
            </div>

            {/* Botón de Cerrar Sesión */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="ml-2 p-2 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] text-[#4A4A4A] hover:bg-white hover:text-rose-600 hover:border-rose-300 transition-all cursor-pointer"
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
          href="/dashboard/employee"
          className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-extrabold uppercase tracking-wider ${
            isEmployeeActive ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30' : 'text-[#4A4A4A]'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-[#8E0E75]" />
          <span>Mi Registro</span>
        </Link>

        {isCoordinator && (
          <Link
            href="/dashboard/coordinator"
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-extrabold uppercase tracking-wider ${
              isCoordinatorActive ? 'bg-white text-[#8E0E75] shadow-xs border border-[#8E0E75]/30' : 'text-[#4A4A4A]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#8E0E75]" />
            <span>Panel Coordinador</span>
          </Link>
        )}
      </div>
    </header>
  );
}
