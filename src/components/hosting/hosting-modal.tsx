'use client';

import React, { useState, useEffect } from 'react';
import { HostingService, ServiceType, RenewalCycle, HostingStatus } from '@/types/hosting';
import { X, Server, Globe, Calendar, DollarSign, User, ShieldCheck } from 'lucide-react';
import { AppSelect } from '@/components/ui/app-select';

interface HostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: HostingService) => Promise<void>;
  serviceToEdit: HostingService | null;
  parentHostings?: HostingService[];
  defaultParentId?: string | null;
}

const SERVICE_TYPE_OPTIONS = [
  { value: 'Hosting', label: 'Hosting' },
  { value: 'Dominio', label: 'Dominio' },
  { value: 'Correo', label: 'Correo' },
  { value: 'Subhosting', label: 'Subhosting (Multihosting)' },
];

const RENEWAL_CYCLE_OPTIONS = [
  { value: 'Anual', label: 'Anual (1 año)' },
  { value: 'Semestral', label: 'Semestral (6 meses)' },
  { value: 'Trimestral', label: 'Trimestral (3 meses)' },
  { value: 'Mensual', label: 'Mensual (1 mes)' },
  { value: 'Bienal', label: 'Bienal (2 años)' },
  { value: 'Trienal', label: 'Trienal (3 años)' },
];

const PROVIDER_OPTIONS = [
  { value: 'Cdmon', label: 'Cdmon' },
  { value: 'OVH', label: 'OVHcloud' },
  { value: 'SiteGround', label: 'SiteGround' },
  { value: 'Hetzner', label: 'Hetzner' },
  { value: 'Cloudflare', label: 'Cloudflare' },
  { value: 'Ionos', label: 'Ionos / 1&1' },
  { value: 'Otro', label: 'Otro Proveedor' },
];

