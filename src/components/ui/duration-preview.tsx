'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { describeDurationInput, formatMinutes } from '@/lib/utils';

interface DurationPreviewProps {
  id?: string;
  value: string;
  /** Posición del globo: debajo del campo (por defecto) o integrado en línea. */
  inline?: boolean;
  /** Alineación del globo flotante respecto al campo. */
  align?: 'left' | 'right';
}

/** Vista previa en vivo de cómo se interpretará la duración tecleada (A3). */
export function DurationPreview({ id, value, inline = false, align = 'left' }: DurationPreviewProps) {
  if (!value.trim()) return null;
  const { minutes, hint } = describeDurationInput(value);

  const content = minutes > 0 ? (
    <>
      <span className="font-bold text-[#8E0E75]">= {formatMinutes(minutes)}</span>
      {hint && (
        <span className="flex items-start gap-1 text-amber-700 mt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>{hint}</span>
        </span>
      )}
    </>
  ) : (
    <span className="text-red-600 font-semibold">Formato no válido (ej. 3, 330, 2h 15m)</span>
  );

  return (
    <div
      id={id}
      aria-live="polite"
      className={
        inline
          ? 'text-xs leading-snug'
          : `absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-20 w-60 text-xs leading-snug bg-white border border-[#D8CFF0] rounded-lg shadow-md px-2.5 py-1.5`
      }
    >
      {content}
    </div>
  );
}
