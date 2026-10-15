'use client';

import React, { useState } from 'react';
import { 
  Palette, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Layers, 
  Check, 
  Sliders, 
  Monitor, 
  Layout, 
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { 
  useThemeLayers, 
  hexToRgb, 
  rgbToHex, 
  THEME_PRESETS, 
  LayerThemeConfig,
  DEFAULT_THEME_LAYERS 
} from '@/context/theme-customizer-context';

export function LayerColorCustomizer() {
  const { layers, setLayerColor, setLayerRgb, applyPreset, resetToDefaults, isCustomized } = useThemeLayers();
  const [selectedLayer, setSelectedLayer] = useState<keyof LayerThemeConfig>('bg');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const layerDefinitions: {
    key: keyof LayerThemeConfig;
    name: string;
    description: string;
    targetElements: string;
  }[] = [
    {
      key: 'bg',
      name: 'Capa 1: Fondo de Pantalla',
      description: 'El lienzo principal detrás de todas las aplicaciones y paneles del Hub.',
      targetElements: 'Fondo de la ventana, contenedores principales y fondo de página.',
    },
    {
      key: 'header',
      name: 'Capa 2: Cabecera / Barra de Navegación',
      description: 'La barra superior con el logotipo de Brain Up, selector de apps y perfil.',
      targetElements: 'Navbar sticky, buscador global y accesos rápidos.',
    },
    {
      key: 'card1',
      name: 'Capa 3: Bloque 1 (Tarjetas Principales)',
      description: 'Contenedores destacados, tarjetas de KPI y accesos a aplicaciones.',
      targetElements: 'Tarjetas de aplicaciones, métricas clave y formularios principales.',
    },
    {
      key: 'card2',
      name: 'Capa 4: Bloque 2 (Listas y Tablas)',
      description: 'Bloques de contenido secundario, tablas de horas, Kanban y paneles.',
      targetElements: 'Tablas de registros, columnas de tareas y barras de navegación secundarias.',
    },
    {
      key: 'accent',
      name: 'Capa de Acento: Lila Abuela',
      description: 'Color de selección, botones primarios, estado activo y enlaces corporativos.',
      targetElements: 'Pestañas activas, botones de acción, selección de texto y bordes de foco.',
    },
  ];

  const currentDef = layerDefinitions.find((l) => l.key === selectedLayer) || layerDefinitions[0];
  const currentHex = layers[selectedLayer];
  const currentRgb = hexToRgb(currentHex);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const updated = { ...currentRgb, [channel]: val };
    setLayerRgb(selectedLayer, updated);
  };

  const handleManualSave = () => {
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2500);
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabecera del Personalizador */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EAE4F5] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-[#8E0E75] text-white shadow-xs">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold uppercase tracking-tight text-base text-[#292929]">
                PERSONALIZACIÓN DE COLORES <span className="text-[#8E0E75]">POR CAPAS</span>
              </h3>
              <p className="text-xs text-[#4A4A4A] font-light">
                Modifica el aspecto visual del HUB y de sus aplicaciones controlando cada capa independiente mediante ruleta RGB interactiva.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustomized && (
              <button
                type="button"
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                title="Restablecer a la paleta oficial de La Abuela"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Restablecer Fábrica</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              {showSavedFeedback ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Aplicado con Éxito!</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Guardar Paleta Global</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selector Rápido de Paletas Prediseñadas */}
        <div className="pt-4">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] mb-2.5">
            Paletas Rápidas Prediseñadas:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {THEME_PRESETS.map((preset) => {
              const isSelected = JSON.stringify(layers) === JSON.stringify(preset.config);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`text-left p-3 rounded-sm border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#8E0E75] ring-2 ring-[#8E0E75]/20 bg-[#F8F6FC]'
                      : 'border-[#D8CFF0] bg-white hover:border-[#8E0E75]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-[#292929]">{preset.name}</span>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-[#8E0E75]" />}
                  </div>
                  <p className="text-[10px] text-[#4A4A4A] line-clamp-1 mb-2 font-light">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-5 rounded-xs border border-black/10" style={{ backgroundColor: preset.config.bg }} title="Fondo" />
                    <span className="h-3 w-5 rounded-xs border border-black/10" style={{ backgroundColor: preset.config.header }} title="Cabecera" />
                    <span className="h-3 w-5 rounded-xs border border-black/10" style={{ backgroundColor: preset.config.card1 }} title="Bloque 1" />
                    <span className="h-3 w-5 rounded-xs border border-black/10" style={{ backgroundColor: preset.config.accent }} title="Acento" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Central: Selector de Capas + Ruleta RGB + Vista Previa en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Capas y Ruleta de Colores RGB */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Selector de Capa a Modificar */}
          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-3">
              1. Selecciona la Capa que Deseas Personalizar:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {layerDefinitions.map((def) => {
                const isCurrent = selectedLayer === def.key;
                return (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => setSelectedLayer(def.key)}
                    className={`flex items-center justify-between p-3 rounded-sm border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#8E0E75] text-white font-extrabold border-[#8E0E75] shadow-xs'
                        : 'bg-[#F8F6FC] hover:bg-white text-[#292929] border-[#D8CFF0]'
                    }`}
                  >
                    <div>
                      <span className="text-xs block font-bold">{def.name}</span>
                      <span className={`text-[10px] block mt-0.5 ${isCurrent ? 'text-white/80' : 'text-[#4A4A4A]'}`}>
                        {layers[def.key]}
                      </span>
                    </div>
                    <div
                      className="h-6 w-6 rounded-sm border border-black/20 shrink-0 shadow-xs"
                      style={{ backgroundColor: layers[def.key] }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel de Ajuste Fino con Ruleta y Sliders RGB */}
          <div className="bg-white border border-[#D8CFF0] p-5 rounded-sm shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4F5]">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#8E0E75]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
                  2. Ajuste de Color para: {currentDef.name}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#8E0E75] bg-[#F8F6FC] px-2 py-0.5 rounded-sm border border-[#D8CFF0]">
                {currentHex}
              </span>
            </div>

            <p className="text-xs text-[#4A4A4A] leading-relaxed">
              {currentDef.description} <em>Afecta a: {currentDef.targetElements}</em>
            </p>

            {/* Ruleta de Color Nativa y Cuadro Hex */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F8F6FC] p-3.5 rounded-sm border border-[#D8CFF0]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={currentHex}
                    onChange={(e) => setLayerColor(selectedLayer, e.target.value)}
                    className="h-14 w-14 rounded-sm cursor-pointer border-2 border-white shadow-xs p-0 bg-transparent"
                    title="Haz clic para abrir la ruleta de color"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#292929] block">
                    Ruleta de Color
                  </span>
                  <span className="text-[10px] text-[#4A4A4A]">Haz clic en la muestra para seleccionar visualmente</span>
                </div>
              </div>

              <div className="sm:ml-auto flex items-center gap-2">
                <span className="text-xs font-bold text-[#292929] uppercase">HEX:</span>
                <input
                  type="text"
                  maxLength={7}
                  value={currentHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setLayerColor(selectedLayer, val);
                    }
                  }}
                  className="w-24 px-2 py-1 text-center font-mono text-xs font-extrabold rounded-sm border border-[#D8CFF0] bg-white text-[#292929] uppercase focus:border-[#8E0E75] outline-none"
                />
              </div>
            </div>

            {/* Sliders RGB (Rojo, Verde, Azul) */}
            <div className="space-y-3 pt-2">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A]">
                Canales Numéricos RGB (0 - 255):
              </span>

              {/* Slider Rojo (R) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-red-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    R (Rojo)
                  </span>
                  <span className="font-mono font-extrabold text-[#292929] tabular-nums">{currentRgb.r}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentRgb.r}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value, 10))}
                  className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-sm"
                />
              </div>

              {/* Slider Verde (G) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    G (Verde)
                  </span>
                  <span className="font-mono font-extrabold text-[#292929] tabular-nums">{currentRgb.g}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentRgb.g}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-sm"
                />
              </div>

              {/* Slider Azul (B) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-blue-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    B (Azul)
                  </span>
                  <span className="font-mono font-extrabold text-[#292929] tabular-nums">{currentRgb.b}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentRgb.b}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-sm"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Columna Derecha: Maqueta Interactiva de Vista Previa en Vivo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#EAE4F5] mb-3">
              <Eye className="h-4 w-4 text-[#8E0E75]" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
                Vista Previa de Pantalla en Tiempo Real
              </span>
            </div>

            {/* Simulación de Monitor con Capas Aplicadas */}
            <div
              className="w-full rounded-sm border border-slate-300 shadow-md overflow-hidden transition-colors duration-300 p-3 space-y-3"
              style={{ backgroundColor: layers.bg }}
            >
              {/* Capa 2: Cabecera Simulada */}
              <div
                className="w-full rounded-xs p-2.5 flex items-center justify-between border border-black/10 shadow-xs transition-colors duration-300"
                style={{ backgroundColor: layers.header }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: layers.accent }}
                  >
                    BU
                  </div>
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-tight"
                    style={{ color: layers.text }}
                  >
                    BRAIN UP HUB
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2 py-0.5 rounded-xs text-[9px] font-extrabold uppercase text-white shadow-xs"
                    style={{ backgroundColor: layers.accent }}
                  >
                    Activo
                  </span>
                  <div className="h-4 w-4 rounded-full bg-slate-300" />
                </div>
              </div>

              {/* Capa 3: Bloque 1 Simulado (Tarjetas de Apps / Métricas) */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-2.5 rounded-xs border border-black/10 shadow-xs transition-colors duration-300 space-y-1"
                  style={{ backgroundColor: layers.card1 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Capa 3 (Bloque 1)
                    </span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: layers.accent }} />
                  </div>
                  <p className="text-xs font-extrabold" style={{ color: layers.text }}>
                    App Clockify
                  </p>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-3/4" style={{ backgroundColor: layers.accent }} />
                  </div>
                </div>

                <div
                  className="p-2.5 rounded-xs border border-black/10 shadow-xs transition-colors duration-300 space-y-1"
                  style={{ backgroundColor: layers.card1 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Capa 3 (Bloque 1)
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xs font-extrabold" style={{ color: layers.text }}>
                    App TaskFlow
                  </p>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Capa 4: Bloque 2 Simulado (Tabla / Lista de Trabajo) */}
              <div
                className="p-3 rounded-xs border border-black/10 shadow-xs transition-colors duration-300 space-y-2"
                style={{ backgroundColor: layers.card2 }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-black/5">
                  <span className="text-[10px] font-extrabold uppercase tracking-tight" style={{ color: layers.text }}>
                    Capa 4: Bloque 2 (Listado y Tablas)
                  </span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs font-bold text-white"
                    style={{ backgroundColor: layers.accent }}
                  >
                    Lila Abuela
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] p-1 rounded-xs bg-black/5">
                    <span style={{ color: layers.text }}>Registro de horas cliente A</span>
                    <span className="font-bold text-emerald-600">Al milímetro</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] p-1 rounded-xs bg-black/5">
                    <span style={{ color: layers.text }}>Proyecto nueva campaña B</span>
                    <span className="font-bold text-amber-600">En proceso</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                  Fondo del simulador: Capa 1 ({layers.bg})
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] text-[11px] text-[#4A4A4A] space-y-1">
              <span className="font-bold text-[#292929] block">Guía de Capas para la Agencia:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li><strong>Capa 1:</strong> El fondo general del Hub y de las páginas.</li>
                <li><strong>Capa 2:</strong> Cabecera, barra superior y selector de herramientas.</li>
                <li><strong>Capa 3:</strong> Tarjetas principales de aplicaciones y métricas.</li>
                <li><strong>Capa 4:</strong> Bloques secundarios, tablas de registros y columnas.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
