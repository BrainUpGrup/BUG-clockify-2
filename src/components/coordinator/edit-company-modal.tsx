'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  X,
  Check,
  Clock,
  Tag,
  CheckCircle2,
  Archive,
  Upload,
  Trash2,
  Image as ImageIcon,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Company, ClientType, CompanyQuotaActivity } from '@/types/database';
import { compressCompanyLogoToWebP, formatBytes } from '@/lib/image-compression';

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
      logo_url?: string | null;
      quota_activities?: CompanyQuotaActivity[];
    }
  ) => Promise<void>;
}

interface ActivityDraft {
  id: string;
  title: string;
  hoursInput: string;
}

function parseHoursInput(raw: string): number | null {
  const clean = raw.trim().replace(',', '.');
  if (!clean) return null;
  const num = Number(clean);
  if (!Number.isFinite(num) || num <= 0 || num > 999) return null;
  return Math.round(num * 100) / 100;
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoStats, setLogoStats] = useState<{
    originalBytes: number;
    compressedBytes: number;
    savings: number;
    width: number;
    height: number;
  } | null>(null);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityDraft[]>([]);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityHours, setNewActivityHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLogoUrl(company.logo_url || null);
      setLogoStats(null);
      setLogoError(null);
      setActivities(
        Array.isArray(company.quota_activities)
          ? company.quota_activities.map((a, idx) => ({
              id: a.id || `act_${idx}_${Date.now()}`,
              title: a.title || '',
              hoursInput: typeof a.hours === 'number' && a.hours > 0 ? String(a.hours) : '',
            }))
          : []
      );
      setNewActivityTitle('');
      setNewActivityHours('');
    }
  }, [company]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Selecciona una imagen válida (PNG, JPG, WebP o SVG).');
      return;
    }

    setLogoError(null);
    setIsCompressingLogo(true);
    try {
      const result = await compressCompanyLogoToWebP(file, 256, 0.86);
      setLogoUrl(result.dataUrl);
      setLogoStats({
        originalBytes: result.originalBytes,
        compressedBytes: result.compressedBytes,
        savings: result.compressionRatioPercent,
        width: result.width,
        height: result.height,
      });
    } catch (err) {
      console.error('Error al comprimir logotipo a WebP:', err);
      setLogoError('No se pudo procesar la imagen. Prueba con otro PNG o JPG.');
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleAddActivity = () => {
    const cleanTitle = newActivityTitle.trim();
    if (!cleanTitle) return;
    setActivities((prev) => [
      ...prev,
      {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        hoursInput: newActivityHours.trim(),
      },
    ]);
    setNewActivityTitle('');
    setNewActivityHours('');
  };

  const handleUpdateActivityTitle = (id: string, nextTitle: string) => {
    setActivities((prev) => prev.map((item) => (item.id === id ? { ...item, title: nextTitle } : item)));
  };

  const handleUpdateActivityHours = (id: string, rawHours: string) => {
    setActivities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, hoursInput: rawHours } : item))
    );
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((item) => item.id !== id));
  };

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

  const parsedQuotaNum = clientType === 'cuota' ? parseFloat(monthlyQuota.replace(',', '.')) || 0 : 0;
  const totalAssignedHours =
    Math.round(
      activities.reduce((sum, item) => sum + (parseHoursInput(item.hoursInput) || 0), 0) * 100
    ) / 100;
  const remainingHours = Math.round((parsedQuotaNum - totalAssignedHours) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Si el usuario escribió una actividad en el campo y pulsó Guardar sin pulsar "+", incluirla
    const finalActivities: ActivityDraft[] = [...activities];
    if (newActivityTitle.trim()) {
      finalActivities.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: newActivityTitle.trim(),
        hoursInput: newActivityHours.trim(),
      });
    }

    const cleanedActivities: CompanyQuotaActivity[] = finalActivities
      .map((item) => ({
        id: item.id,
        title: item.title.trim(),
        hours: parseHoursInput(item.hoursInput),
      }))
      .filter((item) => item.title.length > 0);

    setIsSaving(true);
    try {
      const quota = clientType === 'cuota' ? parseFloat(monthlyQuota.replace(',', '.')) || 15 : null;
      await onSave(company.id, {
        name: name.trim(),
        client_type: clientType,
        monthly_hours_quota: quota,
        cif: cif.trim() || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        is_active: isActive,
        logo_url: logoUrl,
        quota_activities: cleanedActivities,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-company-title"
      >
        {/* Cabecera DM-13 con Identidad "La Abuela" */}
        <div className="px-5 py-3.5 border-b border-[#D8CFF0] bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-purple-200" />
            </div>
            <div>
              <h3 id="edit-company-title" className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                Editar Empresa / Cliente
              </h3>
              <p className="text-[11px] text-white/80 font-light">
                Configura datos comerciales, cuota mensual y en qué actividades se dedican esas horas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario Compacto en 2 Columnas Paralelas Zero-Scroll (DM-15) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* COLUMNA IZQUIERDA (7 cols): Datos comerciales, cuota, contacto y estado */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-3 content-start">
              {/* Nombre de la Empresa */}
              <div className="md:col-span-7">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Nombre de la Empresa / Cliente <span className="text-[#8E0E75]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. BrandStudio SL, InnovaTech..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D8CFF0] bg-white text-sm font-bold text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* Logotipo Corporativo */}
              <div className="md:col-span-5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Logotipo (WebP)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2 p-1 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] min-h-[38px]">
                  <div className="h-8 w-8 rounded-lg border border-dashed border-[#D8CFF0] bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt={name || 'Logo empresa'}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {logoStats ? (
                      <p className="text-[10px] font-extrabold text-emerald-700 truncate tabular-nums">
                        WebP · {formatBytes(logoStats.compressedBytes)}
                      </p>
                    ) : (
                      <p className="text-[10px] font-semibold text-[#4A4A4A] truncate">
                        {logoUrl ? 'Logo activo' : 'Sin logo'}
                      </p>
                    )}
                    {logoError && (
                      <p className="text-[10px] font-bold text-red-600 truncate">{logoError}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isCompressingLogo || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[10px] font-extrabold uppercase tracking-tight transition-colors cursor-pointer disabled:opacity-50"
                      title="Subir PNG o imagen (se convierte y comprime a WebP)"
                    >
                      <Upload className="h-3 w-3" />
                      <span>{isCompressingLogo ? '...' : logoUrl ? 'Cambiar' : 'Subir'}</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          setLogoUrl(null);
                          setLogoStats(null);
                          setLogoError(null);
                        }}
                        className="p-1 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Quitar logotipo"
                        aria-label="Quitar logotipo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tipo de Relación Comercial */}
              <div className="md:col-span-7">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Tipo de Relación Comercial
                </label>
                <div className="flex items-center rounded-xl bg-[#F8F6FC] p-1 border border-[#D8CFF0]">
                  <button
                    type="button"
                    onClick={() => setClientType('cuota')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
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
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
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
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Cuota Mensual (Horas)
                </label>
                {clientType === 'cuota' ? (
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monthlyQuota}
                      onChange={(e) => setMonthlyQuota(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-1.5 pr-16 rounded-xl border border-[#D8CFF0] bg-white text-sm font-extrabold font-mono tabular-nums text-[#8E0E75] focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4A4A4A]">
                      h / mes
                    </span>
                  </div>
                ) : (
                  <div className="h-[36px] flex items-center px-3 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-xs text-[#4A4A4A] italic">
                    Sin cuota fija pactada
                  </div>
                )}
              </div>

              {/* CIF / Contacto / Email */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  NIF / CIF
                </label>
                <input
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  placeholder="ej. B-87654321"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8CFF0] bg-white text-xs font-mono text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="ej. Laura Gómez"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  Email de Contacto
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>

              {/* Estado Operativo */}
              <div className="md:col-span-12">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1">
                  Estado Operativo de la Empresa
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0]">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Activa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      !isActive
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white border border-[#D8CFF0] text-[#4A4A4A] hover:text-red-700'
                    }`}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Archivada</span>
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (5 cols): Lista de actividades a las que se dedican las horas */}
            <div className="lg:col-span-5 rounded-2xl border border-[#D8CFF0] bg-[#F8F6FC] p-3.5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-6 w-6 rounded-lg bg-[#8E0E75] text-white flex items-center justify-center shrink-0">
                      <ListChecks className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-[#292929] leading-none">
                        Dedicación de Horas
                      </h4>
                      <p className="text-[10px] text-[#4A4A4A] truncate mt-0.5">
                        Se muestra al pasar el ratón por la cuota
                      </p>
                    </div>
                  </div>

                  {clientType === 'cuota' && parsedQuotaNum > 0 && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-lg border text-[10px] font-black font-mono tabular-nums ${
                        totalAssignedHours === 0
                          ? 'bg-white border-[#D8CFF0] text-[#4A4A4A]'
                          : remainingHours === 0
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : remainingHours > 0
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-[#8E0E75]/10 border-[#8E0E75]/30 text-[#8E0E75]'
                      }`}
                    >
                      {totalAssignedHours}h / {parsedQuotaNum}h
                    </span>
                  )}
                </div>

                {/* Alta rápida de actividad */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddActivity();
                      }
                    }}
                    placeholder="ej. Gestión redes, SEO, Web..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] outline-none"
                  />
                  <div className="relative w-16 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newActivityHours}
                      onChange={(e) => setNewActivityHours(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActivity();
                        }
                      }}
                      placeholder="h"
                      title="Horas aproximadas dedicadas (opcional)"
                      className="w-full pl-2 pr-5 py-1.5 rounded-xl border border-[#D8CFF0] bg-white text-xs font-mono tabular-nums font-bold text-[#8E0E75] placeholder:text-slate-400 focus:border-[#8E0E75] outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      h
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddActivity}
                    disabled={!newActivityTitle.trim()}
                    className="h-8 px-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Añadir actividad a la lista"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Añadir</span>
                  </button>
                </div>

                {/* Lista compacta con scroll interno controlado */}
                <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-0.5">
                  {activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8CFF0] bg-white/80 p-4 text-center">
                      <p className="text-[11px] font-bold text-[#292929]">
                        Añade en qué se invierten estas horas
                      </p>
                      <p className="text-[10px] text-[#4A4A4A] mt-0.5">
                        Ejemplos: Publicaciones RRSS (3h), Mantenimiento web (2h), Reuniones (2h). Las horas por línea son opcionales.
                      </p>
                    </div>
                  ) : (
                    activities.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-[#D8CFF0] shadow-2xs"
                      >
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateActivityTitle(item.id, e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs font-semibold text-[#292929] bg-transparent hover:bg-[#F8F6FC] focus:bg-[#F8F6FC] focus:outline-none"
                          aria-label="Nombre de la actividad"
                        />
                        <div className="relative w-14 shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.hoursInput}
                            onChange={(e) => handleUpdateActivityHours(item.id, e.target.value)}
                            placeholder="-"
                            className="w-full pl-1.5 pr-4 py-1 rounded-lg border border-[#EAE4F5] bg-[#F8F6FC] text-[11px] font-mono tabular-nums font-extrabold text-[#8E0E75] text-right focus:border-[#8E0E75] outline-none"
                            aria-label="Horas de la actividad"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">
                            h
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(item.id)}
                          className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Eliminar actividad"
                          aria-label={`Eliminar actividad ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-1.5 border-t border-[#E5DDF5] flex items-center justify-between text-[10px] text-[#4A4A4A]">
                <span>
                  {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'} en lista
                </span>
                {clientType === 'cuota' && parsedQuotaNum > 0 && totalAssignedHours > 0 && (
                  <span className="font-bold tabular-nums">
                    {remainingHours === 0
                      ? 'Cuota repartida al 100%'
                      : remainingHours > 0
                        ? `Sin asignar: ${remainingHours}h`
                        : `Excede cuota en ${Math.abs(remainingHours)}h`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8CFF0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#4A4A4A] text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-[#8E0E75] text-white text-xs font-black uppercase tracking-wider hover:bg-[#700B5C] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#8E0E75]/25 cursor-pointer"
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
