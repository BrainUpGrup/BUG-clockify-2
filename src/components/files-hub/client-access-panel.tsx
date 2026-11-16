'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  FilePlus2,
  Download,
  Eye,
  ShieldCheck,
  Building2,
  Power,
} from 'lucide-react';
import { Company } from '@/types/database';
import { ClientBriefingFile, ClientPortalAccessConfig } from '@/types/files-portal';
import { AppSelect } from '@/components/ui/app-select';
import { notify } from '@/lib/feedback';
import { formatBytesCompact } from './file-preview-modal';

interface ClientAccessPanelProps {
  companies: Company[];
  portalAccesses: Omit<ClientPortalAccessConfig, 'pin_hash'>[];
  briefings: ClientBriefingFile[];
  onRefresh: () => Promise<void>;
  onPreviewBriefing: (b: ClientBriefingFile) => void;
}

export function ClientAccessPanel({
  companies,
  portalAccesses,
  briefings,
  onRefresh,
  onPreviewBriefing,
}: ClientAccessPanelProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    portalAccesses[0]?.company_id || companies[0]?.id || 'demo-company-brainup-001'
  );
  const [pinInput, setPinInput] = useState<string>('1234');
  const [isSavingAccess, setIsSavingAccess] = useState<boolean>(false);

  // Combinar empresas reales de la agencia + empresa demo si existe en portalAccesses
  const mergedCompanyOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => map.set(c.id, c.name));
    portalAccesses.forEach((p) => {
      if (!map.has(p.company_id)) {
        map.set(p.company_id, p.company_name || 'Cliente Demo Brain Up');
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [companies, portalAccesses]);

  const handleSaveAccess = async (regenerateToken = false, toggleEnabled?: boolean) => {
    if (!selectedCompanyId) {
      notify('Selecciona una empresa primero.', { type: 'error' });
      return;
    }

    const chosenName =
      mergedCompanyOptions.find((o) => o.value === selectedCompanyId)?.label || 'Empresa Cliente';
    const existing = portalAccesses.find((a) => a.company_id === selectedCompanyId);
    const effectivePin = pinInput.trim() || existing?.pin_hint || '1234';

    if (!/^\d{4,6}$/.test(effectivePin)) {
      notify('El PIN debe tener entre 4 y 6 dígitos numéricos.', { type: 'error' });
      return;
    }

    setIsSavingAccess(true);
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_access',
          companyId: selectedCompanyId,
          companyName: chosenName,
          pin: effectivePin,
          isEnabled: typeof toggleEnabled === 'boolean' ? toggleEnabled : (existing?.is_enabled ?? true),
          regenerateToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error guardando acceso de cliente.', { type: 'error' });
        return;
      }
      notify('Acceso Portal Cliente (Enlace + PIN) actualizado.', { type: 'success' });
      await onRefresh();
    } catch {
      notify('Error de conexión guardando acceso.', { type: 'error' });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleToggleAccessEnabled = async (
    access: Omit<ClientPortalAccessConfig, 'pin_hash'>
  ) => {
    const nextEnabled = !access.is_enabled;
    setIsSavingAccess(true);
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_access',
          companyId: access.company_id,
          companyName: access.company_name || 'Empresa Cliente',
          pin: access.pin_hint || '1234',
          isEnabled: nextEnabled,
          regenerateToken: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error cambiando el estado del portal cliente.', { type: 'error' });
        return;
      }
      notify(
        nextEnabled
          ? 'Portal del cliente reactivado correctamente.'
          : 'Portal del cliente pausado. El enlace ha quedado bloqueado temporalmente.',
        { type: 'success' }
      );
      await onRefresh();
    } catch {
      notify('Error de conexión actualizando el acceso.', { type: 'error' });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleRotateTokenForAccess = async (
    access: Omit<ClientPortalAccessConfig, 'pin_hash'>
  ) => {
    setIsSavingAccess(true);
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_access',
          companyId: access.company_id,
          companyName: access.company_name || 'Empresa Cliente',
          pin: access.pin_hint || '1234',
          isEnabled: access.is_enabled,
          regenerateToken: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error regenerando token del portal.', { type: 'error' });
        return;
      }
      notify('Token secreto regenerado. El enlace anterior ha quedado revocado.', { type: 'success' });
      await onRefresh();
    } catch {
      notify('Error de conexión regenerando token.', { type: 'error' });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleMarkBriefingStatus = async (briefingId: string, status: 'reviewed' | 'archived') => {
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_briefing', briefingId, status }),
      });
      if (res.ok) {
        notify(status === 'reviewed' ? 'Briefing marcado como revisado.' : 'Briefing archivado.', {
          type: 'success',
        });
        await onRefresh();
      }
    } catch {
      notify('Error actualizando estado del briefing.', { type: 'error' });
    }
  };

  const copyPortalUrl = (token: string, pinHint?: string) => {
    const fullUrl = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(
      pinHint ? `${fullUrl}\nCódigo PIN: ${pinHint}` : fullUrl
    );
    notify('Enlace y PIN copiados al portapapeles.', { type: 'success' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* COLUMNA IZQUIERDA (5 cols): Gestor de Enlace Único + PIN por Empresa */}
      <div className="lg:col-span-5 rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE4F5]">
          <div className="p-2 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
              Accesos Portal Cliente (Enlace + PIN)
            </h3>
            <p className="text-xs text-[#4A4A4A]">
              Genera el acceso aislado y protegido por PIN para cada empresa.
            </p>
          </div>
        </div>

        {/* Formulario compacto para crear/actualizar PIN */}
        <div className="p-3.5 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#191654] mb-1">
              Empresa / Cliente
            </label>
            <AppSelect
              value={selectedCompanyId}
              onChange={(val) => {
                setSelectedCompanyId(val);
                const found = portalAccesses.find((a) => a.company_id === val);
                if (found?.pin_hint) setPinInput(found.pin_hint);
              }}
              options={mergedCompanyOptions}
              placeholder="Elige empresa"
              icon={<Building2 className="h-4 w-4 text-[#8E0E75]" />}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <label className="block text-[11px] font-bold uppercase text-[#191654] mb-1">
                PIN (4-6 díg.)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full px-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-white font-mono font-black text-center text-sm text-[#191654] outline-none"
              />
            </div>
            <div className="col-span-7">
              <button
                type="button"
                disabled={isSavingAccess}
                onClick={() => handleSaveAccess(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingAccess ? 'Guardando...' : 'Generar / Actualizar PIN'}
              </button>
            </div>
          </div>
        </div>

        {/* Listado de Portales Activos */}
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {portalAccesses.map((access) => (
            <div
              key={access.id}
              className="p-3 rounded-xl border border-[#D8CFF0] bg-white hover:border-[#8E0E75] transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#191654] truncate">
                    {access.company_name || access.company_id}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    PIN activo: <strong className="text-[#8E0E75]">{access.pin_hint || '****'}</strong>
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    access.is_enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {access.is_enabled ? 'Activo' : 'Pausado'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/portal/${access.portal_token}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#191654] hover:bg-[#2a2575] text-white text-[11px] font-bold transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Abrir Portal Cliente</span>
                </Link>

                <button
                  type="button"
                  onClick={() => copyPortalUrl(access.portal_token, access.pin_hint)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8F6FC] hover:bg-[#EAE4F5] text-[#8E0E75] border border-[#D8CFF0] text-[11px] font-bold cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copiar Link + PIN</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingAccess}
                  onClick={() => handleToggleAccessEnabled(access)}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                    access.is_enabled
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                  title={
                    access.is_enabled
                      ? 'Pausar portal cliente de inmediato (bloquea descargas y subida de briefings)'
                      : 'Reactivar acceso del cliente con su PIN actual'
                  }
                >
                  <Power className="h-3 w-3" />
                  <span>{access.is_enabled ? 'Pausar' : 'Reactivar'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingAccess}
                  onClick={() => handleRotateTokenForAccess(access)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  title="Regenerar token secreto (revoca enlace anterior)"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Rotar Token</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA DERECHA (7 cols): Briefings y Material Subido por Clientes */}
      <div className="lg:col-span-7 rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#3BB54A]">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
                Briefings y Archivos Subidos por Clientes ({briefings.length})
              </h3>
              <p className="text-xs text-[#4A4A4A]">
                Bandeja separada: material enviado desde el Portal Cliente para acompañar briefs.
              </p>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F6FC] border border-[#D8CFF0] text-[11px] font-bold text-[#191654]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#3BB54A]" />
            <span>Zona Externa Entrante</span>
          </div>
        </div>

        {briefings.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#FAF8FD] border-2 border-dashed border-[#D8CFF0]">
            <p className="text-xs font-bold text-[#4A4A4A]">
              Todavía no hay archivos de briefing subidos por clientes.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {briefings.map((b) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-xl border-2 transition-all space-y-2 ${
                  b.status === 'new'
                    ? 'border-[#8E0E75]/40 bg-[#FAF8FD]'
                    : 'border-[#EAE4F5] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#191654] text-white text-[10px] font-black uppercase">
                        {b.company_name || 'Cliente'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          b.status === 'new'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {b.status === 'new' ? 'Nuevo Briefing' : 'Revisado'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-[#292929] mt-1">{b.title}</h4>
                    {b.description && (
                      <p className="text-xs text-[#4A4A4A] mt-0.5">{b.description}</p>
                    )}
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      {b.file_name} • {formatBytesCompact(b.size_bytes)} • Enviado por: {b.uploaded_by_contact}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewBriefing(b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0] text-xs font-bold cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver</span>
                    </button>
                    <a
                      href={`/api/files-hub/content/client_briefing/${b.id}?download=1`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-bold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Bajar</span>
                    </a>
                    {b.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => handleMarkBriefingStatus(b.id, 'reviewed')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3BB54A] hover:bg-[#329A3F] text-white text-xs font-bold cursor-pointer"
                        title="Marcar briefing como revisado por coordinación"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Revisado</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

