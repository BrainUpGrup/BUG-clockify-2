'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Check, 
  Clock, 
  Tag, 
  Mail, 
  User, 
  FileText, 
  CheckCircle2, 
  Archive 
} from 'lucide-react';
import { Company, ClientType } from '@/types/database';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSave: (
    id: string,
    updates: {
      name: string;
      client_type: ClientType;
      monthly_hours_quota: number | null;
      cif?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      is_active?: boolean;
    }
  ) => Promise<void>;
}

export function EditCompanyModal({
  isOpen,
  onClose,
  company,
  onSave,
}: EditCompanyModalProps) {
  const [name, setName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('cuota');
  const [monthlyQuota, setMonthlyQuota] = useState<string>('15');
  const [cif, setCif] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local al abrir el modal con la empresa seleccionada
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setClientType(company.client_type || 'cuota');
      setMonthlyQuota(
        company.monthly_hours_quota !== null && company.monthly_hours_quota !== undefined
          ? String(company.monthly_hours_quota)
          : '15'
      );
      setCif(company.cif || '');
      setContactName(company.contact_name || '');
      setContactEmail(company.contact_email || '');
      setIsActive(company.is_active ?? true);
    }
  }, [company]);

  // Listener para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const quota = clientType === 'cuota' ? parseFloat(monthlyQuota) || 15 : null;
      await onSave(company.id, {
        name: name.trim(),
        client_type: clientType,
        monthly_hours_quota: quota,
        cif: cif.trim() || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        is_active: isActive,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-company-title"
      >
        {/* Cabecera DM-13 con Identidad "La Abuela" */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-purple-200" />
            </div>
            <div>
              <h3 id="edit-company-title" className="text-base font-black uppercase tracking-tight text-white">
                Editar Empresa / Cliente
              </h3>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Modifica los datos comerciales, cuota mensual o datos de contacto oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario en Rejilla Compacta Zero-Scroll (DM-15) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Nombre de la Empresa */}
            <div className="md:col-span-12">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Nombre de la Empresa / Cliente <span className="text-[#8E0E75]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. BrandStudio SL, InnovaTech..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8CFF0] bg-white text-sm font-bold text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                required
                autoFocus
              />
            </div>

            {/* Tipo de Relación Comercial (Cuota vs Puntual) */}
            <div className="md:col-span-7">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Tipo de Relación Comercial
              </label>
              <div className="flex items-center rounded-xl bg-[#F8F6FC] p-1 border border-[#D8CFF0]">
                <button
                  type="button"
                  onClick={() => setClientType('cuota')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    clientType === 'cuota'
                      ? 'bg-[#8E0E75] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Cliente Cuota</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('puntual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    clientType === 'puntual'
                      ? 'bg-[#191654] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#191654]'
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Cliente Puntual</span>
                </button>
              </div>
            </div>

            {/* Cuota Mensual (Horas) */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Cuota Mensual (Horas)
              </label>
              {clientType === 'cuota' ? (
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={monthlyQuota}
                    onChange={(e) => setMonthlyQuota(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-white text-sm font-extrabold font-mono tabular-nums text-[#8E0E75] focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4A4A4A]">
                    h / mes
                  </span>
                </div>
              ) : (
                <div className="h-[38px] flex items-center px-3 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-xs text-[#4A4A4A] italic">
                  Sin cuota fija pactada
                </div>
              )}
            </div>

            {/* CIF / NIF */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                NIF / CIF
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  placeholder="ej. B-87654321"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs font-mono text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
            </div>

            {/* Persona de Contacto */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                Persona de Contacto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="ej. Laura Gómez"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
            </div>

            {/* Email de Contacto */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                Email de Contacto
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
            </div>

            {/* Estado de la Empresa (Activa / Archivada) */}
            <div className="md:col-span-12 pt-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Estado Operativo de la Empresa
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0]">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Activa (Admite Imputaciones)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    !isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-red-700'
                  }`}
                >
                  <Archive className="h-4 w-4" />
                  <span>Archivada (Desactivada)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8CFF0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#4A4A4A] text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#8E0E75] text-white text-xs font-black uppercase tracking-wider hover:bg-[#700B5C] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#8E0E75]/25 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
