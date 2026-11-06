'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LayerThemeConfig {
  bg: string;       // Capa 1: Fondo de pantalla
  header: string;   // Capa 2: Cabecera / Navbar
  card1: string;    // Capa 3: Bloque 1 (Contenedores principales / KPIs)
  card2: string;    // Capa 4: Bloque 2 (Contenedores secundarios / Tablas / Listados)
  accent: string;   // Capa de Acento / Selección (Lila Abuela por defecto)
  text: string;     // Color de texto principal
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  config: LayerThemeConfig;
}

// Valores por defecto institucionales de Brain Up ("La Abuela") con fondo gris muy clarito #F4F5F7
export const DEFAULT_THEME_LAYERS: LayerThemeConfig = {
  bg: '#F4F5F7',
  header: '#FFFFFF',
  card1: '#FFFFFF',
  card2: '#FFFFFF',
  accent: '#8E0E75',
  text: '#292929',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'brainup_classic',
    name: 'Original Brain Up ("La Abuela")',
    description: 'Estética oficial con fondo gris muy clarito, blanco nítido y acentos corporativos.',
    config: {
      bg: '#F4F5F7',
      header: '#FFFFFF',
      card1: '#FFFFFF',
      card2: '#FFFFFF',
      accent: '#8E0E75',
      text: '#292929',
    },
  },
  {
    id: 'dark_executive',
    name: 'Modo Oscuro Ejecutivo',
    description: 'Fondo grafito premium con contraste lila neón, ideal para jornadas prolongadas.',
    config: {
      bg: '#121217',
      header: '#1A1926',
      card1: '#1F1D2E',
      card2: '#27243A',
      accent: '#A855F7',
      text: '#F3F4F6',
    },
  },
  {
    id: 'minimal_clean',
    name: 'Blanco Minimalista Puro',
    description: 'Líneas puras, bordes sutiles y máxima luminosidad con toques violeta.',
    config: {
      bg: '#FAFAFB',
      header: '#FFFFFF',
      card1: '#FFFFFF',
      card2: '#F4F5F7',
      accent: '#7C3AED',
      text: '#1F2937',
    },
  },
  {
    id: 'navy_agency',
    name: 'Alta Dirección Navy',
    description: 'Cabecera índigo institucional con bloques de alta definición ejecutiva.',
    config: {
      bg: '#EFF3F8',
      header: '#191654',
      card1: '#FFFFFF',
      card2: '#E5ECF6',
      accent: '#8E0E75',
      text: '#1E293B',
    },
  },
];

// Funciones de conversión RGB <-> HEX
export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

export function rgbToHex(rgb: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

interface ThemeContextType {
  layers: LayerThemeConfig;
  setLayerColor: (layer: keyof LayerThemeConfig, hex: string) => void;
  setLayerRgb: (layer: keyof LayerThemeConfig, rgb: RgbColor) => void;
  applyPreset: (presetId: string) => void;
  resetToDefaults: () => void;
  isCustomized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'bug_hub_theme_layers';

export function ThemeLayersProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<LayerThemeConfig>(DEFAULT_THEME_LAYERS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Limpiar personalización anterior y fijar fondo gris clarito #F4F5F7
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_THEME);
    } catch {
      // ignore
    }
    setLayers(DEFAULT_THEME_LAYERS);
    setIsLoaded(true);
  }, []);

  // 2. Inyectar variables CSS fijas en :root con fondo gris clarito #F4F5F7
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--hub-bg', '#F4F5F7');
    root.style.setProperty('--background', '#F4F5F7');
    root.style.setProperty('--brand-bg-canvas', '#F4F5F7');
    root.style.setProperty('--hub-header', '#FFFFFF');
    root.style.setProperty('--hub-card-1', '#FFFFFF');
    root.style.setProperty('--hub-card-2', '#FFFFFF');
    root.style.setProperty('--hub-accent', '#8E0E75');
    root.style.setProperty('--hub-text', '#292929');
    root.style.setProperty('--hub-header-text', '#292929');
  }, [layers, isLoaded]);

  const setLayerColor = (layer: keyof LayerThemeConfig, hex: string) => {
    setLayers((prev) => ({ ...prev, [layer]: hex }));
  };

  const setLayerRgb = (layer: keyof LayerThemeConfig, rgb: RgbColor) => {
    const hex = rgbToHex(rgb);
    setLayerColor(layer, hex);
  };

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLayers(preset.config);
    }
  };

  const resetToDefaults = () => {
    setLayers(DEFAULT_THEME_LAYERS);
  };

  const isCustomized = JSON.stringify(layers) !== JSON.stringify(DEFAULT_THEME_LAYERS);

  return (
    <ThemeContext.Provider
      value={{
        layers,
        setLayerColor,
        setLayerRgb,
        applyPreset,
        resetToDefaults,
        isCustomized,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeLayers() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeLayers must be used within a ThemeLayersProvider');
  }
  return context;
}
