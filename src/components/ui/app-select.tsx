'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

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
  /** Nombre accesible cuando no hay <label> asociado. */
  ariaLabel?: string;
  /** Muestra un buscador dentro del menú. Por defecto, a partir de 7 opciones. */
  searchable?: boolean;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  icon,
  className = '',
  disabled = false,
  ariaLabel,
  searchable,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeAhead = useRef({ text: '', at: 0 });
  const baseId = useId();
  const listId = `${baseId}-list`;

  const showSearch = searchable ?? options.length >= 7;
  const selectedOption = options.find((opt) => opt.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query.trim());
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  };

  const close = (returnFocus = true) => {
    setIsOpen(false);
    setQuery('');
    if (returnFocus) triggerRef.current?.focus();
  };

  const handleSelect = (val: string) => {
    onChange(val);
    close();
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Foco en el buscador al abrir
  useEffect(() => {
    if (isOpen && showSearch) searchRef.current?.focus();
  }, [isOpen, showSearch]);

  // Mantener visible la opción activa
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[activeIndex]) handleSelect(filtered[activeIndex].value);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        // Búsqueda tecleando cuando no hay buscador visible
        if (!showSearch && e.key.length === 1) {
          const now = Date.now();
          typeAhead.current.text = now - typeAhead.current.at > 700 ? e.key : typeAhead.current.text + e.key;
          typeAhead.current.at = now;
          const q = normalize(typeAhead.current.text);
          const idx = filtered.findIndex((o) => normalize(o.label).startsWith(q));
          if (idx >= 0) setActiveIndex(idx);
        }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && !showSearch && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-sm border text-sm font-semibold text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#8E0E75]/30 ${
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
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#8E0E75] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-sm border border-[#D8CFF0] bg-white shadow-xl shadow-[#191654]/10">
          {showSearch && (
            <div className="p-1.5 border-b border-[#EAE4F5]">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Buscar..."
                  role="searchbox"
                  aria-controls={listId}
                  aria-activedescendant={activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined}
                  className="w-full pl-8 pr-2 py-2 text-sm rounded-sm border border-[#D8CFF0] outline-none focus:border-[#8E0E75]"
                />
              </div>
            </div>
          )}
          <div ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-[#4A4A4A]">
                {options.length === 0 ? 'No hay opciones disponibles' : 'Sin resultados'}
              </div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={option.value}
                    id={`${baseId}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm text-sm font-semibold text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#8E0E75] text-white font-bold'
                        : isActive
                        ? 'bg-[#EFE6F7] text-[#8E0E75] ring-1 ring-inset ring-[#8E0E75]/40'
                        : 'text-[#292929]'
                    } ${isActive && isSelected ? 'ring-2 ring-[#191654]/30' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-[#8E0E75]'}`}>{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
