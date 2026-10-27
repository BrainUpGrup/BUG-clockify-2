'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Keyboard, 
  X, 
  Clock, 
  LayoutGrid, 
  CheckSquare, 
  Sparkles, 
  Search,
  MousePointer, 
  Zap,
  CornerDownLeft,
  ArrowRight,
  Layers,
  HelpCircle,
  Command
} from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  badge?: string;
  isAction?: boolean; // Para gestos de ratón como Clic o Arrastrar
}

interface ShortcutCategory {
  id: string;
  title: string;
  iconName: 'Clock' | 'Sparkles' | 'LayoutGrid' | 'CheckSquare';
  items: ShortcutItem[];
}

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Escuchar tecla '?' (Shift + /), 'F1', 'Escape' y eventos personalizados
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o editable
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      // Cerrar modal con Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Si está en un input y el modal no está abierto, ignorar (salvo F1)
      if (isInput && !isOpen && e.key !== 'F1') return;

      // Abrir con '?' (Shift + /) o F1
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) || e.key === 'F1') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Navegación rápida con Alt + 1..5
      if (e.altKey && !e.ctrlKey && !e.metaKey && !isOpen) {
        if (e.key === '1') {
          e.preventDefault();
          router.push('/hub');
        } else if (e.key === '2') {
          e.preventDefault();
          router.push('/dashboard/employee');
        } else if (e.key === '3') {
          e.preventDefault();
          router.push('/apps/taskflow');
        } else if (e.key === '4') {
          e.preventDefault();
          router.push('/apps/chat');
        } else if (e.key === '5') {
          e.preventDefault();
          router.push('/apps/subtitulos');
        }
      }
    };

    const handleCustomOpen = () => setIsOpen(true);
    const handleCustomClose = () => setIsOpen(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('bug_open_shortcuts', handleCustomOpen);
    window.addEventListener('bug_close_shortcuts', handleCustomClose);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('bug_open_shortcuts', handleCustomOpen);
      window.removeEventListener('bug_close_shortcuts', handleCustomClose);
    };
  }, [isOpen, router]);

  // Foco automático en el buscador al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  const categories: ShortcutCategory[] = [
    {
      id: 'clockify',
      title: 'Control Horario (Clockify)',
      iconName: 'Clock',
      items: [
        {
          keys: ['Ctrl', '↵ Enter'],
          description: 'Iniciar o detener temporizador en vivo al instante',
          badge: 'Super Rápido',
        },
        {
          keys: ['↵ Enter'],
          description: 'En el campo de tarea: arrancar cronómetro inmediatamente',
        },
        {
          keys: ['Clic', 'Texto'],
          description: 'Edición inline directa de la descripción de cualquier tarea',
          isAction: true,
        },
        {
          keys: ['Clic', 'Tiempo'],
          description: 'Modificar duración con shorthand o selector rápido',
          isAction: true,
        },
        {
          keys: ['Repetir'],
          description: 'Reanudar una tarea anterior clonando cliente y descripción',
          isAction: true,
        },
      ],
    },
    {
      id: 'shorthands',
      title: 'Shorthands de Tiempo (Velocidad de Agencia)',
      iconName: 'Sparkles',
      items: [
        {
          keys: ['3'],
          description: 'Se interpreta automáticamente como 3 horas (3h 00m)',
        },
        {
          keys: ['330'],
          description: 'Descompone 3 o 4 dígitos: 3h 30m (igual para 145, 830)',
          badge: 'Estrella',
        },
        {
          keys: ['2.5', 'o', '2,5'],
          description: 'Decimales con punto o coma se calculan como 2h 30m',
        },
        {
          keys: ['45m'],
          description: 'Minutos explícitos añadiendo la letra m (ej. 15m, 45m)',
        },
        {
          keys: ['Deshacer'],
          description: 'Al borrar un registro tienes 6 segundos para deshacer',
          isAction: true,
        },
      ],
    },
    {
      id: 'navigation',
      title: 'Navegación Global entre Aplicaciones',
      iconName: 'LayoutGrid',
      items: [
        {
          keys: ['Alt', '1'],
          description: 'Ir al HUB Central de Aplicaciones',
        },
        {
          keys: ['Alt', '2'],
          description: 'Ir a Clockify (Horas por Cliente / Coordinación)',
        },
        {
          keys: ['Alt', '3'],
          description: 'Ir a TaskFlow (Calendario y Post-its)',
        },
        {
          keys: ['Alt', '4'],
          description: 'Ir a Chat Corporativo (Brain Up Comms)',
        },
        {
          keys: ['Alt', '5'],
          description: 'Ir a Subtitulado de Vídeos',
        },
        {
          keys: ['?'],
          description: 'Abrir / Cerrar esta guía interactiva de atajos',
        },
      ],
    },
    {
      id: 'taskflow',
      title: 'TaskFlow, Calendario y Modales',
      iconName: 'CheckSquare',
      items: [
        {
          keys: ['Ctrl', 'N'],
          description: 'Crear nueva tarea o evento en el calendario',
        },
        {
          keys: ['Ctrl', '↵ Enter'],
          description: 'Guardar cambios dentro del modal de tarea',
        },
        {
          keys: ['Esc'],
          description: 'Cerrar cualquier modal, menú desplegable o cancelar edición',
        },
        {
          keys: ['Arrastrar'],
          description: 'Mover tareas entre días en el calendario laboral (Drag & Drop)',
          isAction: true,
        },
        {
          keys: ['Calendario'],
          description: 'Entregables con fecha pactada vs Post-its (alertas recurrentes)',
          badge: 'Concepto',
          isAction: true,
        },
      ],
    },
  ];

  const renderIcon = (name: ShortcutCategory['iconName']) => {
    switch (name) {
      case 'Clock':
        return <Clock className="h-4.5 w-4.5 text-[#8E0E75]" />;
      case 'Sparkles':
        return <Sparkles className="h-4.5 w-4.5 text-[#8E0E75]" />;
      case 'LayoutGrid':
        return <LayoutGrid className="h-4.5 w-4.5 text-[#8E0E75]" />;
      case 'CheckSquare':
        return <CheckSquare className="h-4.5 w-4.5 text-[#8E0E75]" />;
      default:
        return <Zap className="h-4.5 w-4.5 text-[#8E0E75]" />;
    }
  };

  // Filtrado reactivo por categoría y búsqueda en tiempo real
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return categories
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
      .map((cat) => {
        if (!q) return cat;

        const filteredItems = cat.items.filter((item) => {
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchKeys = item.keys.some((k) => k.toLowerCase().includes(q));
          const matchBadge = item.badge?.toLowerCase().includes(q);
          return matchDesc || matchKeys || matchBadge;
        });

        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, activeCategory, searchQuery]);

  const totalShortcutsCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-[#191654]/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div 
        className="w-full max-w-5xl h-[88vh] max-h-[92vh] bg-white rounded-3xl border-3 border-[#8E0E75] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Principal con Identidad "La Abuela" y Buscador Integrado */}
        <div className="bg-gradient-to-r from-[#191654] via-[#700B5C] to-[#8E0E75] text-white p-5 sm:p-6 space-y-4 shrink-0 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="h-11 w-11 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center text-white shadow-inner backdrop-blur-xs shrink-0">
                <Keyboard className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="shortcuts-modal-title" className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
                    Atajos de Teclado y Guía de Velocidad
                  </h2>
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shadow-2xs">
                    Brain Up Suite
                  </span>
                </div>
                <p className="text-xs text-white/85 font-normal mt-0.5 leading-relaxed">
                  Optimizado para agilizar el flujo diario de la agencia con velocidad de teclado y Cero Fricción.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar modal de atajos"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Cerrar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Buscador de atajos en vivo con diseño limpio */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#191654]/60 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar acción, tecla o shorthand... (ej. cronómetro, 330, enter, alt, tarea)"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/95 text-[#292929] placeholder:text-slate-400 text-sm font-semibold outline-none focus:ring-3 focus:ring-white/40 focus:bg-white shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#8E0E75] rounded-md transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros por Categoría (Píldoras con Respiración Visual) */}
        <div className="px-6 sm:px-8 py-3 bg-[#FAF8FD] border-b-2 border-[#EAE4F5] flex items-center gap-2 overflow-x-auto no-scrollbar select-none shrink-0">
          <span className="text-xs font-black uppercase text-[#8E0E75] mr-1 hidden sm:inline">
            Filtrar:
          </span>

          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
              activeCategory === 'all'
                ? 'bg-[#8E0E75] text-white shadow-sm'
                : 'bg-white hover:bg-[#F3EEF9] text-[#4A4A4A] border border-[#D8CFF0] hover:text-[#8E0E75]'
            }`}
          >
            Todos ({totalShortcutsCount})
          </button>

          {categories.map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                  isCatActive
                    ? 'bg-[#8E0E75] text-white shadow-sm'
                    : 'bg-white hover:bg-[#F3EEF9] text-[#4A4A4A] border border-[#D8CFF0] hover:text-[#8E0E75]'
                }`}
              >
                <span>{cat.title.split('(')[0].trim()}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isCatActive ? 'bg-white/20 text-white' : 'bg-[#FAF8FD] text-[#8E0E75] border border-[#D8CFF0]'
                }`}>
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenido Amplio, Espacioso y con Respiración Visual (Eliminada la sensación de agobio) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-[#FFFFFF] scrollbar-thin scrollbar-thumb-[#D8CFF0] scrollbar-track-transparent">
          {filteredCategories.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#FAF8FD] border-2 border-[#D8CFF0] text-[#8E0E75] flex items-center justify-center mx-auto">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-[#292929] uppercase tracking-tight">
                No se encontraron atajos para &quot;{searchQuery}&quot;
              </h3>
              <p className="text-xs sm:text-sm text-[#4A4A4A]">
                Prueba a buscar con otra palabra clave como <em>Enter</em>, <em>Clockify</em>, <em>330</em> o <em>Alt</em>.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-2 px-4 py-2 rounded-xl bg-[#8E0E75] text-white text-xs font-black uppercase tracking-tight"
              >
                Mostrar todos los atajos
              </button>
            </div>
          ) : (
            <div className={`grid gap-5 sm:gap-6 ${
              activeCategory !== 'all' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
            }`}>
              {filteredCategories.map((category) => (
                <div 
                  key={category.id}
                  className="rounded-3xl border-2 border-[#D8CFF0] bg-[#FAF8FD]/70 p-5 sm:p-6 space-y-4 shadow-sm hover:border-[#8E0E75]/40 transition-all flex flex-col"
                >
                  {/* Cabecera de Categoría Destacada */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-[#EAE4F5]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-white border-2 border-[#D8CFF0] shadow-xs">
                        {renderIcon(category.iconName)}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-[#191654] uppercase tracking-tight">
                          {category.title}
                        </h3>
                        <span className="text-[11px] font-semibold text-[#8E0E75]">
                          {category.items.length} {category.items.length === 1 ? 'atajo configurado' : 'atajos disponibles'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Atajos con Espaciado Generoso y Teclado 3D */}
                  <ul className="space-y-3">
                    {category.items.map((item, idx) => (
                      <li 
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3 sm:px-4 sm:py-3.5 rounded-2xl bg-white border border-[#EAE4F5] hover:border-[#8E0E75]/40 hover:shadow-xs transition-all group"
                      >
                        {/* Descripción y Badges */}
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-bold text-[#292929] leading-snug group-hover:text-[#191654] transition-colors block">
                            {item.description}
                          </span>
                          {item.badge && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/25">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>{item.badge}</span>
                            </span>
                          )}
                        </div>

                        {/* Botones de Teclado con Efecto 3D Táctil Premium */}
                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                          {item.keys.map((k, kIdx) => {
                            const isConnector = k === 'o';
                            if (isConnector) {
                              return (
                                <span key={kIdx} className="text-xs font-black text-[#8E0E75] px-1 font-sans">
                                  o
                                </span>
                              );
                            }

                            return (
                              <React.Fragment key={kIdx}>
                                {kIdx > 0 && item.keys[kIdx - 1] !== 'o' && (
                                  <span className="text-[11px] font-black text-[#8E0E75] px-0.5 select-none opacity-80">
                                    +
                                  </span>
                                )}
                                <kbd
                                  className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-xl text-xs font-mono font-black tracking-tight select-none shadow-xs transition-all ${
                                    item.isAction
                                      ? 'bg-gradient-to-b from-[#F8F6FC] to-[#EFE9F7] text-[#8E0E75] border border-[#D8CFF0] border-b-[3px] border-b-[#B8A7E0]'
                                      : 'bg-gradient-to-b from-white via-[#FCFBFD] to-[#F1EAF8] text-[#191654] border border-[#D8CFF0] border-b-[3px] border-b-[#B8A7E0]'
                                  }`}
                                >
                                  {k}
                                </kbd>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie de Página de Alto Rendimiento: Integración Limpia, Sin Bloques Amarillos Invasivos */}
        <div className="bg-[#FAF8FD] border-t-2 border-[#EAE4F5] px-6 sm:px-8 py-3.5 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-inner">
          {/* Tip de Velocidad Ejecutivo con Paleta Institucional (Lila + Violeta + Deep Blue) */}
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border-2 border-[#D8CFF0] shadow-xs flex-1 max-w-3xl">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#191654] to-[#8E0E75] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-xs text-[#292929] leading-snug">
              <span className="font-black text-[#8E0E75] uppercase tracking-wide mr-2 inline-block">
                Tip Pro de Velocidad:
              </span>
              <span className="text-[#4A4A4A] font-medium">
                Escribe la tarea y pulsa{' '}
                <kbd className="inline-block px-1.5 py-0.5 bg-[#FAF8FD] text-[#191654] rounded-md border border-[#D8CFF0] border-b-2 border-b-[#B8A7E0] font-mono font-black text-[11px] shadow-2xs">
                  Enter
                </kbd>{' '}
                para arrancar al instante · O teclea{' '}
                <kbd className="inline-block px-1.5 py-0.5 bg-[#FAF8FD] text-[#191654] rounded-md border border-[#D8CFF0] border-b-2 border-b-[#B8A7E0] font-mono font-black text-[11px] shadow-2xs">
                  330
                </kbd>{' '}
                para imputar <strong className="text-[#191654]">3h 30m</strong> de golpe.
              </span>
            </div>
          </div>

          {/* Atajos de Cierre + Botón de Confirmación Principal */}
          <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-[#6E6283]">
              <span className="hidden sm:inline font-semibold text-slate-400">Cerrar con:</span>
              <kbd className="px-2 py-1 bg-white text-[#191654] rounded-lg border border-[#D8CFF0] border-b-2 border-b-[#B8A7E0] font-mono font-black text-xs shadow-2xs">
                ESC
              </kbd>
              <span className="text-slate-400 font-bold">/</span>
              <kbd className="px-2 py-1 bg-white text-[#191654] rounded-lg border border-[#D8CFF0] border-b-2 border-b-[#B8A7E0] font-mono font-black text-xs shadow-2xs">
                ?
              </kbd>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#191654] to-[#8E0E75] hover:from-[#241F6B] hover:to-[#A31287] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

