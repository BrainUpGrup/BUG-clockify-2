'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ListChecks, Clock, Pencil, CheckCircle2 } from 'lucide-react';
import { Company, CompanyQuotaActivity } from '@/types/database';

interface QuotaActivitiesTooltipCellProps {
  company: Company;
  onEdit: () => void;
}

function formatHoursCompact(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

export function QuotaActivitiesTooltipCell({ company, onEdit }: QuotaActivitiesTooltipCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activities: CompanyQuotaActivity[] = Array.isArray(company.quota_activities)
    ? company.quota_activities.filter((a) => a && typeof a.title === 'string' && a.title.trim())
    : [];

  const isCuota = company.client_type === 'cuota' && !!company.monthly_hours_quota;
  const totalQuota = company.monthly_hours_quota || 0;
  const assignedHours = activities.reduce(
    (sum, item) => sum + (typeof item.hours === 'number' && item.hours > 0 ? item.hours : 0),
    0
  );
  const hasAnyHoursBreakdown = assignedHours > 0;
  const quotaDiff = isCuota ? Math.round((totalQuota - assignedHours) * 100) / 100 : 0;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 316;
    const estimatedHeight = Math.min(340, 130 + activities.length * 32);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight + 16 && rect.top > estimatedHeight + 16;

    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(12, Math.min(centeredLeft, window.innerWidth - tooltipWidth - 12));

    setCoords({
      top: placeAbove ? rect.top - 10 : rect.bottom + 10,
      left: clampedLeft,
      placeAbove,
    });
  };

  const openTooltip = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 110);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activities.length]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (!isCuota && activities.length === 0) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="inline-flex items-center justify-center">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleClose}
        onFocus={openTooltip}
        onBlur={scheduleClose}
        onClick={onEdit}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-mono tabular-nums font-extrabold text-xs ${
          activities.length > 0
            ? 'bg-[#F8F6FC] border-[#D8CFF0] text-[#292929] hover:border-[#8E0E75] hover:text-[#8E0E75] shadow-2xs'
            : 'bg-transparent border-transparent text-[#292929] hover:bg-[#F8F6FC] hover:border-[#D8CFF0] hover:text-[#8E0E75]'
        }`}
        aria-label={
          isCuota
            ? `Ver desglose de ${company.monthly_hours_quota} horas al mes de ${company.name}`
            : `Ver actividades habituales de ${company.name}`
        }
      >
        <span>{isCuota ? `${company.monthly_hours_quota}h / mes` : 'Puntual'}</span>
        {activities.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#8E0E75] text-white text-[10px] font-black leading-none"
            title={`${activities.length} actividades definidas`}
          >
            <ListChecks className="h-2.5 w-2.5" />
            <span>{activities.length}</span>
          </span>
        )}
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onMouseEnter={openTooltip}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: 316,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
            }}
            className="z-[90] rounded-2xl border-2 border-[#D8CFF0] bg-white shadow-2xl shadow-[#191654]/20 overflow-hidden text-left font-sans animate-in fade-in duration-150"
            role="tooltip"
          >
            {/* Cabecera La Abuela */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                  Dedicación de Horas
                </p>
                <p className="text-xs font-black uppercase tracking-tight truncate mt-0.5">
                  {company.name}
                </p>
              </div>
              {isCuota && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/15 border border-white/25 text-[11px] font-black font-mono tabular-nums">
                  <Clock className="h-3 w-3 text-purple-200" />
                  <span>{company.monthly_hours_quota}h / mes</span>
                </span>
              )}
            </div>

            {/* Cuerpo de Actividades */}
            <div className="p-3 space-y-2.5">
              {activities.length === 0 ? (
                <div className="rounded-xl bg-[#F8F6FC] border border-dashed border-[#D8CFF0] p-3 text-center space-y-1.5">
                  <p className="text-xs font-bold text-[#292929]">
                    Sin desglose de actividades todavía
                  </p>
                  <p className="text-[11px] text-[#4A4A4A] leading-snug">
                    Haz clic en las horas o en el botón editar de la empresa para detallar en qué se dedican estas horas.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-1.5 max-h-[210px] overflow-y-auto pr-0.5">
                    {activities.map((item, idx) => {
                      const pct =
                        isCuota && totalQuota > 0 && item.hours
                          ? Math.round((item.hours / totalQuota) * 100)
                          : null;
                      return (
                        <li
                          key={item.id || `${idx}`}
                          className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#F8F6FC] border border-[#EAE4F5]"
                        >
                          <div className="flex items-start gap-1.5 min-w-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#8E0E75] shrink-0 mt-0.5" />
                            <span className="text-[11px] font-semibold text-[#292929] leading-snug break-words">
                              {item.title}
                            </span>
                          </div>
                          {typeof item.hours === 'number' && item.hours > 0 && (
                            <div className="shrink-0 text-right">
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-white border border-[#D8CFF0] text-[10px] font-black font-mono tabular-nums text-[#8E0E75]">
                                {formatHoursCompact(item.hours)}
                              </span>
                              {pct !== null && (
                                <span className="block text-[9px] font-bold text-slate-400 tabular-nums mt-0.5">
                                  {pct}%
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Balance resumido contra cuota */}
                  {isCuota && hasAnyHoursBreakdown && (
                    <div className="pt-2 border-t border-[#EAE4F5] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
                        <span className="text-[#4A4A4A]">Reparto asignado</span>
                        <span
                          className={`font-mono tabular-nums ${
                            quotaDiff === 0
                              ? 'text-[#3BB54A]'
                              : quotaDiff > 0
                                ? 'text-amber-600'
                                : 'text-[#8E0E75]'
                          }`}
                        >
                          {formatHoursCompact(assignedHours)} / {formatHoursCompact(totalQuota)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#EAE4F5] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            quotaDiff === 0
                              ? 'bg-[#3BB54A]'
                              : quotaDiff > 0
                                ? 'bg-amber-500'
                                : 'bg-[#8E0E75]'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((assignedHours / totalQuota) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pie interactivo */}
              <div className="pt-1.5 border-t border-[#EAE4F5] flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  {activities.length === 1
                    ? '1 actividad registrada'
                    : `${activities.length} actividades registradas`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onEdit();
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8E0E75] hover:text-[#700B5C] cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Editar lista</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