export function HostingModal({
  isOpen,
  onClose,
  onSave,
  serviceToEdit,
  parentHostings = [],
  defaultParentId = null,
}: HostingModalProps) {
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<string>('Hosting');
  const [parentId, setParentId] = useState<string | null>(null);
  const [renewalCycle, setRenewalCycle] = useState<string>('Anual');
  const [provider, setProvider] = useState<string>('Cdmon');
  const [expirationDate, setExpirationDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Manual / No configurado');
  const [priceCost, setPriceCost] = useState<number | ''>('');
  const [priceClient, setPriceClient] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name || '');
      setServiceType(serviceToEdit.service_type || 'Hosting');
      setParentId(serviceToEdit.parent_id || null);
      setRenewalCycle(serviceToEdit.renewal_cycle || 'Anual');
      setProvider(serviceToEdit.provider || 'Cdmon');
      setExpirationDate(serviceToEdit.expiration_date || '');
      setClientName(serviceToEdit.client_name || '');
      setAutoRenew(Boolean(serviceToEdit.auto_renew));
      setPaymentMethod(serviceToEdit.payment_method || 'Manual / No configurado');
      setPriceCost(serviceToEdit.price_cost ?? '');
      setPriceClient(serviceToEdit.price_client ?? '');
      setNotes(serviceToEdit.notes || '');
    } else {
      setName('');
      setServiceType(defaultParentId ? 'Subhosting' : 'Hosting');
      setParentId(defaultParentId || null);
      setRenewalCycle('Anual');
      setProvider('Cdmon');
      // Fecha por defecto: hoy + 1 año
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() + 1);
      setExpirationDate(defaultDate.toISOString().split('T')[0]);
      setClientName('');
      setAutoRenew(false);
      setPaymentMethod('Manual / No configurado');
      setPriceCost('');
      setPriceClient('');
      setNotes('');
    }
  }, [serviceToEdit, isOpen, defaultParentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const serviceData: HostingService = {
        id: serviceToEdit ? serviceToEdit.id : `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim().toLowerCase(),
        service_type: serviceType,
        parent_id: serviceType === 'Subhosting' ? (parentId || null) : null,
        renewal_cycle: renewalCycle,
        expiration_date: expirationDate || new Date().toISOString().split('T')[0],
        auto_renew: autoRenew,
        payment_method: paymentMethod.trim() || 'Manual / No configurado',
        provider: provider.trim() || 'Cdmon',
        client_name: clientName.trim() || name.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        price_cost: typeof priceCost === 'number' ? priceCost : 0,
        price_client: typeof priceClient === 'number' ? priceClient : 0,
        status: 'active',
        notes: notes.trim(),
        notification_stages: serviceToEdit?.notification_stages || {
          '7': false,
          '15': false,
          '30': false,
          '60': false,
          '90': false,
        },
        created_at: serviceToEdit?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSave(serviceData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera DM-13 */}
        <div className="px-5 py-4 border-b border-[#D8CFF0] bg-linear-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Server className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                {serviceToEdit ? 'Editar Servicio de Hosting' : 'Nuevo Servicio de Hosting o Dominio'}
              </h3>
              <p className="text-[11px] text-white/80 font-light">
                {serviceToEdit ? serviceToEdit.name : 'Añadir al catálogo de renovaciones'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario en rejilla compacta de 2 columnas paralelas (DM-15 Zero-Scroll) */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Columna Izquierda: Datos del Servicio */}
            <div className="md:col-span-6 space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Nombre del Dominio / Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. miempresa.com"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-bold text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Tipo de Servicio
                </label>
                <AppSelect
                  value={serviceType}
                  onChange={setServiceType}
                  options={SERVICE_TYPE_OPTIONS}
                />
              </div>

              {/* Selector de Hosting Padre para Multihosting */}
              {serviceType === 'Subhosting' && (
                <div className="p-2.5 rounded-xl bg-purple-50/80 border border-[#D8CFF0] space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                    Hosting Principal (Servidor Padre) *
                  </label>
                  <AppSelect
                    value={parentId || ''}
                    onChange={(val) => setParentId(val || null)}
                    options={[
                      { value: '', label: 'Seleccionar Hosting Principal...' },
                      ...(parentHostings || []).map((h) => ({
                        value: h.id,
                        label: `${h.name} (${h.client_name || 'Sin cliente'})`,
                      })),
                    ]}
                  />
                  <p className="text-[10px] text-[#4A4A4A] leading-tight pt-0.5">
                    Este subhosting se mostrará anidado dentro del desplegable del servidor principal.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Proveedor / Registrador
                </label>
                <AppSelect
                  value={provider}
                  onChange={setProvider}
                  options={PROVIDER_OPTIONS}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Cliente Asignado
                </label>
                <input
                  type="text"
                  placeholder="Nombre de la empresa o cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
                />
              </div>
            </div>

            {/* Columna Derecha: Renovación y Costes */}
            <div className="md:col-span-6 space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Fecha de Vencimiento / Expiración *
                </label>
                <input
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-bold text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                  Ciclo de Renovación
                </label>
                <AppSelect
                  value={renewalCycle}
                  onChange={setRenewalCycle}
                  options={RENEWAL_CYCLE_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                    Coste (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={priceCost}
                    onChange={(e) => setPriceCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs text-[#292929] focus:outline-hidden focus:border-[#8E0E75] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
                    PVP Cliente (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={priceClient}
                    onChange={(e) => setPriceClient(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-bold text-[#8E0E75] focus:outline-hidden focus:border-[#8E0E75] tabular-nums"
                  />
                </div>
              </div>

              {/* Toggle Renovación Automática */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] cursor-pointer hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 rounded-sm text-[#8E0E75] border-[#D8CFF0] focus:ring-[#8E0E75]"
                  />
                  <span className="text-xs font-bold text-[#292929]">
                    Renovación automática activada en proveedor
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Notas internas compactas */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#292929] mb-1">
              Notas / Instrucciones de Renovación
            </label>
            <input
              type="text"
              placeholder="Ej. Avisar 30 días antes por WhatsApp, cliente paga por transferencia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-[#D8CFF0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs font-bold text-[#4A4A4A] hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : serviceToEdit ? 'Actualizar Servicio' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

