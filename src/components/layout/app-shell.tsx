'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/context/auth-context';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell: Mantiene la barra de navegación (Navbar) permanentemente montada
 * en la raíz de la suite para evitar que al cambiar de página se desmonte, 
 * destruya el DOM o repita transiciones/saltos en la pastilla morada deslizante.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Excluir Navbar exclusivamente en login, widget popup flotante independiente o splash
  const isExcluded = pathname === '/login' || pathname === '/floating-timer' || pathname === '/';
  const showNavbar = !isExcluded && !!user;

  // En vistas con diseno Zero-Scroll de alta densidad como Taskflow, fijar altura exacta sin scroll global de ventana
  const isZeroScrollApp = pathname?.startsWith('/apps/taskflow');

  return (
    <div className={`w-full bg-gradient-to-b from-[#F8F5FC] via-[#ECE4F4] to-[var(--hub-bg,#DDD2EA)] flex flex-col min-w-0 max-w-full overflow-x-hidden ${
      isZeroScrollApp ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {showNavbar && <Navbar />}
      <div className={`flex-1 flex flex-col w-full min-w-0 max-w-full ${isZeroScrollApp ? 'min-h-0 overflow-hidden' : ''}`}>
        {children}
      </div>
    </div>
  );
}
