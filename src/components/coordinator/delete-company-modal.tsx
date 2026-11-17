'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Company } from '@/types/database';
import { CompanyLogo } from '@/components/ui/company-logo';

interface DeleteCompanyModalProps {
  company: Company | null;
  entriesCount: number;
  totalMinutes: number;
  isDeleting: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

/**
 * Pantalla de confirmación de alto impacto antes de eliminar una empresa y todas sus horas imputadas.
 */
export function DeleteCompanyModal({
  company,
  entriesCount,
  totalMinutes,
  isDeleting,
  onClose,
  onConfirmDelete,
}: DeleteCompanyModalProps) {
  useEffect(() => {
    if (!company) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [company, isDeleting, onClose]);

  if (!company) return null;

  const totalHoursText = `${(totalMinutes / 60).toFixed(1)} hrs`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-company-warning-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border-4 border-red-600 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera de Alerta Crítica */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-100">
                Zona Destructiva
              </p>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Eliminación Definitiva de Cliente
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar advertencia"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo en MUY GRANDE */}
        <div className="p-6 sm:p-8 text-center space-y-5">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#F8F6FC] border-2 border-[#D8CFF0]">
            <div className="h-8 w-8 rounded-lg bg-white border border-[#D8CFF0] flex items-center justify-center overflow-hidden p-0.5 shrink-0">
              <CompanyLogo company={company} size="sm" className="h-full w-full" />
            </div>
            <span className="text-sm font-black uppercase tracking-tight text-[#191654]">
              {company.name}
            </span>
          </div>

          <h3
            id="delete-company-warning-title"
            className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#191654] leading-tight"
          >
            ¿ESTÁS SEGURO DE QUE QUIERES ELIMINAR{' '}
            <span className="text-red-600 underline decoration-4 underline-offset-4">
              {company.name.toUpperCase()}
            </span>
            ?
          </h3>

          <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-500 text-red-700 shadow-xs">
            <p className="text-lg sm:text-2xl font-black uppercase tracking-tight leading-snug">
              ESTA ACCIÓN SERÁ IRREVERSIBLE Y SE PERDERÁN TODAS LAS HORAS DE ESTE CLIENTE
            </p>
          </div>

          <p className="text-xs sm:text-sm font-bold text-[#4A4A4A]">
            {entriesCount > 0 ? (
              <>
                Se borrarán permanentemente{' '}
                <span className="font-black text-red-700">
                  {entriesCount} {entriesCount === 1 ? 'registro' : 'registros'} ({totalHoursText})
                </span>{' '}
                imputados a <span className="font-black text-[#191654]">{company.name}</span>.
              </>
            ) : (
              <>Este cliente actualmente no tiene registros de horas imputadas.</>
            )}
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-3 border-t border-[#EAE4F5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#292929] text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar y Mantener
            </button>

            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Sí, Eliminar Definitivamente</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
