'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface LayoutCollapseContextType {
  isLayoutCollapsed: boolean;
  setLayoutCollapsed: (collapsed: boolean) => void;
  toggleLayoutCollapse: () => void;
}

const STORAGE_KEY = 'bug_clockify_global_layout_collapsed';

const LayoutCollapseContext = createContext<LayoutCollapseContextType>({
  isLayoutCollapsed: false,
  setLayoutCollapsed: () => {},
  toggleLayoutCollapse: () => {},
});

export function LayoutCollapseProvider({ children }: { children: React.ReactNode }) {
  const [isLayoutCollapsed, setIsLayoutCollapsedState] = useState<boolean>(false);

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

  return (
    <LayoutCollapseContext.Provider
      value={{
        isLayoutCollapsed,
        setLayoutCollapsed,
        toggleLayoutCollapse,
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
 * Lengüeta centrada fija en el borde inferior de la barra de navegación global (Navbar).
 * Al pulsarla pliega/despliega únicamente el Navbar superior manteniendo intactas las cabeceras de cada página.
 */
export function GlobalLayoutCollapseHandle() {
  const { isLayoutCollapsed, toggleLayoutCollapse } = useLayoutCollapse();

  return (
    <div className="w-full h-0 overflow-visible flex justify-center pointer-events-none">
      <button
        type="button"
        onClick={toggleLayoutCollapse}
        title={
          isLayoutCollapsed
            ? 'Desplegar barra de navegación superior'
            : 'Plegar barra de navegación superior para ganar espacio'
        }
        aria-label={
          isLayoutCollapsed
            ? 'Desplegar barra superior'
            : 'Plegar barra superior'
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
