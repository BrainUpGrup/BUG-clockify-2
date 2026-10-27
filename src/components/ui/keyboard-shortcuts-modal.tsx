'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Keyboard, 
  X, 
  Clock, 
  LayoutGrid, 
  CheckSquare, 
  Sparkles, 
  Edit3, 
  CornerDownLeft, 
  Command, 
  MousePointer, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Play
} from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  badge?: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
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

      // Si está en un input, solo responder si pulsa Escape o F1
      if (isInput && e.key !== 'F1') return;

      // Abrir con '?' (Shift + /) o F1
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) || e.key === 'F1') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Navegación rápida con Alt + 1..5
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
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

  if (!isOpen) return null;

  const categories: ShortcutCategory[] = [
    {
      title: 'Control Horario (Clockify)',
      icon: <Clock className="h-4 w-4 text-[#8E0E75]" />,
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
        },
        {
          keys: ['Clic', 'Tiempo'],
          description: 'Modificar duración con shorthand o selector rápido',
        },
        {
          keys: ['Repetir'],
          description: 'Reanudar una tarea anterior clonando cliente y descripción',
        },
      ],
    },
    {
      title: 'Shorthands de Tiempo (Velocidad de Agencia)',
      icon: <Sparkles className="h-4 w-4 text-[#8E0E75]" />,
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
        },
      ],
    },
    {
      title: 'Navegación Global entre Aplicaciones',
      icon: <LayoutGrid className="h-4 w-4 text-[#8E0E75]" />,
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
      title: 'TaskFlow, Calendario y Modales',
      icon: <CheckSquare className="h-4 w-4 text-[#8E0E75]" />,
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
        },
        {
          keys: ['Calendario'],
          description: 'Entregables con fecha pactada vs Post-its (alertas recurrentes)',
          badge: 'Concepto',
        },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#191654]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border-3 border-[#8E0E75] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Atajos de Teclado y Guía de Velocidad</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Brain Up
                </span>
              </h2>
              <p className="text-xs text-white/80 font-medium">
                Diseñados para agilizar el flujo de trabajo diario de la agencia sin tocar el ratón.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar modal de atajos"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido en cuadrícula de 2 columnas compacta (Zero-Scroll Viewport DM-15) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categories.map((category) => (
              <div 
                key={category.title}
                className="rounded-2xl border-2 border-[#D8CFF0] bg-[#F8F6FC]/60 p-4.5 space-y-3 shadow-2xs"
              >
                {/* Título de la categoría */}
                <div className="flex items-center gap-2 pb-2 border-b border-[#D8CFF0]">
                  <div className="p-1.5 rounded-lg bg-white border border-[#D8CFF0]">
                    {category.icon}
                  </div>
                  <h3 className="text-sm font-black text-[#191654] tracking-tight">
                    {category.title}
                  </h3>
                </div>

                {/* Lista de atajos */}
                <ul className="space-y-2.5">
                  {category.items.map((item, idx) => (
                    <li 
                      key={idx}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[#292929] font-medium leading-tight block">
                          {item.description}
                        </span>
                        {item.badge && (
                          <span className="inline-block mt-0.5 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/20">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Teclas kbd */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-mono font-black bg-white text-[#191654] border-2 border-[#D8CFF0] shadow-xs tabular-nums"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Tarjeta de Consejo Pro / Velocidad de Agencia */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="font-black text-amber-950 block">Consejo de oro para el día a día:</strong>
              <p className="text-amber-900/90 leading-relaxed">
                Escribe directamente la tarea en el buscador y pulsa <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono font-bold text-[11px]">Enter</kbd> para arrancar el cronómetro al instante. Si prefieres introducir horas manuales pasadas, teclea solo <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono font-bold text-[11px]">330</kbd> para registrar 3h 30m de una sola vez.
              </p>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="px-6 py-3.5 bg-white border-t border-[#D8CFF0] flex items-center justify-between text-xs text-[#4A4A4A]">
          <span className="flex items-center gap-2">
            <span>Pulsa <kbd className="px-1.5 py-0.5 bg-[#F8F6FC] rounded border border-[#D8CFF0] font-mono font-bold">Esc</kbd> o <kbd className="px-1.5 py-0.5 bg-[#F8F6FC] rounded border border-[#D8CFF0] font-mono font-bold">?</kbd> para salir</span>
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-5 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-bold text-xs uppercase tracking-tight shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
