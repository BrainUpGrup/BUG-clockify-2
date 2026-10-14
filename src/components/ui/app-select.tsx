'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  icon,
  className = '',
  disabled = false,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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

  // Cerrar al presionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botón Disparador con Identidad Brain Up */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-sm border text-xs font-semibold text-left transition-all outline-none ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-white border-[#8E0E75] ring-2 ring-[#8E0E75]/15 shadow-sm text-[#292929]'
            : 'bg-white hover:bg-[#F8F6FC] border-[#D8CFF0] text-[#292929] hover:border-[#8E0E75]'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-[#8E0E75] shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#8E0E75] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menú Desplegable Flotante Propio con Paleta Brain Up */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-sm border border-[#D8CFF0] bg-white p-1 shadow-xl shadow-[#191654]/10 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-[#4A4A4A]">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-xs font-medium text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#F8F6FC] text-[#8E0E75] font-bold border-l-2 border-[#8E0E75]'
                      : 'text-[#4A4A4A] hover:bg-[#F8F6FC] hover:text-[#8E0E75]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#8E0E75] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
