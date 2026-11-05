'use client';

import React, { useState } from 'react';
import { HostingService } from '@/types/hosting';
import { RefreshCw, X, AlertCircle, Calendar, ArrowRight, Server, Globe } from 'lucide-react';

interface HostingRenewalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: HostingService | null;
  onConfirm: (serviceId: string) => Promise<void>;
}

export function HostingRenewalConfirmModal({
  isOpen,
  onClose,
  service,
  onConfirm,
}: HostingRenewalConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !service) return null;

  // Calcular la nueva fecha (+1 año)
  const currentExp = new Date(service.expiration_date);
  const baseDate = currentExp < new Date() ? new Date() : new Date(currentExp);
  baseDate.setFullYear(baseDate.getFullYear() + 1);
  const newExpFormatted = baseDate.toISOString().split('T')[0].split('-').reverse().join('/');
  const currentExpFormatted = service.expiration_date.split('-').reverse().join('/');

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(service.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera DM-13 */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-linear-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                Confirmar Renovación
              </h3>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Ampliación de vigencia del servicio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido de Confirmación */}
        <div className="p-6 space-y-5 font-sans">
          {/* Pregunta principal destacada */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-50/70 border border-[#D8CFF0]">
            <AlertCircle className="h-5 w-5 text-[#8E0E75] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-black text-[#292929] leading-tight">
                ¿Seguro que quieres renovar este servicio?
              </p>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Esta acción extenderá la vigencia por <strong>1 año adicional</strong> y actualizará los contadores de alerta del sistema.
              </p>
            </div>
          </div>

          {/* Tarjeta de detalles del servicio a renovar */}
          <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#D8CFF0] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {service.service_type?.toLowerCase().includes('dominio') ? (
                  <Globe className="h-4 w-4 text-[#8E0E75]" />
                ) : (
                  <Server className="h-4 w-4 text-[#8E0E75]" />
                )}
                <span className="text-sm font-black text-[#292929]">
                  {service.name}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white border border-[#D8CFF0] text-[#8E0E75]">
                {service.service_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#4A4A4A] pt-1 border-t border-[#D8CFF0]/60">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Cliente</span>
                <span className="font-bold text-[#292929]">{service.client_name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Proveedor</span>
                <span className="font-bold text-[#292929]">{service.provider || 'Cdmon'}</span>
              </div>
            </div>

            {/* Comparativa de Fechas: Actual -> Nueva */}
            <div className="pt-2 border-t border-[#D8CFF0]/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Vencimiento Actual</span>
                <span className="text-xs font-black text-red-600 font-mono">
                  {currentExpFormatted}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[#8E0E75]">
                <ArrowRight className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase">+1 año</span>
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nuevo Vencimiento</span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  {newExpFormatted}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 sm:p-5 border-t border-[#D8CFF0] bg-[#F8F6FC] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs font-bold text-[#4A4A4A] hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Renovando...' : 'Sí, Renovar Servicio (+1 año)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

