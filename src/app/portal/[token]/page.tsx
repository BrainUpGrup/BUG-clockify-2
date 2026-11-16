'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  Download,
  Eye,
  UploadCloud,
  CheckCircle2,
  MessageSquare,
  LogOut,
  FileText,
  Sparkles,
  Send,
  AlertCircle,
} from 'lucide-react';
import { ClientBriefingFile, ClientDeliverable } from '@/types/files-portal';
import { FilePreviewModal, formatBytesCompact } from '@/components/files-hub/file-preview-modal';
import { notify } from '@/lib/feedback';

export default function ClientPortalPage() {
  const params = useParams();
  const token = String(params?.token || '');

  const [isLoading, setIsLoading] = useState(true);
  const [exists, setExists] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companyName, setCompanyName] = useState('Cliente Brain Up');
  const [isDemoToken, setIsDemoToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PIN de acceso
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Datos estancos del Área Cliente
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([]);
  const [briefings, setBriefings] = useState<ClientBriefingFile[]>([]);

  // Subida de briefing
  const [briefTitle, setBriefTitle] = useState('');
  const [briefDesc, setBriefDesc] = useState('');
  const [briefContact, setBriefContact] = useState('');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [isUploadingBrief, setIsUploadingBrief] = useState(false);

  // Feedback sobre entregable
  const [adjustTarget, setAdjustTarget] = useState<ClientDeliverable | null>(null);
  const [adjustNote, setAdjustNote] = useState('');

  // Visor rápido
  const [previewItem, setPreviewItem] = useState<{
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentUrl: string;
  } | null>(null);

  const loadPortalState = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files-hub/portal/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setExists(data.exists ?? false);
        setIsEnabled(data.isEnabled ?? false);
        setErrorMsg(data.error || 'Enlace no disponible.');
        return;
      }

      setExists(true);
      setIsEnabled(true);
      setCompanyName(data.companyName || 'Cliente Brain Up');
      setIsDemoToken(!!data.isDemoToken);
      setIsAuthenticated(!!data.isAuthenticated);
      if (data.isAuthenticated) {
        setDeliverables(data.deliverables || []);
        setBriefings(data.briefings || []);
      }
    } catch {
      setErrorMsg('No se pudo conectar con el portal.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPortalState();
  }, [loadPortalState]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsVerifyingPin(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/files-hub/portal/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Código PIN incorrecto.');
        return;
      }

      setIsAuthenticated(true);
      setCompanyName(data.companyName || companyName);
      setDeliverables(data.deliverables || []);
      setBriefings(data.briefings || []);
      setPinInput('');
    } catch {
      setErrorMsg('Error de conexión al validar PIN.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleUploadBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefFile) {
      notify('Adjunta un archivo para enviar tu briefing.', { type: 'error' });
      return;
    }

    setIsUploadingBrief(true);
    try {
      const fd = new FormData();
      fd.append('file', briefFile);
      fd.append('title', briefTitle.trim() || briefFile.name);
      fd.append('description', briefDesc.trim());
      fd.append('contactName', briefContact.trim() || 'Cliente');

      const res = await fetch(`/api/files-hub/portal/${encodeURIComponent(token)}/briefing`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error subiendo archivo de briefing.', { type: 'error' });
        return;
      }

      notify('Archivo de briefing enviado correctamente al equipo de Brain Up.', { type: 'success' });
      setBriefTitle('');
      setBriefDesc('');
      setBriefFile(null);
      await loadPortalState();
    } catch {
      notify('Error de red al enviar el briefing.', { type: 'error' });
    } finally {
      setIsUploadingBrief(false);
    }
  };

  const handleDeliverableFeedback = async (
    deliverableId: string,
    status: 'approved' | 'adjustment_requested',
    note?: string
  ) => {
    try {
      const res = await fetch(`/api/files-hub/portal/${encodeURIComponent(token)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId,
          feedbackStatus: status,
          feedbackNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'No se pudo enviar tu respuesta.', { type: 'error' });
        return;
      }

      notify(
        status === 'approved'
          ? 'Has aprobado este entregable.'
          : 'Solicitud de ajuste enviada a coordinación.',
        { type: 'success' }
      );
      setAdjustTarget(null);
      setAdjustNote('');
      await loadPortalState();
    } catch {
      notify('Error de conexión.', { type: 'error' });
    }
  };

  const handlePortalLogout = async () => {
    await fetch(`/api/files-hub/portal/${encodeURIComponent(token)}`, { method: 'DELETE' });
    setIsAuthenticated(false);
    setDeliverables([]);
    setBriefings([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#191654]">
            Conectando con tu Área Cliente...
          </p>
        </div>
      </div>
    );
  }

  if (!exists || !isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6FC] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border-2 border-[#D8CFF0] p-8 text-center space-y-3 shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-[#191654] uppercase">Acceso No Disponible</h1>
          <p className="text-xs text-[#4A4A4A]">{errorMsg || 'Este enlace no es válido o fue revocado.'}</p>
        </div>
      </div>
    );
  }

  // PASO 1: PUERTA PIN SEGURA DEL CLIENTE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F6FC] via-white to-[#EAE4F5] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border-2 border-[#D8CFF0] shadow-2xl p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <img
              src="/logo.png"
              alt="Brain Up Grup"
              className="h-14 mx-auto object-contain"
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75] text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Área Cliente Segura</span>
            </div>
            <h1 className="text-xl font-black text-[#191654] tracking-tight">
              {companyName}
            </h1>
            <p className="text-xs text-[#4A4A4A]">
              Introduce el código PIN privado facilitado por Brain Up Grup para ver tus entregables y subir archivos de briefing.
            </p>
          </div>

          {isDemoToken && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-center gap-2 font-bold">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Simulador Dirección • Código PIN de prueba: <strong className="font-mono text-sm">1234</strong></span>
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#191654] mb-1.5 text-center">
                Código PIN (4-6 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full py-3 px-4 rounded-2xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-[#FAF8FD] text-center font-mono text-2xl font-black tracking-[0.5em] text-[#191654] outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingPin || pinInput.length < 4}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#191654] to-[#8E0E75] hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{isVerifyingPin ? 'Verificando...' : 'Entrar en mi Área Cliente'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PASO 2: ÁREA CLIENTE AUTENTICADA (ENTREGABLES SEPARADOS DE BRIEFINGS)
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      {/* Cabecera Exclusiva de Cliente (sin navegación interna) */}
      <header className="bg-white border-b-2 border-[#D8CFF0] px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/isotipo.png" alt="Brain Up" className="h-9 w-9 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-[#191654] truncate">
                  {companyName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase">
                  <ShieldCheck className="h-3 w-3 text-[#3BB54A]" />
                  <span>Espacio Privado Cliente</span>
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A] truncate">
                Portal de Entregables Validados y Subida de Material para Briefings • Brain Up Grup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePortalLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8F6FC] hover:bg-[#EAE4F5] text-[#8E0E75] border border-[#D8CFF0] text-xs font-bold cursor-pointer shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Bloquear Sesión</span>
          </button>
        </div>
      </header>

      {/* CUERPO LÍQUIDO EN 2 COLUMNAS ESTRICTAMENTE SEPARADAS */}
      <main className="flex-1 w-full px-4 sm:px-8 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SUB-ÁREA 1 (7 cols): ELEMENTOS CREADOS PARA TI (SOLO ENTREGABLES VALIDADOS) */}
        <section className="lg:col-span-7 rounded-2xl bg-white border-2 border-[#D8CFF0] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4F5]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3BB54A]">
                De Brain Up Grup para ti
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#191654] uppercase tracking-tight">
                Elementos Creados y Validados ({deliverables.length})
              </h2>
            </div>
          </div>

          {deliverables.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#FAF8FD] border-2 border-dashed border-[#D8CFF0]">
              <FileText className="h-8 w-8 text-[#8E0E75] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#4A4A4A]">
                Todavía no hay entregables publicados en tu portal. En cuanto el equipo finalice y valide tus piezas aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deliverables.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border-2 border-[#EAE4F5] hover:border-[#8E0E75] bg-[#FAF8FD] p-4 flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#191654] text-white font-mono text-[10px] font-black">
                        v{item.version_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.client_feedback_status === 'approved'
                            ? 'bg-[#3BB54A] text-white'
                            : item.client_feedback_status === 'adjustment_requested'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-white border border-[#D8CFF0] text-[#8E0E75]'
                        }`}
                      >
                        {item.client_feedback_status === 'approved'
                          ? 'Aprobado por ti'
                          : item.client_feedback_status === 'adjustment_requested'
                          ? 'Ajuste Solicitado'
                          : 'Nuevo Entregable'}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-[#292929]">{item.title}</h3>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {item.file_name} • {formatBytesCompact(item.size_bytes)}
                    </p>
                    {item.client_feedback_note && (
                      <p className="text-xs bg-white p-2 rounded-lg border border-[#EAE4F5] text-[#4A4A4A]">
                        Tu comentario: &quot;{item.client_feedback_note}&quot;
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#EAE4F5]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewItem({
                            title: item.title,
                            fileName: item.file_name,
                            mimeType: item.mime_type,
                            sizeBytes: item.size_bytes,
                            contentUrl: `/api/files-hub/content/client_deliverable/${item.id}`,
                          })
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0] text-xs font-bold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver Pieza</span>
                      </button>

                      <a
                        href={`/api/files-hub/content/client_deliverable/${item.id}?download=1`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Descargar</span>
                      </a>
                    </div>

                    {item.client_feedback_status !== 'approved' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeliverableFeedback(item.id, 'approved')}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-[#3BB54A] text-emerald-800 hover:text-white border border-emerald-300 text-[11px] font-black transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Dar Visto Bueno</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustTarget(item);
                            setAdjustNote('');
                          }}
                          className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Pedir Ajuste</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SUB-ÁREA 2 (5 cols): SUBIDA SEPARADA DE ARCHIVOS PARA BRIEFINGS */}
        <section className="lg:col-span-5 rounded-2xl bg-white border-2 border-[#191654]/25 p-5 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-[#EAE4F5]">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8E0E75]">
              Bandeja Separada de Entrada
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#191654] uppercase tracking-tight">
              Subir Archivos para Briefings
            </h2>
            <p className="text-xs text-[#4A4A4A] mt-0.5">
              Adjunta logotipos, imágenes, referencias o documentos para tus próximos encargos.
            </p>
          </div>

          <form onSubmit={handleUploadBriefing} className="space-y-3 bg-[#F8F6FC] p-4 rounded-2xl border border-[#D8CFF0]">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#191654] mb-1">
                Título / Campaña del Briefing
              </label>
              <input
                type="text"
                value={briefTitle}
                onChange={(e) => setBriefTitle(e.target.value)}
                placeholder="Ej. Material gráfico Campaña Rebajas"
                className="w-full px-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-white text-xs font-semibold text-[#292929] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#191654] mb-1">
                  Tu Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={briefContact}
                  onChange={(e) => setBriefContact(e.target.value)}
                  placeholder="Ej. Laura Marketing"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-white text-xs text-[#292929] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#191654] mb-1">
                  Notas del Briefing
                </label>
                <input
                  type="text"
                  value={briefDesc}
                  onChange={(e) => setBriefDesc(e.target.value)}
                  placeholder="Indicaciones clave..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-white text-xs text-[#292929] outline-none"
                />
              </div>
            </div>

            <label className="block rounded-xl border-2 border-dashed border-[#D8CFF0] hover:border-[#8E0E75] bg-white p-4 text-center cursor-pointer transition-colors">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0] || null;
                  setBriefFile(chosen);
                  if (chosen && !briefTitle) setBriefTitle(chosen.name.replace(/\.[^.]+$/, ''));
                }}
              />
              <UploadCloud className="h-6 w-6 text-[#8E0E75] mx-auto mb-1" />
              <p className="text-xs font-bold text-[#191654] truncate">
                {briefFile ? briefFile.name : 'Seleccionar archivo para tu briefing'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {briefFile ? formatBytesCompact(briefFile.size) : 'PDF, ZIP, Imágenes, Vídeo, Docs (máx. 150 MB)'}
              </p>
            </label>

            <button
              type="submit"
              disabled={isUploadingBrief || !briefFile}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#191654] hover:bg-[#2a2575] text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isUploadingBrief ? 'Enviando material...' : 'Enviar Archivo a Brain Up'}</span>
            </button>
          </form>

          {/* Listado de Briefings enviados por este cliente */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-[#191654]">
              Archivos enviados por ti ({briefings.length})
            </h3>
            {briefings.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Sin envíos todavía.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {briefings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-[#EAE4F5] bg-[#FAF8FD] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#292929] truncate">{b.title}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {b.file_name} • {formatBytesCompact(b.size_bytes)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                        b.status === 'reviewed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {b.status === 'reviewed' ? 'Recibido' : 'Enviado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* MODAL DE SOLICITUD DE AJUSTE POR PARTE DEL CLIENTE */}
      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191654]/50 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdjustTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white border-2 border-[#D8CFF0] shadow-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-[#191654] uppercase">
              Solicitar ajuste en: {adjustTarget.title}
            </h3>
            <textarea
              rows={3}
              autoFocus
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Indícanos qué te gustaría modificar..."
              className="w-full px-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] text-xs outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#4A4A4A] hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!adjustNote.trim()}
                onClick={() =>
                  handleDeliverableFeedback(adjustTarget.id, 'adjustment_requested', adjustNote)
                }
                className="px-4 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase cursor-pointer disabled:opacity-50"
              >
                Enviar Comentario
              </button>
            </div>
          </div>
        </div>
      )}

      {previewItem && (
        <FilePreviewModal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          {...previewItem}
        />
      )}
    </div>
  );
}

