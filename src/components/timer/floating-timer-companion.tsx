'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { 
  Clock, 
  Play, 
  Square, 
  ExternalLink, 
  Building2, 
  GripVertical, 
  X, 
  Minimize2, 
  Maximize2,
  ArrowUpRight,
  Pin,
  Check
} from 'lucide-react';
import { useTimer } from '@/context/timer-context';
import { formatSecondsToTimer } from '@/lib/utils';

export function FloatingTimerCompanion() {
  const pathname = usePathname();

  const { 
    activeCompany, 
    activeCompanyId, 
    isTimerRunning, 
    timerSeconds, 
    startTimer, 
    stopTimer 
  } = useTimer();

  // Estado de la ventana nativa Always-on-Top (Document Picture-in-Picture)
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isPipSupported, setIsPipSupported] = useState<boolean>(false);
  const [isPipCompact, setIsPipCompact] = useState<boolean>(false);

  // Estado del widget flotante arrastrable dentro de la aplicación
  const [isWidgetVisible, setIsWidgetVisible] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false); // false = Grande, true = Súper Reducido
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Comprobar soporte de Document Picture-in-Picture al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPipSupported('documentPictureInPicture' in window);
      
      // Restaurar posición guardada del widget arrastrable
      try {
        const savedPos = localStorage.getItem('bug_floating_widget_pos');
        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            setPosition(parsed);
          }
        }
        const savedVisibility = localStorage.getItem('bug_floating_widget_visible');
        if (savedVisibility === 'true') {
          setIsWidgetVisible(true);
        }
        const savedCollapsed = localStorage.getItem('bug_floating_widget_collapsed');
        if (savedCollapsed === 'true') {
          setIsCollapsed(true);
        }
      } catch (e) {
        console.warn('Error restoring floating widget config:', e);
      }
    }
  }, []);

  // Función para abrir la ventana flotante que sigue al usuario a otras webs/aplicaciones (PiP)
  const openExternalPipWindow = useCallback(async () => {
    if (pipWindow) {
      pipWindow.focus();
      return;
    }

    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: isPipCompact ? 340 : 380,
          height: isPipCompact ? 68 : 160,
          disallowReturnToOpener: false,
        });

        // Inyectar estilos limpios en la ventana flotante nativa
        const style = pip.document.createElement('style');
        style.textContent = `
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Google Sans", "Product Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #FFFFFF; color: #292929; user-select: none; overflow: hidden; padding: 10px; }
          
          /* MODO GRANDE */
          .pip-container { display: flex; flex-direction: column; gap: 8px; height: 100%; justify-content: space-between; }
          .pip-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #EAE4F5; padding-bottom: 6px; }
          .pip-brand { display: flex; align-items: center; gap: 5px; font-weight: 900; font-size: 11px; text-transform: uppercase; color: #191654; }
          .pip-brand span { color: #8E0E75; }
          .pip-header-right { display: flex; align-items: center; gap: 6px; }
          .pip-status { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
          .pip-status.running { background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; }
          .pip-status.stopped { background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB; }
          .pip-btn-toggle { background: #F8F6FC; border: 1px solid #D8CFF0; color: #8E0E75; font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 3px 6px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
          .pip-btn-toggle:hover { background: #8E0E75; color: #FFFFFF; }
          .pip-body { display: flex; align-items: center; justify-content: space-between; background: #F8F6FC; border: 2px solid #D8CFF0; border-radius: 6px; padding: 8px 10px; }
          .pip-company { display: flex; flex-direction: column; max-width: 180px; }
          .pip-company-tag { font-size: 8px; font-weight: 900; color: #8E0E75; text-transform: uppercase; }
          .pip-company-name { font-size: 12px; font-weight: 900; color: #191654; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pip-timer { font-family: monospace; font-size: 20px; font-weight: 900; color: #292929; }
          .pip-timer.running { color: #DC2626; }
          .pip-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .pip-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 6px; cursor: pointer; border: none; transition: all 0.15s; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
          .pip-btn:hover { transform: scale(1.02); }
          .pip-btn-stop { background: #DC2626; color: #FFFFFF; }
          .pip-btn-stop:hover { background: #B91C1C; }
          .pip-btn-start { background: #10B981; color: #FFFFFF; }
          .pip-btn-start:hover { background: #059669; }
          .pip-btn-return { background: #F8F6FC; color: #8E0E75; border: 2px solid #D8CFF0; }
          .pip-btn-return:hover { background: #8E0E75; color: #FFFFFF; border-color: #8E0E75; }

          /* MODO SÚPER REDUCIDO (Ultra Compacto) */
          .pip-compact-view { display: flex; align-items: center; justify-content: space-between; gap: 6px; height: 100%; width: 100%; }
          .pip-compact-left { display: flex; align-items: center; gap: 5px; min-width: 0; }
          .pip-compact-company { font-size: 11px; font-weight: 900; color: #191654; text-transform: uppercase; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pip-compact-timer { font-family: monospace; font-size: 15px; font-weight: 900; color: #292929; white-space: nowrap; }
          .pip-compact-timer.running { color: #DC2626; }
          .pip-compact-actions { display: flex; align-items: center; gap: 4px; shrink-0; }
          .pip-btn-compact-action { padding: 4px 8px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; border-radius: 4px; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 3px; color: #FFFFFF; }
          .pip-btn-compact-icon { padding: 4px 6px; background: #F8F6FC; border: 1px solid #D8CFF0; color: #8E0E75; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
          .pip-btn-compact-icon:hover { background: #8E0E75; color: #FFFFFF; }
          .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #DC2626; display: inline-block; animation: pulse 1s infinite; shrink-0; }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
        `;
        pip.document.head.appendChild(style);

        pip.addEventListener('pagehide', () => {
          setPipWindow(null);
        });

        setPipWindow(pip);
      } catch (err) {
        console.warn('PiP window failed or cancelled:', err);
        // Fallback: abrir ventana popup estándar
        openPopupFallback();
      }
    } else {
      openPopupFallback();
    }
  }, [pipWindow, isPipCompact]);

  // Fallback si el navegador no soporta Document PiP directamente
  const openPopupFallback = () => {
    const left = window.screen.width - 400;
    const top = 100;
    const popup = window.open(
      '/floating-timer',
      'BrainUpFloatingTimer',
      `width=380,height=180,left=${left},top=${top},toolbar=no,menubar=no,status=no,resizable=yes`
    );
    if (popup) {
      popup.focus();
    }
  };

  // Función para volver y enfocar la pestaña principal de la aplicación
  const handleReturnToMainApp = () => {
    if (typeof window !== 'undefined') {
      window.focus();
    }
  };

  // Alternar modo en la ventana PiP nativa
  const handleTogglePipMode = (compact: boolean) => {
    setIsPipCompact(compact);
    if (pipWindow && (pipWindow as any).resizeTo) {
      try {
        if (compact) {
          (pipWindow as any).resizeTo(340, 68);
        } else {
          (pipWindow as any).resizeTo(380, 165);
        }
      } catch (e) {
        console.warn('Cannot resize PiP:', e);
      }
    }
  };

  // Escuchar eventos globales del bus de la aplicación para activar el widget
  useEffect(() => {
    const handleOpenWidget = () => {
      setIsWidgetVisible(true);
      try {
        localStorage.setItem('bug_floating_widget_visible', 'true');
      } catch {}
    };

    const handleOpenPip = () => {
      openExternalPipWindow();
    };

    window.addEventListener('bug_open_floating_widget', handleOpenWidget);
    window.addEventListener('bug_open_pip_window', handleOpenPip);

    return () => {
      window.removeEventListener('bug_open_floating_widget', handleOpenWidget);
      window.removeEventListener('bug_open_pip_window', handleOpenPip);
    };
  }, [openExternalPipWindow]);

  // Lógica de arrastre con el ratón (Drag & Drop en cualquier posición de la pantalla)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        try {
          localStorage.setItem('bug_floating_widget_pos', JSON.stringify(position));
        } catch {}
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('bug_floating_widget_collapsed', collapsed ? 'true' : 'false');
    } catch {}
  };

  // Si estamos en la página standalone /floating-timer, no montar el widget duplicado dentro de sí misma
  if (pathname === '/floating-timer') {
    return null;
  }

  // Renderizar contenido en la ventana flotante nativa externa (PiP)
  const renderPipContent = () => {
    if (!pipWindow) return null;

    if (isPipCompact) {
      // Vista PiP Súper Reducida
      return createPortal(
        <div className="pip-compact-view">
          <div className="pip-compact-left">
            <span className={isTimerRunning ? 'pulse-dot' : ''} style={{ background: isTimerRunning ? '#DC2626' : '#9CA3AF' }} />
            <span className="pip-compact-company" title={activeCompany?.name || 'Cliente'}>
              {activeCompany?.name || 'Sin Cliente'}
            </span>
          </div>

          <div className={`pip-compact-timer ${isTimerRunning ? 'running' : ''}`}>
            {formatSecondsToTimer(timerSeconds)}
          </div>

          <div className="pip-compact-actions">
            {isTimerRunning ? (
              <button
                type="button"
                className="pip-btn-compact-action"
                style={{ background: '#DC2626' }}
                onClick={() => stopTimer()}
                title="Detener temporizador"
              >
                <Square size={10} fill="currentColor" />
                PARAR
              </button>
            ) : (
              <button
                type="button"
                className="pip-btn-compact-action"
                style={{ background: '#10B981' }}
                onClick={() => startTimer(activeCompanyId)}
                title="Iniciar temporizador"
              >
                <Play size={10} fill="currentColor" />
                INICIAR
              </button>
            )}

            <button
              type="button"
              className="pip-btn-compact-icon"
              onClick={() => handleTogglePipMode(false)}
              title="Expandir a Modo Grande"
            >
              <Maximize2 size={11} />
            </button>

            <button
              type="button"
              className="pip-btn-compact-icon"
              onClick={handleReturnToMainApp}
              title="Volver a la pestaña principal de Brain Up"
            >
              <ArrowUpRight size={11} />
            </button>
          </div>
        </div>,
        pipWindow.document.body
      );
    }

    // Vista PiP Grande Estándar
    return createPortal(
      <div className="pip-container">
        <div className="pip-header">
          <div className="pip-brand">
            BRAIN <span>UP</span> • CONTADOR
          </div>
          <div className="pip-header-right">
            <div className={`pip-status ${isTimerRunning ? 'running' : 'stopped'}`}>
              {isTimerRunning ? (
                <>
                  <span className="pulse-dot" />
                  EN MARCHA
                </>
              ) : (
                'DETENIDO'
              )}
            </div>
            <button
              type="button"
              className="pip-btn-toggle"
              onClick={() => handleTogglePipMode(true)}
              title="Reducir a modo súper compacto"
            >
              <Minimize2 size={10} />
              REDUCIDO
            </button>
          </div>
        </div>

        <div className="pip-body">
          <div className="pip-company">
            <span className="pip-company-tag">Empresa en Curso</span>
            <span className="pip-company-name" title={activeCompany?.name || 'Selecciona Cliente'}>
              {activeCompany?.name || 'Sin Cliente Seleccionado'}
            </span>
          </div>
          <div className={`pip-timer ${isTimerRunning ? 'running' : ''}`}>
            {formatSecondsToTimer(timerSeconds)}
          </div>
        </div>

        <div className="pip-actions">
          {isTimerRunning ? (
            <button
              type="button"
              className="pip-btn pip-btn-stop"
              onClick={() => stopTimer()}
              title="Detener temporizador"
            >
              <Square size={12} fill="currentColor" />
              PARAR
            </button>
          ) : (
            <button
              type="button"
              className="pip-btn pip-btn-start"
              onClick={() => startTimer(activeCompanyId)}
              title="Iniciar temporizador"
            >
              <Play size={12} fill="currentColor" />
              INICIAR
            </button>
          )}

          <button
            type="button"
            className="pip-btn pip-btn-return"
            onClick={handleReturnToMainApp}
            title="Volver a la pestaña principal de Brain Up"
          >
            <ArrowUpRight size={12} />
            VOLVER A LA APP
          </button>
        </div>
      </div>,
      pipWindow.document.body
    );
  };

  return (
    <>
      {/* 1. Portal a la Ventana Nativa Always-on-Top (Document Picture-in-Picture) */}
      {renderPipContent()}

      {/* 2. Widget Flotante Arrastrable dentro del Navegador (Persecución de Páginas) */}
      {isWidgetVisible && (
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 99999,
          }}
          className={`shadow-2xl rounded-md border-2 border-[#D8CFF0] bg-white transition-shadow duration-150 select-none ${
            isDragging ? 'ring-2 ring-[#8E0E75] opacity-95 scale-[1.02]' : ''
          }`}
        >
          {isCollapsed ? (
            // ==========================================
            // MODO SÚPER REDUCIDO (Barra Ultra Compacta)
            // No interrumpe la navegación ni tapa elementos de la pantalla
            // ==========================================
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/95 backdrop-blur-md rounded-md">
              {/* Grip para arrastrar y reubicar */}
              <div
                onMouseDown={handleMouseDown}
                className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-[#8E0E75] transition-colors"
                title="Arrastra para mover a cualquier parte de la pantalla"
              >
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Empresa activa en modo píldora */}
              <div className="flex items-center gap-1.5 max-w-[110px] min-w-0 pr-1">
                <Building2 className="h-3 w-3 text-[#8E0E75] shrink-0" />
                <span 
                  className="text-[11px] font-black uppercase text-[#191654] truncate leading-tight"
                  title={activeCompany?.name || 'Cliente'}
                >
                  {activeCompany?.name || 'Cliente'}
                </span>
              </div>

              {/* Separador */}
              <div className="h-4 w-px bg-[#D8CFF0] shrink-0" />

              {/* Cronómetro en tiempo real */}
              <div className="flex items-center gap-1 shrink-0 px-1">
                {isTimerRunning ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                ) : (
                  <Clock className="h-3 w-3 text-[#8E0E75]" />
                )}
                <span className={`font-mono text-xs font-black tabular-nums ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
                  {formatSecondsToTimer(timerSeconds)}
                </span>
              </div>

              {/* Controles Rápidos: Iniciar/Parar + Cambiar a Modo Grande + Cerrar */}
              <div className="flex items-center gap-1 shrink-0">
                {isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => stopTimer()}
                    className="px-2 py-1 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Parar temporizador"
                  >
                    <Square className="h-2.5 w-2.5 fill-white" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startTimer(activeCompanyId)}
                    className="px-2 py-1 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Iniciar temporizador"
                  >
                    <Play className="h-2.5 w-2.5 fill-white" />
                    <span>Iniciar</span>
                  </button>
                )}

                {/* Botón Expandir a Modo Grande */}
                <button
                  type="button"
                  onClick={() => handleSetCollapsed(false)}
                  className="p-1 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Expandir a Modo Grande"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>

                {/* Botón Cerrar */}
                <button
                  type="button"
                  onClick={() => setIsWidgetVisible(false)}
                  className="p-1 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Cerrar widget"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            // ==========================================
            // MODO GRANDE (Modo Completo Flotante)
            // ==========================================
            <div className="w-[320px] sm:w-[340px] p-2.5 bg-white flex flex-col gap-2 rounded-md">
              {/* Barra superior del widget flotante */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#EAE4F5]">
                <div className="flex items-center gap-1.5">
                  <div
                    onMouseDown={handleMouseDown}
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded-xs hover:bg-[#F8F6FC] text-slate-400 hover:text-[#8E0E75] transition-colors"
                    title="Arrastra para mover a cualquier parte de la pantalla"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#191654]">
                    Temporizador Flotante
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    (Fijado)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón Cambiar a Modo Súper Reducido */}
                  <button
                    type="button"
                    onClick={() => handleSetCollapsed(true)}
                    className="px-1.5 py-0.5 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border border-[#D8CFF0] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                    title="Minimizar a modo súper reducido que no moleste en pantalla"
                  >
                    <Minimize2 className="h-2.5 w-2.5" />
                    <span>Reducir</span>
                  </button>

                  {/* Botón para saltar a la ventana externa Always-on-Top (PiP) */}
                  <button
                    type="button"
                    onClick={openExternalPipWindow}
                    className="p-1 rounded-md hover:bg-[#F8F6FC] text-[#8E0E75] border border-transparent hover:border-[#D8CFF0] transition-colors"
                    title="Abrir ventana externa flotante que te acompaña a otras páginas y programas"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWidgetVisible(false)}
                    className="p-1 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors"
                    title="Cerrar widget"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Empresa en Curso y Cronómetro */}
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="h-7 w-7 rounded-xs bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 text-[#8E0E75]">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black uppercase text-[#8E0E75] leading-none">
                      Empresa en Curso
                    </span>
                    <span className="text-[11.5px] font-black uppercase text-[#191654] truncate leading-tight mt-0.5">
                      {activeCompany?.name || 'Selecciona Cliente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isTimerRunning && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                  <span className={`font-mono text-base font-black tabular-nums ${isTimerRunning ? 'text-red-600' : 'text-[#292929]'}`}>
                    {formatSecondsToTimer(timerSeconds)}
                  </span>
                </div>
              </div>

              {/* Botones de Acción Grandes y Visuales */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => stopTimer()}
                    className="py-2 px-3 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startTimer(activeCompanyId)}
                    className="py-2 px-3 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Iniciar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openExternalPipWindow}
                  className="py-2 px-3 rounded-md bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] border-2 border-[#D8CFF0] hover:border-[#8E0E75] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                  title="Abrir ventana flotante para trabajar en otras webs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Flotar en OS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
