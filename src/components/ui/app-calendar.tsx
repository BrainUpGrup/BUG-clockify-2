'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface AppCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function AppCalendar({
  value,
  onChange,
  className = '',
  label,
}: AppCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar vista con la fecha seleccionada o la actual
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() || new Date().getMonth());

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar al pulsar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Formato legible para el botón
  const formatButtonText = (dateStr: string) => {
    if (!dateStr) return 'Seleccionar fecha';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);

      const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return `Hoy (${d} ${MONTH_NAMES[m - 1].slice(0, 3)})`;
      if (diffDays === 1) return `Ayer (${d} ${MONTH_NAMES[m - 1].slice(0, 3)})`;

      return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
    } catch {
      return dateStr;
    }
  };

  // Navegar meses
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Establecer fecha rápida (Hoy / Ayer)
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    onChange(dateStr);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  // Construir matriz de días del mes
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // En JavaScript getDay() es 0=Domingo, 1=Lunes. Convertir a 0=Lunes..6=Domingo
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;

  // Días del mes anterior para relleno
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${viewYear}-${mStr}-${dStr}`;
    onChange(fullDate);
    setIsOpen(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Botón Disparador del Calendario Propio */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-semibold transition-all outline-none ${
          isOpen
            ? 'bg-white border-[#8E0E75] ring-2 ring-[#8E0E75]/15 shadow-sm text-[#292929]'
            : 'bg-white hover:bg-[#F8F6FC] border-[#D8CFF0] text-[#292929] hover:border-[#8E0E75]'
        }`}
      >
        <CalendarIcon className="h-3.5 w-3.5 text-[#8E0E75] shrink-0" />
        {label && <span className="text-[#4A4A4A] font-normal">{label}:</span>}
        <span>{formatButtonText(value)}</span>
      </button>

      {/* Popover del Calendario Propio con Paleta Brain Up */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-sm border border-[#D8CFF0] bg-white p-4 shadow-2xl shadow-[#191654]/15 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150">
          
          {/* Cabecera del Mes y Año con Flechas de Navegación */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE4F5]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-sm text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="font-extrabold text-xs text-[#292929] uppercase tracking-wider">
              {MONTH_NAMES[viewMonth]} <span className="text-[#8E0E75]">{viewYear}</span>
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-sm text-[#4A4A4A] hover:text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Días de la semana (Lu, Ma, Mi...) */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="text-[11px] font-bold text-[#8E0E75] uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Rejilla de Días del Mes */}
          <div className="grid grid-cols-7 gap-1">
            {/* Relleno días mes anterior */}
            {Array.from({ length: startDay }).map((_, i) => (
              <span
                key={`prev-${i}`}
                className="flex h-8 items-center justify-center text-xs text-slate-300 select-none"
              >
                {prevMonthDays - startDay + i + 1}
              </span>
            ))}

            {/* Días del mes actual */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const dateStr = `${viewYear}-${mStr}-${dStr}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`flex h-8 w-8 mx-auto items-center justify-center rounded-sm text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#8E0E75] text-white shadow-md shadow-[#8E0E75]/30'
                      : isToday
                      ? 'bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0] hover:bg-[#D8CFF0]/40'
                      : 'text-[#292929] hover:bg-[#F8F6FC] hover:text-[#8E0E75]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Botones de Selección Rápida Estilo Editorial */}
          <div className="mt-3 pt-3 border-t border-[#EAE4F5] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="px-3 py-1 rounded-sm border border-[#8E0E75] bg-white text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-3 py-1 rounded-sm border border-[#8E0E75] bg-white text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Ayer
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
