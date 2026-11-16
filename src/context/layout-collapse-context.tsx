'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface LayoutCollapseContextType {
  isLayoutCollapsed: boolean;
  setLayoutCollapsed: (collapsed: boolean) => void;
  toggleLayoutCollapse: () => void;
  registerPageHeader: () => () => void;
  hasRegisteredPageHeader: boolean;
}

const STORAGE_KEY = 'bug_clockify_global_layout_collapsed';

const LayoutCollapseContext = createContext<LayoutCollapseContextType>({
  isLayoutCollapsed: false,
  setLayoutCollapsed: () => {},
  toggleLayoutCollapse: () => {},
  registerPageHeader: () => () => {},
  hasRegisteredPageHeader: false,
});

export function LayoutCollapseProvider({ children }: { children: React.ReactNode }) {
  const [isLayoutCollapsed, setIsLayoutCollapsedState] = useState<boolean>(false);
  const [registeredCount, setRegisteredCount] = useState<number>(0);

  // Hidratar estado persistido desde localStorage sin causar desajustes SSR
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        setIsLayoutCollapsedState(true);
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, []);

  const setLayoutCollapsed = useCallback((collapsed: boolean) => {
    setIsLayoutCollapsedState(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignorar errores de almacenamiento
    }
    // Notificar a barras con pastillas deslizantes (Navbar / pestañas) para recalcular anchos al desplegar
    if (!collapsed && typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }, []);

  const toggleLayoutCollapse = useCallback(() => {
    setIsLayoutCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignorar errores de almacenamiento
      }
      if (!next && typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }
      return next;
    });
  }, []);

  const registerPageHeader = useCallback(() => {
    setRegisteredCount((c) => c + 1);
    return () => {
      setRegisteredCount((c) => Math.max(0, c - 1));
    };
  }, []);

  return (
    <LayoutCollapseContext.Provider
      value={{
        isLayoutCollapsed,
        setLayoutCollapsed,
        toggleLayoutCollapse,
        registerPageHeader,
        hasRegisteredPageHeader: registeredCount > 0,
      }}
    >
      {children}
    </LayoutCollapseContext.Provider>
  );
}

export function useLayoutCollapse() {
  return useContext(LayoutCollapseContext);
}

/**
 * Envuelve la cabecera superior de cada página para que se pliegue junto con el Navbar global
 * y muestre la flechita centrada justo debajo cuando está desplegada.
 */
export function CollapsiblePageHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isLayoutCollapsed, toggleLayoutCollapse, registerPageHeader } = useLayoutCollapse();

  useEffect(() => {
    return registerPageHeader();
  }, [registerPageHeader]);

  if (isLayoutCollapsed) {
    return null;
  }

  return (
    <div className={`w-full relative ${className}`}>
      {children}
      <div className="flex justify-center pt-1.5">
        <button
          type="button"
          onClick={toggleLayoutCollapse}
          title="Plegar cabecera y navegación para dejar más limpia la pantalla"
          aria-label="Plegar cabecera superior"
          className="inline-flex items-center justify-center px-6 py-0.5 rounded-full bg-white/95 hover:bg-[#8E0E75] border border-[#D8CFF0] hover:border-[#8E0E75] text-[#191654] hover:text-white shadow-2xs transition-all cursor-pointer group"
        >
          <ChevronUp className="h-4 w-4 stroke-[2.25] group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

/**
 * Lengüeta centrada superior montada en AppShell:
 * - Siempre visible arriba cuando el layout está plegado (flecha hacia abajo para desplegar).
 * - Visible bajo el Navbar solo si la página actual no monta un CollapsiblePageHeader propio (ej. Brain Chat).
 */
export function GlobalLayoutCollapseHandle() {
  const { isLayoutCollapsed, toggleLayoutCollapse, hasRegisteredPageHeader } = useLayoutCollapse();

  if (!isLayoutCollapsed && hasRegisteredPageHeader) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full h-0 overflow-visible flex justify-center pointer-events-none">
      <button
        type="button"
        onClick={toggleLayoutCollapse}
        title={
          isLayoutCollapsed
            ? 'Desplegar barra de navegación y cabecera'
            : 'Plegar barra superior para vista limpia'
        }
        aria-label={
          isLayoutCollapsed
            ? 'Desplegar layout superior'
            : 'Plegar layout superior'
        }
        className="pointer-events-auto inline-flex items-center justify-center px-6 py-0.5 rounded-b-xl bg-white/95 backdrop-blur-xs hover:bg-[#8E0E75] border border-t-0 border-[#D8CFF0] hover:border-[#8E0E75] text-[#191654] hover:text-white shadow-sm transition-all cursor-pointer group"
      >
        {isLayoutCollapsed ? (
          <ChevronDown className="h-4 w-4 stroke-[2.25] group-hover:translate-y-0.5 transition-transform" />
        ) : (
          <ChevronUp className="h-4 w-4 stroke-[2.25] group-hover:-translate-y-0.5 transition-transform" />
        )}
      </button>
    </div>
  );
}
