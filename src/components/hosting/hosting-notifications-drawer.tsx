'use client';

import React, { useState } from 'react';
import { HostingAlert, HostingService } from '@/types/hosting';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Send,
  Check
} from 'lucide-react';
import { notify } from '@/lib/feedback';
import { HostingRenewalConfirmModal } from '@/components/hosting/hosting-renewal-confirm-modal';

interface HostingNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: HostingAlert[];
  onOpenEmailModal: (service: HostingService, days: number) => void;
  onRenewService: (serviceId: string) => Promise<void>;
  onToggleNotificationStage: (serviceId: string, stage: '7' | '15' | '30' | '60' | '90') => Promise<void>;
}

export function HostingNotificationsDrawer({
  isOpen,
  onClose,
  alerts,
  onOpenEmailModal,
  onRenewService,
  onToggleNotificationStage,
}: HostingNotificationsDrawerProps) {
  const [selectedStage, setSelectedStage] = useState<'all' | '7' | '15' | '30' | '60' | '90'>('all');
  const [serviceToRenew, setServiceToRenew] = useState<HostingService | null>(null);

  if (!isOpen) return null;

  // Filtrar alertas según la etapa seleccionada
  const filteredAlerts = alerts.filter((a) => {
    if (selectedStage === 'all') return true;
    if (selectedStage === '7') return a.daysRemaining <= 7;
    if (selectedStage === '15') return a.daysRemaining > 7 && a.daysRemaining <= 15;
    if (selectedStage === '30') return a.daysRemaining > 15 && a.daysRemaining <= 30;
    if (selectedStage === '60') return a.daysRemaining > 30 && a.daysRemaining <= 60;
    if (selectedStage === '90') return a.daysRemaining > 60 && a.daysRemaining <= 90;
    return true;
  });

  const count7 = alerts.filter((a) => a.daysRemaining <= 7).length;
  const count15 = alerts.filter((a) => a.daysRemaining > 7 && a.daysRemaining <= 15).length;
  const count30 = alerts.filter((a) => a.daysRemaining > 15 && a.daysRemaining <= 30).length;
  const count60 = alerts.filter((a) => a.daysRemaining > 30 && a.daysRemaining <= 60).length;
  const count90 = alerts.filter((a) => a.daysRemaining > 60 && a.daysRemaining <= 90).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[#D8CFF0] animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera del Panel de Notificaciones */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-linear-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Centro de Notificaciones & Renovaciones
              </h2>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Alertas escalonadas de vencimiento (7, 15, 30, 60 y 90 días)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de Etapa de Notificación (7, 15, 30, 60, 90 días) */}
        <div className="p-3 sm:p-4 bg-[#F8F6FC] border-b border-[#D8CFF0] overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setSelectedStage('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === 'all'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
            >
              Todas ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStage('7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === '7'
                  ? 'bg-red-600 text-white shadow-xs'
                  : count7 > 0
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A]'
              }`}
            >
              7 Días ({count7})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStage('15')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === '15'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : count15 > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A]'
              }`}
            >
              15 Días ({count15})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStage('30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === '30'
                  ? 'bg-[#191654] text-white shadow-xs'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-[#191654]'
              }`}
            >
              30 Días ({count30})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStage('60')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === '60'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
            >
              60 Días ({count60})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStage('90')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer ${
                selectedStage === '90'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-purple-700'
              }`}
            >
              90 Días ({count90})
            </button>
          </div>
        </div>

        {/* Lista de Alertas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#F8F6FC] border-2 border-dashed border-[#D8CFF0] space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-extrabold uppercase tracking-tight text-[#292929]">
                Sin avisos pendientes en esta etapa
              </h3>
              <p className="text-xs text-[#4A4A4A]">
                Todos los servicios dentro de este umbral están renovados o al día.
              </p>
            </div>
          ) : (
            filteredAlerts.map(({ service, daysRemaining, stageKey, isNotified }) => {
              const isExpired = daysRemaining < 0;
              const isCritical = daysRemaining >= 0 && daysRemaining <= 7;
              const isWarning = daysRemaining > 7 && daysRemaining <= 15;

              return (
                <div
                  key={service.id}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isExpired
                      ? 'bg-red-50/70 border-red-300'
                      : isCritical
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-[#292929]">
                          {service.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white border border-[#D8CFF0] text-[#8E0E75]">
                          {service.service_type}
                        </span>
                        <span className="text-xs font-bold text-[#4A4A4A]">
                          · {service.client_name || 'Cliente sin asignar'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#4A4A4A]">
                        <span>Vence: <strong className="text-[#292929]">{service.expiration_date.split('-').reverse().join('/')}</strong></span>
                        <span>·</span>
                        <span>Ciclo: <strong>{service.renewal_cycle}</strong></span>
                        <span>·</span>
                        <span>Proveedor: <strong>{service.provider}</strong></span>
                      </div>
                    </div>

                    {/* Badge de Días Restantes */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-tight ${
                          isExpired
                            ? 'bg-red-600 text-white'
                            : isCritical
                            ? 'bg-amber-600 text-white'
                            : isWarning
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]'
                        }`}
                      >
                        {isExpired
                          ? `${Math.abs(daysRemaining)} d. caducado`
                          : `${daysRemaining} días restantes`}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de Notificación y Renovación */}
                  <div className="mt-3.5 pt-3 border-t border-[#D8CFF0]/60 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Estado del aviso al cliente */}
                    <div className="flex items-center gap-2">
                      {stageKey && (
                        <button
                          type="button"
                          onClick={() => onToggleNotificationStage(service.id, stageKey)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            isNotified
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:bg-slate-50'
                          }`}
                          title="Alternar estado de notificación enviada"
                        >
                          {isNotified ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Cliente avisado ({stageKey}d)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>Marcar avisado</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Botones de Acción: Plantilla Correo y Renovar */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenEmailModal(service, daysRemaining)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#8E0E75] text-xs font-extrabold transition-all cursor-pointer shadow-2xs hover:border-[#8E0E75]"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Plantilla Email Cliente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setServiceToRenew(service)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Renovar (+1 año)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Panel */}
        <div className="p-4 border-t border-[#D8CFF0] bg-[#F8F6FC] flex items-center justify-between text-xs text-[#4A4A4A]">
          <span>
            Total alertas activas: <strong>{alerts.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#D8CFF0] text-xs font-bold text-[#4A4A4A] hover:text-[#8E0E75] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Ventana Modal de Confirmación de Renovación */}
      <HostingRenewalConfirmModal
        isOpen={Boolean(serviceToRenew)}
        onClose={() => setServiceToRenew(null)}
        service={serviceToRenew}
        onConfirm={async (id) => {
          await onRenewService(id);
          notify('Servicio renovado con éxito por 1 año.', { type: 'success' });
        }}
      />
    </div>
  );
}

