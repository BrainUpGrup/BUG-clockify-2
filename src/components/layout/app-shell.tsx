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

  return (
    <div className="min-h-screen flex flex-col w-full bg-[var(--hub-bg,#F8F6FC)]">
      {showNavbar && <Navbar />}
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
    </div>
  );
}
