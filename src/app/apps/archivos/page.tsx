'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderCheck,
  Send,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ShieldCheck,
  HardDrive,
  ExternalLink,
  RefreshCw,
  Trash2,
  FileUp,
  Building2,
  UserCheck,
  MessageSquareWarning,
  X,
  ArrowUpRight,
  Lock,
  ArrowLeft,
  Search,
  Plus,
  KeyRound,
  Download,
  Copy,
  Power,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Company } from '@/types/database';
import {
  ClientBriefingFile,
  ClientPortalAccessConfig,
  InternalWorkFile,
  SimulatedDriveEntry,
} from '@/types/files-portal';
import { notify } from '@/lib/feedback';
import { FilePreviewModal, formatBytesCompact } from '@/components/files-hub/file-preview-modal';
import { DriveTreePanel } from '@/components/files-hub/drive-tree-panel';

interface PreviewTarget {
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentUrl: string;
  folderPath?: string;
  versions?: InternalWorkFile['versions'];
}

export default function ArchivosHubPage() {
  const { user, isLoading: authLoading, isSupabaseConnected } = useAuth();

  const isActualCoordinatorOrAdmin = user?.role === 'coordinator' || user?.role === 'admin';
  // Permite alternar vista Trabajador vs Coordinadora para probar todo el flujo en el simulador
  const [simulatedRoleView, setSimulatedRoleView] = useState<'coordinator' | 'employee'>('coordinator');
  const isCoordinatorView = isActualCoordinatorOrAdmin && simulatedRoleView === 'coordinator';

  // Navegación: null = Pantalla inicial (recuadros de empresas en filas de 5); string = ID de la empresa abierta
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Filtro de búsqueda en la pantalla inicial
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Datos del backend
  const [companies, setCompanies] = useState<Company[]>([]);
  const [internalFiles, setInternalFiles] = useState<InternalWorkFile[]>([]);
  const [briefings, setBriefings] = useState<ClientBriefingFile[]>([]);
  const [portalAccesses, setPortalAccesses] = useState<Omit<ClientPortalAccessConfig, 'pin_hash'>[]>([]);
  const [driveTree, setDriveTree] = useState<SimulatedDriveEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Modal para ver el árbol del Google Drive simulado
  const [showDriveTreeModal, setShowDriveTreeModal] = useState<boolean>(false);

  // Pop-up al pulsar el punto verde de notificaciones de un cajón de empresa
  const [alertPopupCompanyId, setAlertPopupCompanyId] = useState<string | null>(null);

  // Modal Subir Archivo para el Cliente (Columna Enviados)
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadNote, setUploadNote] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replacingFile, setReplacingFile] = useState<InternalWorkFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Modal Subir Briefing / Material Recibido del Cliente (Columna Recibidos)
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);
  const [briefingTitle, setBriefingTitle] = useState<string>('');
  const [briefingNote, setBriefingNote] = useState<string>('');
  const [briefingContact, setBriefingContact] = useState<string>('');
  const [briefingFile, setBriefingFile] = useState<File | null>(null);
  const [isUploadingBriefing, setIsUploadingBriefing] = useState<boolean>(false);

  // Modal de Motivo de Corrección (Coordinadora -> Trabajador)
  const [rejectTarget, setRejectTarget] = useState<InternalWorkFile | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Modal de Configuración de Acceso y PIN del Portal Cliente
  const [showPortalPinModal, setShowPortalPinModal] = useState<boolean>(false);
  const [portalPinInput, setPortalPinInput] = useState<string>('1234');
  const [isSavingPortalPin, setIsSavingPortalPin] = useState<boolean>(false);

  // Modal visor de archivos
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  // Cargar empresas de Supabase o caché
  useEffect(() => {
    async function loadCompanies() {
      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('companies')
            .select('*')
            .eq('is_active', true)
            .order('name');
          if (data && data.length > 0) {
            setCompanies(data as Company[]);
            return;
          }
        } catch (err) {
          console.warn('Aviso cargando empresas de Supabase:', err);
        }
      }
      try {
        const cached = localStorage.getItem('bug_clockify_cache_companies');
        if (cached) {
          const parsed = JSON.parse(cached) as Company[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCompanies(parsed);
          }
        }
      } catch {
        // Sin caché previa
      }
    }
    loadCompanies();
  }, [isSupabaseConnected]);

  // Cargar datos del Hub
  const fetchHubData = useCallback(async () => {
    try {
      const res = await fetch('/api/files-hub/internal', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setInternalFiles(data.internalFiles || []);
        setBriefings(data.briefings || []);
        setPortalAccesses(data.portalAccesses || []);
        setDriveTree(data.driveTree || []);
      }
    } catch (err) {
      console.error('Error cargando Brain Storage:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchHubData();
    }
  }, [authLoading, user, fetchHubData]);

  useEffect(() => {
    if (!alertPopupCompanyId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertPopupCompanyId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [alertPopupCompanyId]);

  // Consolidar lista de empresas (reales + accesos + archivos del simulador)
  const mergedCompanies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logo_url?: string }>();
    map.set('demo-company-brainup-001', { id: 'demo-company-brainup-001', name: 'Cliente Demo Brain Up' });
    companies.forEach((c) => map.set(c.id, { id: c.id, name: c.name, logo_url: c.logo_url }));
    portalAccesses.forEach((p) => {
      if (!map.has(p.company_id)) {
        map.set(p.company_id, { id: p.company_id, name: p.company_name || 'Cliente Brain Up' });
      }
    });
    internalFiles.forEach((f) => {
      if (!map.has(f.company_id)) {
        map.set(f.company_id, { id: f.company_id, name: f.company_name || 'Cliente Brain Up' });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, portalAccesses, internalFiles]);

  // Métricas por empresa para los cajones iniciales
  const companyStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        sent: number;
        received: number;
        validated: number;
        correctionFiles: InternalWorkFile[];
        newBriefings: ClientBriefingFile[];
        alertCount: number;
      }
    >();

    mergedCompanies.forEach((c) => {
      const compFiles = internalFiles.filter((f) => f.company_id === c.id);
      const compBriefings = briefings.filter((b) => b.company_id === c.id);
      const sent = compFiles.filter(
        (f) => f.status === 'pending_review' || f.status === 'changes_requested'
      ).length;
      const received = compBriefings.length;
      const validated = compFiles.filter((f) => f.status === 'validated').length;
      const correctionFiles = compFiles.filter((f) => f.status === 'changes_requested');
      const newBriefings = compBriefings.filter((b) => b.status === 'new');
      const alertCount = correctionFiles.length + newBriefings.length;
      stats.set(c.id, { sent, received, validated, correctionFiles, newBriefings, alertCount });
    });

    return stats;
  }, [mergedCompanies, internalFiles, briefings]);

  // Empresas filtradas por el buscador
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mergedCompanies;
    return mergedCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [mergedCompanies, searchQuery]);

  // Empresa actualmente abierta
  const activeCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return mergedCompanies.find((c) => c.id === selectedCompanyId) || {
      id: selectedCompanyId,
      name: 'Empresa Cliente',
    };
  }, [selectedCompanyId, mergedCompanies]);

  // Acceso portal de la empresa abierta
  const activeCompanyPortalAccess = useMemo(() => {
    if (!selectedCompanyId) return null;
    return portalAccesses.find((p) => p.company_id === selectedCompanyId) || null;
  }, [selectedCompanyId, portalAccesses]);

  // Archivos de la empresa abierta clasificados en las 3 columnas
  const clientFiles = useMemo(() => {
    if (!selectedCompanyId) {
      return { sent: [], corrections: [], received: [], validated: [] };
    }
    const compFiles = internalFiles.filter((f) => f.company_id === selectedCompanyId);
    const compBriefings = briefings.filter((b) => b.company_id === selectedCompanyId);

    const corrections = compFiles.filter((f) => f.status === 'changes_requested');
    const sent = compFiles.filter((f) => f.status === 'pending_review');
    const received = compBriefings;
    const validated = compFiles.filter((f) => f.status === 'validated');

    return { sent, corrections, received, validated };
  }, [selectedCompanyId, internalFiles, briefings]);

  // Subir archivo a la columna Enviados (v1 o v2+ corrección)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      notify('Selecciona un archivo para subir.', { type: 'error' });
      return;
    }
    if (!activeCompany) {
      notify('Selecciona una empresa primero.', { type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('companyId', activeCompany.id);
      formData.append('companyName', activeCompany.name);
      formData.append('title', uploadTitle.trim() || uploadFile.name);
      formData.append('workerNote', uploadNote.trim());
      if (replacingFile) {
        formData.append('replaceWorkFileId', replacingFile.id);
      }

      const res = await fetch('/api/files-hub/internal', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error subiendo el archivo.', { type: 'error' });
        return;
      }

      notify(
        replacingFile
          ? `Nueva versión v${data.file?.current_version || 2} subida a Enviados.`
          : 'Archivo subido a Enviados para validación de coordinación.',
        { type: 'success' }
      );

      setUploadFile(null);
      setUploadTitle('');
      setUploadNote('');
      setReplacingFile(null);
      setShowUploadModal(false);
      await fetchHubData();
      window.dispatchEvent(new CustomEvent('bug_files_hub_updated'));
    } catch {
      notify('Error de red al subir el archivo.', { type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Subir briefing o documentación a la columna Recibidos
  const handleUploadBriefingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefingFile) {
      notify('Selecciona el archivo recibido del cliente.', { type: 'error' });
      return;
    }
    if (!activeCompany) return;

    setIsUploadingBriefing(true);
    try {
      const formData = new FormData();
      formData.append('file', briefingFile);
      formData.append('isBriefing', '1');
      formData.append('companyId', activeCompany.id);
      formData.append('companyName', activeCompany.name);
      formData.append('title', briefingTitle.trim() || briefingFile.name);
      formData.append('workerNote', briefingNote.trim());
      formData.append('contactName', briefingContact.trim() || 'Cliente');

      const res = await fetch('/api/files-hub/internal', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error registrando archivo en Recibidos.', { type: 'error' });
        return;
      }

      notify('Archivo guardado en la columna Recibidos.', { type: 'success' });
      setBriefingFile(null);
      setBriefingTitle('');
      setBriefingNote('');
      setBriefingContact('');
      setShowBriefingModal(false);
      await fetchHubData();
      window.dispatchEvent(new CustomEvent('bug_files_hub_updated'));
    } catch {
      notify('Error al registrar archivo recibido.', { type: 'error' });
    } finally {
      setIsUploadingBriefing(false);
    }
  };

  // Acción de revisión por parte de Coordinadora
  const handleReviewAction = async (
    workFileId: string,
    action: 'request_changes' | 'validate_internal' | 'validate_and_publish' | 'publish_only',
    reason?: string
  ) => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/files-hub/internal/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workFileId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'No se pudo completar la revisión.', { type: 'error' });
        return;
      }

      if (action === 'request_changes') {
        notify('Cambios solicitados. El trabajador verá el motivo en Enviados.', { type: 'info' });
        setRejectTarget(null);
        setRejectReason('');
      } else if (action === 'validate_internal') {
        notify('Archivo validado y trasladado a la columna Validados.', { type: 'success' });
      } else {
        notify('Archivo validado y publicado en el Portal Cliente.', { type: 'success' });
      }

      await fetchHubData();
      window.dispatchEvent(new CustomEvent('bug_files_hub_updated'));
    } catch {
      notify('Error de red procesando revisión.', { type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Eliminar borrador de archivo interno
  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files-hub/internal?id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'No se pudo eliminar.', { type: 'error' });
        return;
      }
      notify('Archivo retirado.', { type: 'success' });
      await fetchHubData();
    } catch {
      notify('Error al eliminar archivo.', { type: 'error' });
    }
  };

  // Guardar o alternar PIN del Portal Cliente
  const handleSavePortalAccess = async (params: {
    pin?: string;
    isEnabled?: boolean;
    regenerateToken?: boolean;
  }) => {
    if (!activeCompany) return;
    setIsSavingPortalPin(true);
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_access',
          companyId: activeCompany.id,
          companyName: activeCompany.name,
          pin: params.pin || activeCompanyPortalAccess?.pin_hint || '1234',
          isEnabled: typeof params.isEnabled === 'boolean' ? params.isEnabled : (activeCompanyPortalAccess?.is_enabled ?? true),
          regenerateToken: params.regenerateToken ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify(data.error || 'Error configurando acceso.', { type: 'error' });
        return;
      }
      notify('Acceso al Portal Cliente actualizado.', { type: 'success' });
      setShowPortalPinModal(false);
      await fetchHubData();
    } catch {
      notify('Error al guardar acceso.', { type: 'error' });
    } finally {
      setIsSavingPortalPin(false);
    }
  };

  // Reiniciar simulador
  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/files-hub/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' }),
      });
      if (res.ok) {
        notify('Simulador restablecido a los datos demo iniciales.', { type: 'success' });
        await fetchHubData();
        window.dispatchEvent(new CustomEvent('bug_files_hub_updated'));
      }
    } catch {
      notify('Error reiniciando simulador.', { type: 'error' });
    }
  };

  // Copiar enlace y PIN del portal
  const handleCopyPortalInfo = (token: string, pin: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    const text = `Acceso Área Cliente: ${url}\nPIN de seguridad: ${pin}`;
    navigator.clipboard.writeText(text);
    notify('Enlace y PIN del cliente copiados al portapapeles.', { type: 'success' });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#F4F5F7] px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA INICIAL (CUADRÍCULA DE EMPRESAS EN FILAS DE 7)           */}
      {/* ========================================================================= */}
      {!selectedCompanyId && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BARRA SUPERIOR DE LA PANTALLA INICIAL */}
          <div className="rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#191654] to-[#8E0E75] text-white shadow-sm shrink-0">
                <FolderCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-[#191654] uppercase tracking-tight">
                  Brain Storage • Área Trabajador
                </h1>
                <p className="text-xs text-[#4A4A4A] mt-0.5">
                  Haz clic en cualquier cajón de empresa para acceder a sus columnas de{' '}
                  <strong className="text-[#191654]">Enviados</strong>,{' '}
                  <strong className="text-[#8E0E75]">Recibidos</strong> y{' '}
                  <strong className="text-[#3BB54A]">Validados</strong>.
                </p>
              </div>
            </div>

            {/* CONTROLES: Buscador + Selector de Rol Demo + Accesos */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Buscador de empresas */}
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar empresa..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-[#D8CFF0] focus:border-[#8E0E75] bg-white text-xs font-bold text-[#191654] outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Selector Simulador de Rol (Jefe / Pruebas) */}
              {isActualCoordinatorOrAdmin && (
                <div className="flex items-center bg-[#F8F6FC] p-1 rounded-xl border border-[#D8CFF0]">
                  <button
                    type="button"
                    onClick={() => setSimulatedRoleView('coordinator')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simulatedRoleView === 'coordinator'
                        ? 'bg-[#8E0E75] text-white shadow-xs'
                        : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Coordinadora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedRoleView('employee')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simulatedRoleView === 'employee'
                        ? 'bg-[#191654] text-white shadow-xs'
                        : 'text-[#4A4A4A] hover:text-[#191654]'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Trabajador</span>
                  </button>
                </div>
              )}

              {/* Botón Ver Árbol Drive Simulado */}
              <button
                type="button"
                onClick={() => setShowDriveTreeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0] text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Ver estructura de carpetas simuladas de Brain Storage"
              >
                <HardDrive className="h-3.5 w-3.5 text-[#8E0E75]" />
                <span className="hidden sm:inline">Árbol Storage</span>
              </button>

              {/* Botón Reiniciar Demo */}
              {isActualCoordinatorOrAdmin && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-[#F8F6FC] text-slate-500 border border-slate-200 text-xs font-bold cursor-pointer"
                  title="Restablecer archivos y demostración inicial"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reiniciar</span>
                </button>
              )}
            </div>
          </div>

          {/* SUBBARRA DE RESUMEN Y CONTADOR */}
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
            <span>
              Mostrando <strong className="text-[#191654]">{filteredCompanies.length}</strong> empresas
              {searchQuery && ` (filtrado por "${searchQuery}")`}
            </span>
            <span className="text-[11px] text-[#8E0E75]">
              Distribución en cuadrícula de 7 columnas para máxima visibilidad (Zero-Scroll)
            </span>
          </div>

          {/* CUADRÍCULA DE RECUADROS DE EMPRESAS EN FILAS DE 7 */}
          {isLoadingData ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D8CFF0] border-t-[#8E0E75] mx-auto mb-2" />
              Cargando empresas y archivos...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border-2 border-[#D8CFF0] text-slate-400 text-xs">
              No se encontraron empresas con el término "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-7 gap-2.5">
              {filteredCompanies.map((comp) => {
                const stats = companyStats.get(comp.id) || {
                  sent: 0,
                  received: 0,
                  validated: 0,
                  correctionFiles: [],
                  newBriefings: [],
                  alertCount: 0,
                };
                const initials = comp.name
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={comp.id}
                    role="button"
                    tabIndex={0}
                    title={comp.name}
                    onClick={() => setSelectedCompanyId(comp.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCompanyId(comp.id);
                      }
                    }}
                    className="group relative text-left p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-[#D8CFF0] hover:border-[#8E0E75] hover:shadow-md transition-all duration-150 flex flex-col justify-between gap-2 cursor-pointer min-h-[112px] focus:outline-none focus:ring-2 focus:ring-[#8E0E75]/20"
                  >
                    {/* PUNTO VERDE DE NOTIFICACIÓN CON CONTADOR (CLIC PARA VER POP-UP SIN ROMPER ALTURA) */}
                    {stats.alertCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlertPopupCompanyId(comp.id);
                        }}
                        title={`${stats.alertCount} ${stats.alertCount === 1 ? 'aviso por revisar' : 'avisos por revisar'}. Haz clic para ver el detalle.`}
                        aria-label={`${stats.alertCount} notificaciones pendientes en ${comp.name}`}
                        className="absolute -top-2 -right-2 z-10 h-6 min-w-6 px-1.5 rounded-full bg-[#3BB54A] hover:bg-[#2F9A3D] text-white text-xs font-black tabular-nums border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                      >
                        <span className="absolute inset-0 rounded-full bg-[#3BB54A] animate-ping opacity-30 pointer-events-none" />
                        <span className="relative">{stats.alertCount}</span>
                      </button>
                    )}

                    {/* ENCABEZADO DEL RECUADRO: Logo grande y Nombre ocupando todo el ancho */}
                    <div className="flex-1 flex items-center gap-3 w-full min-w-0">
                      {comp.logo_url ? (
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={comp.logo_url} alt={comp.name} className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-[#191654] to-[#8E0E75] text-white flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {initials || 'EM'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-[17px] font-black text-[#191654] truncate tracking-tight leading-tight group-hover:text-[#8E0E75] transition-colors">
                          {comp.name}
                        </h3>
                      </div>
                    </div>

                    {/* MINI-PÍLDORAS CON LAS 3 MÉTRICAS: ENVIADOS, RECIBIDOS, VALIDADOS */}
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 w-full text-center">
                      <div className="p-1 rounded-lg bg-[#F8F6FC] border border-[#EAE4F5]">
                        <span className="text-[9px] block font-bold text-slate-400 uppercase">Env.</span>
                        <span className="text-xs font-black text-[#191654] tabular-nums">
                          {stats.sent}
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-[#FAF8FD] border border-[#EAE4F5]">
                        <span className="text-[9px] block font-bold text-slate-400 uppercase">Rec.</span>
                        <span className="text-xs font-black text-[#8E0E75] tabular-nums">
                          {stats.received}
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-emerald-50/70 border border-emerald-100">
                        <span className="text-[9px] block font-bold text-emerald-600 uppercase">Val.</span>
                        <span className="text-xs font-black text-emerald-700 tabular-nums">
                          {stats.validated}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* POP-UP DETALLE DE NOTIFICACIONES AL PULSAR EL PUNTO VERDE */}
          {alertPopupCompanyId && (() => {
            const popupComp = mergedCompanies.find((c) => c.id === alertPopupCompanyId);
            const popupStats = companyStats.get(alertPopupCompanyId);
            if (!popupComp || !popupStats) return null;

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4 animate-in fade-in duration-150"
                onClick={() => setAlertPopupCompanyId(null)}
                role="dialog"
                aria-modal="true"
                aria-label={`Avisos pendientes en ${popupComp.name}`}
              >
                <div
                  className="w-full max-w-md rounded-2xl border-2 border-[#3BB54A] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-gradient-to-r from-[#191654] to-[#8E0E75] px-5 py-3.5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-6 min-w-6 px-1.5 rounded-full bg-[#3BB54A] text-white text-xs font-black tabular-nums flex items-center justify-center shrink-0">
                        {popupStats.alertCount}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200 leading-none">
                          Pendientes de revisar
                        </p>
                        <h4 className="text-sm font-black uppercase tracking-tight truncate mt-0.5">
                          {popupComp.name}
                        </h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlertPopupCompanyId(null)}
                      className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                      aria-label="Cerrar aviso"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
                    {popupStats.correctionFiles.length > 0 && (
                      <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-red-800">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                          <span>Corrección requerida ({popupStats.correctionFiles.length})</span>
                        </div>
                        <ul className="space-y-1.5">
                          {popupStats.correctionFiles.map((file) => (
                            <li key={file.id} className="text-xs bg-white rounded-lg border border-red-100 px-2.5 py-1.5">
                              <p className="font-bold text-[#191654] truncate">{file.title || file.file_name}</p>
                              {file.review_reason && (
                                <p className="text-[11px] text-red-700 mt-0.5">{file.review_reason}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {popupStats.newBriefings.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-900">
                          <Inbox className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Nuevo briefing recibido ({popupStats.newBriefings.length})</span>
                        </div>
                        <ul className="space-y-1.5">
                          {popupStats.newBriefings.map((brief) => (
                            <li key={brief.id} className="text-xs bg-white rounded-lg border border-amber-100 px-2.5 py-1.5">
                              <p className="font-bold text-[#191654] truncate">{brief.title || brief.file_name}</p>
                              {(brief.uploaded_by_contact || brief.description) && (
                                <p className="text-[11px] text-amber-800 mt-0.5 truncate">
                                  {brief.uploaded_by_contact ? `Enviado por ${brief.uploaded_by_contact}` : brief.description}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 bg-[#F8F6FC] border-t border-[#EAE4F5] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAlertPopupCompanyId(null)}
                      className="px-3.5 py-1.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#EAE4F5] text-xs font-bold text-[#4A4A4A] cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAlertPopupCompanyId(null);
                        setSelectedCompanyId(popupComp.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      <span>Abrir carpeta</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: ÁREA DEL CLIENTE SELECCIONADO (3 COLUMNAS: ENVIADOS, RECIBIDOS, VALIDADOS) */}
      {/* ========================================================================= */}
      {selectedCompanyId && activeCompany && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* CABECERA DEL CLIENTE: Botón Volver + Nombre de Empresa + Accesos Portal Cliente */}
          <div className="rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8F6FC] hover:bg-[#EAE4F5] text-[#191654] border border-[#D8CFF0] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-4 w-4 text-[#8E0E75]" />
                <span>Volver a Empresas</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                {activeCompany.logo_url ? (
                  <div className="h-9 w-9 rounded-xl bg-white border border-[#D8CFF0] flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeCompany.logo_url} alt={activeCompany.name} className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#191654] to-[#8E0E75] text-white shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-[#191654] uppercase tracking-tight">
                      {activeCompany.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75] font-mono text-[10px] font-bold">
                      {clientFiles.sent.length + clientFiles.corrections.length} env •{' '}
                      {clientFiles.received.length} rec • {clientFiles.validated.length} val
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Área de Cliente: gestiona los archivos en curso, briefings aportados y entregables aprobados.
                  </p>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN PARA ESTA EMPRESA */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Acceso directo al Portal del Cliente */}
              {activeCompanyPortalAccess?.portal_token ? (
                <>
                  <Link
                    href={`/portal/${activeCompanyPortalAccess.portal_token}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#191654] hover:bg-[#2a2575] text-white text-xs font-black uppercase tracking-wider shadow-xs transition-all"
                    title={`Abrir el portal del cliente (PIN: ${activeCompanyPortalAccess.pin_hint || '1234'})`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Abrir Portal Cliente</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPortalInfo(
                        activeCompanyPortalAccess.portal_token,
                        activeCompanyPortalAccess.pin_hint || '1234'
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#F8F6FC] hover:bg-[#EAE4F5] text-[#8E0E75] border border-[#D8CFF0] text-xs font-bold cursor-pointer"
                    title="Copiar enlace secreto y código PIN"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar Link + PIN</span>
                  </button>
                </>
              ) : (
                isCoordinatorView && (
                  <button
                    type="button"
                    onClick={() => {
                      setPortalPinInput('1234');
                      setShowPortalPinModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Activar Enlace + PIN Portal</span>
                  </button>
                )
              )}

              {/* Ajustar PIN / Pausar Portal (solo Coordinadora) */}
              {isCoordinatorView && activeCompanyPortalAccess && (
                <button
                  type="button"
                  onClick={() => {
                    setPortalPinInput(activeCompanyPortalAccess.pin_hint || '1234');
                    setShowPortalPinModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold cursor-pointer"
                  title="Configurar PIN o pausar portal"
                >
                  <KeyRound className="h-3.5 w-3.5 text-[#8E0E75]" />
                  <span className="hidden sm:inline">PIN: {activeCompanyPortalAccess.pin_hint || '****'}</span>
                </button>
              )}

              {/* Selector de Rol Simulador */}
              {isActualCoordinatorOrAdmin && (
                <div className="flex items-center bg-[#F8F6FC] p-1 rounded-xl border border-[#D8CFF0]">
                  <button
                    type="button"
                    onClick={() => setSimulatedRoleView('coordinator')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      simulatedRoleView === 'coordinator'
                        ? 'bg-[#8E0E75] text-white shadow-xs'
                        : 'text-[#4A4A4A]'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>Coord.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedRoleView('employee')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      simulatedRoleView === 'employee'
                        ? 'bg-[#191654] text-white shadow-xs'
                        : 'text-[#4A4A4A]'
                    }`}
                  >
                    <UserCheck className="h-3 w-3" />
                    <span>Trabajador</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LAS 3 COLUMNAS DEL CLIENTE: ENVIADOS | RECIBIDOS | VALIDADOS              */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 items-start">
            {/* --------------------------------------------------------------------- */}
            {/* COLUMNA 1: ENVIADOS (Subidos por trabajadores para revisión/entrega)  */}
            {/* --------------------------------------------------------------------- */}
            <div className="rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 space-y-3 shadow-xs flex flex-col max-h-[calc(100vh-210px)]">
              {/* CABECERA COLUMNA 1 */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EAE4F5]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#191654] text-white">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
                        Enviados
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0] text-[10px] font-black tabular-nums">
                        {clientFiles.sent.length + clientFiles.corrections.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Archivos producidos para el cliente</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReplacingFile(null);
                    setUploadTitle('');
                    setUploadNote('');
                    setUploadFile(null);
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Subir</span>
                </button>
              </div>

              {/* LISTA DE ARCHIVOS ENVIADOS (CON SCROLL INTERNO ZERO-SCROLL) */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {/* 1.A. SUBBLOQUE: CAMBIOS SOLICITADOS / CORRECCIÓN */}
                {clientFiles.corrections.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-red-700 uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <span>Requieren Corrección ({clientFiles.corrections.length})</span>
                    </div>
                    {clientFiles.corrections.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-red-50/70 border-2 border-red-200 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-red-200 font-mono text-[9px] font-black text-red-700">
                              v{file.current_version}
                            </span>
                            <h4 className="font-black text-slate-900 truncate mt-1">{file.title}</h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {file.uploaded_by_name} • {file.file_name}
                            </p>
                          </div>
                        </div>

                        {file.review_reason && (
                          <div className="p-2 rounded-lg bg-white border-l-4 border-red-500 text-[11px] text-red-900">
                            <span className="font-bold text-red-700 block uppercase text-[9px]">
                              Motivo de coordinación:
                            </span>
                            {file.review_reason}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewTarget({
                                title: file.title,
                                fileName: file.file_name,
                                mimeType: file.mime_type,
                                sizeBytes: file.size_bytes,
                                contentUrl: `/api/files-hub/content/internal/${file.id}`,
                                folderPath: file.drive_folder_path,
                                versions: file.versions,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Ver</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplacingFile(file);
                              setUploadTitle(file.title);
                              setUploadNote('');
                              setUploadFile(null);
                              setShowUploadModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-wider cursor-pointer shadow-xs"
                          >
                            <FileUp className="h-3 w-3" />
                            <span>Subir v{file.current_version + 1}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1.B. SUBBLOQUE: EN REVISIÓN / PENDIENTES DE VALIDAR */}
                {clientFiles.sent.length === 0 && clientFiles.corrections.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-[#FAF8FD] rounded-xl border border-dashed border-[#D8CFF0]">
                    No hay entregables pendientes en Enviados.
                    <br />
                    Haz clic en <strong className="text-[#8E0E75]">+ Subir</strong> para crear uno.
                  </div>
                ) : (
                  clientFiles.sent.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-[#FAF8FD] border border-[#D8CFF0] hover:border-[#8E0E75] transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-[#D8CFF0] font-mono text-[9px] font-black text-[#8E0E75]">
                              v{file.current_version}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold truncate">
                              {file.uploaded_by_name}
                            </span>
                          </div>
                          <h4 className="font-black text-[#191654] truncate mt-1">{file.title}</h4>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {file.file_name} • {formatBytesCompact(file.size_bytes)}
                          </p>
                        </div>
                      </div>

                      {file.worker_note && (
                        <p className="text-[11px] text-slate-600 bg-white px-2 py-1 rounded-lg border border-[#EAE4F5]">
                          {file.worker_note}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              title: file.title,
                              fileName: file.file_name,
                              mimeType: file.mime_type,
                              sizeBytes: file.size_bytes,
                              contentUrl: `/api/files-hub/content/internal/${file.id}`,
                              folderPath: file.drive_folder_path,
                              versions: file.versions,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#191654] border border-[#D8CFF0] text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Ver</span>
                        </button>

                        {isCoordinatorView ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isSubmittingReview}
                              onClick={() => {
                                setRejectTarget(file);
                                setRejectReason('');
                              }}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase cursor-pointer"
                              title="Solicitar cambios al trabajador"
                            >
                              Pedir Cambios
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingReview}
                              onClick={() => handleReviewAction(file.id, 'validate_internal')}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase cursor-pointer"
                              title="Validar internamente"
                            >
                              Validar
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingReview}
                              onClick={() => handleReviewAction(file.id, 'validate_and_publish')}
                              className="px-2 py-1 rounded-lg bg-[#3BB54A] hover:bg-[#329A3F] text-white text-[10px] font-black uppercase cursor-pointer shadow-xs"
                              title="Validar y publicar directo al cliente"
                            >
                              Val.+Pub.
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Retirar entrega"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* COLUMNA 2: RECIBIDOS (Briefings y documentación aportada por el cliente) */}
            {/* --------------------------------------------------------------------- */}
            <div className="rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 space-y-3 shadow-xs flex flex-col max-h-[calc(100vh-210px)]">
              {/* CABECERA COLUMNA 2 */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EAE4F5]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#8E0E75] text-white">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-[#8E0E75] uppercase tracking-tight">
                        Recibidos
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF8FD] text-[#8E0E75] border border-[#D8CFF0] text-[10px] font-black tabular-nums">
                        {clientFiles.received.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Briefings y documentación del cliente</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBriefingTitle('');
                    setBriefingNote('');
                    setBriefingContact('');
                    setBriefingFile(null);
                    setShowBriefingModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F8F6FC] hover:bg-[#EAE4F5] text-[#8E0E75] border border-[#D8CFF0] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0"
                  title="Adjuntar briefing recibido por email o reunión"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adjuntar</span>
                </button>
              </div>

              {/* LISTA DE ARCHIVOS RECIBIDOS (CON SCROLL INTERNO ZERO-SCROLL) */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {clientFiles.received.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-[#FAF8FD] rounded-xl border border-dashed border-[#D8CFF0]">
                    No se han recibido briefings o documentos de este cliente aún.
                    <br />
                    El cliente puede subirlos desde su portal o puedes adjuntarlos con{' '}
                    <strong className="text-[#8E0E75]">+ Adjuntar</strong>.
                  </div>
                ) : (
                  clientFiles.received.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-white border border-[#D8CFF0] hover:border-[#8E0E75] transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-bold">
                              Subido por: <strong>{b.uploaded_by_contact || 'Cliente'}</strong>
                            </span>
                            {b.status === 'new' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                                Nuevo
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-[#191654] truncate mt-1">{b.title}</h4>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {b.file_name} • {formatBytesCompact(b.size_bytes)}
                          </p>
                        </div>
                      </div>

                      {b.description && (
                        <p className="text-[11px] text-slate-600 bg-[#F8F6FC] px-2 py-1 rounded-lg border border-[#EAE4F5]">
                          {b.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              title: b.title,
                              fileName: b.file_name,
                              mimeType: b.mime_type,
                              sizeBytes: b.size_bytes,
                              contentUrl: `/api/files-hub/content/client_briefing/${b.id}`,
                              folderPath: b.drive_folder_path,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#191654] border border-[#D8CFF0] text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Ver</span>
                        </button>

                        <a
                          href={`/api/files-hub/content/client_briefing/${b.id}?download=1`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FAF8FD] hover:bg-[#EAE4F5] text-[#8E0E75] text-[11px] font-bold"
                        >
                          <Download className="h-3 w-3" />
                          <span>Descargar</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* COLUMNA 3: VALIDADOS (Archivos aprobados con visto bueno)             */}
            {/* --------------------------------------------------------------------- */}
            <div className="rounded-2xl bg-white border-2 border-emerald-300 p-4 space-y-3 shadow-xs flex flex-col max-h-[calc(100vh-210px)]">
              {/* CABECERA COLUMNA 3 */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-100 bg-emerald-50/50 -m-4 mb-0 p-4 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#3BB54A] text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                        Validados
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 text-[10px] font-black tabular-nums">
                        {clientFiles.validated.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700">Archivos aprobados con visto bueno</p>
                  </div>
                </div>

                <span className="text-[10px] font-black text-emerald-800 uppercase px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                  {clientFiles.validated.filter((f) => f.is_client_published).length} en portal
                </span>
              </div>

              {/* LISTA DE ARCHIVOS VALIDADOS (CON SCROLL INTERNO ZERO-SCROLL) */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 pt-1">
                {clientFiles.validated.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-emerald-50/20 rounded-xl border border-dashed border-emerald-200">
                    Aún no hay archivos validados para este cliente.
                    <br />
                    Los archivos aprobados en <strong className="text-[#191654]">Enviados</strong> aparecerán
                    aquí.
                  </div>
                ) : (
                  clientFiles.validated.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-xl border-2 transition-all space-y-2 text-xs ${
                        file.is_client_published
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-white border-[#D8CFF0]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-[#D8CFF0] font-mono text-[9px] font-black text-[#8E0E75]">
                              v{file.current_version}
                            </span>
                            {file.is_client_published ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3BB54A] text-white text-[9px] font-black uppercase">
                                <ExternalLink className="h-2.5 w-2.5" />
                                <span>Publicado en Portal</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F8F6FC] border border-[#D8CFF0] text-[#191654] text-[9px] font-black uppercase">
                                <Lock className="h-2.5 w-2.5" />
                                <span>Validado Interno</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-900 truncate mt-1">{file.title}</h4>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {file.file_name} • {formatBytesCompact(file.size_bytes)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Autor: <strong>{file.uploaded_by_name}</strong> • Validó:{' '}
                            <strong>{file.reviewed_by_name || 'Coordinación'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewTarget({
                                title: file.title,
                                fileName: file.file_name,
                                mimeType: file.mime_type,
                                sizeBytes: file.size_bytes,
                                contentUrl: `/api/files-hub/content/internal/${file.id}`,
                                folderPath: file.drive_folder_path,
                                versions: file.versions,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#191654] border border-[#D8CFF0] text-[11px] font-bold cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Ver</span>
                          </button>

                          <a
                            href={`/api/files-hub/content/internal/${file.id}?download=1`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FAF8FD] hover:bg-[#EAE4F5] text-slate-700 border border-slate-200 text-[11px] font-bold"
                          >
                            <Download className="h-3 w-3" />
                            <span>Descargar</span>
                          </a>
                        </div>

                        {/* Botón de Publicar al Portal Cliente si aún es solo interno */}
                        {isCoordinatorView && !file.is_client_published && (
                          <button
                            type="button"
                            disabled={isSubmittingReview}
                            onClick={() => handleReviewAction(file.id, 'publish_only')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3BB54A] hover:bg-[#329A3F] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            <span>Publicar al Cliente</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUBIR ARCHIVO A ENVIADOS (COMPACTO ZERO-SCROLL < 420px)           */}
      {/* ========================================================================= */}
      {showUploadModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#EEF0F5] border-2 border-[#D8CFF0] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#191654] text-white">
                  <FileUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
                    {replacingFile ? `Subir Versión v${replacingFile.current_version + 1}` : 'Subir a Enviados'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Para: {activeCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setReplacingFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Título del Entregable
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ej: Creatividad Campaña Black Friday"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs text-xs font-bold text-[#191654] outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Seleccionar Archivo
                </label>
                <div className="p-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] shadow-xs">
                  <input
                    type="file"
                    required={!replacingFile}
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#F8F6FC] file:text-[#8E0E75] hover:file:bg-[#EAE4F5] file:cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Nota o Comentario (Opcional)
                </label>
                <textarea
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="Detalles sobre los cambios o aspectos a revisar por coordinación..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs text-xs font-bold text-[#191654] outline-none resize-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setReplacingFile(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUploading ? 'Subiendo...' : replacingFile ? 'Subir Versión' : 'Subir a Enviados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADJUNTAR MATERIAL A RECIBIDOS (< 420px)                           */}
      {/* ========================================================================= */}
      {showBriefingModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#EEF0F5] border-2 border-[#D8CFF0] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#8E0E75] text-white">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#8E0E75] uppercase tracking-tight">
                    Adjuntar a Recibidos
                  </h3>
                  <p className="text-[10px] text-slate-400">Para: {activeCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadBriefingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Título / Concepto del Briefing
                </label>
                <input
                  type="text"
                  required
                  value={briefingTitle}
                  onChange={(e) => setBriefingTitle(e.target.value)}
                  placeholder="Ej: Guía de Estilo y Logotipos 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs text-xs font-bold text-[#191654] outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Persona de Contacto o Procedencia
                </label>
                <input
                  type="text"
                  value={briefingContact}
                  onChange={(e) => setBriefingContact(e.target.value)}
                  placeholder="Ej: Laura Gómez (Directora Marketing)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs text-xs font-bold text-[#191654] outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Seleccionar Archivo
                </label>
                <div className="p-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] shadow-xs">
                  <input
                    type="file"
                    required
                    onChange={(e) => setBriefingFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#F8F6FC] file:text-[#8E0E75] hover:file:bg-[#EAE4F5] file:cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Instrucciones o Notas Acompañantes
                </label>
                <textarea
                  value={briefingNote}
                  onChange={(e) => setBriefingNote(e.target.value)}
                  placeholder="Observaciones transmitidas por el cliente..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs text-xs font-bold text-[#191654] outline-none resize-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBriefingModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploadingBriefing}
                  className="px-4 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUploadingBriefing ? 'Guardando...' : 'Guardar en Recibidos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MOTIVO DE CORRECCIÓN (COORDINADORA -> TRABAJADOR)                 */}
      {/* ========================================================================= */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#EEF0F5] border-2 border-red-300 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-600 text-white">
                  <MessageSquareWarning className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-tight">
                    Pedir Cambios al Trabajador
                  </h3>
                  <p className="text-[10px] text-slate-400">Archivo: {rejectTarget.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Indica claramente qué ajustes debe realizar <strong>{rejectTarget.uploaded_by_name}</strong>.
                El archivo volverá a la columna Enviados como pendiente de corrección:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Falta incorporar el logotipo en alta resolución y ajustar el texto de la diapositiva 2..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-red-300 focus:border-red-600 shadow-xs text-xs font-bold text-slate-900 outline-none resize-none transition-all placeholder:text-slate-400"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview || !rejectReason.trim()}
                  onClick={() => handleReviewAction(rejectTarget.id, 'request_changes', rejectReason)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Enviando...' : 'Solicitar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIGURACIÓN DE PIN / ACCESO DEL CLIENTE                         */}
      {/* ========================================================================= */}
      {showPortalPinModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#EEF0F5] border-2 border-[#D8CFF0] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#191654] text-white">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
                    Acceso Portal Cliente
                  </h3>
                  <p className="text-[10px] text-slate-400">{activeCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPortalPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#191654] uppercase mb-1">
                  Código PIN de Seguridad (4 a 6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={portalPinInput}
                  onChange={(e) => setPortalPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#D8CFF0] focus:border-[#8E0E75] shadow-xs font-mono font-black text-center text-sm text-[#191654] outline-none"
                />
              </div>

              {activeCompanyPortalAccess && (
                <div className="p-3.5 rounded-xl bg-white border-2 border-[#D8CFF0] shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Estado del Portal:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        activeCompanyPortalAccess.is_enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {activeCompanyPortalAccess.is_enabled ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingPortalPin}
                      onClick={() =>
                        handleSavePortalAccess({
                          isEnabled: !activeCompanyPortalAccess.is_enabled,
                        })
                      }
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-colors ${
                        activeCompanyPortalAccess.is_enabled
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {activeCompanyPortalAccess.is_enabled ? 'Pausar Acceso' : 'Reactivar Acceso'}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingPortalPin}
                      onClick={() => handleSavePortalAccess({ regenerateToken: true })}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[#F8F6FC] hover:bg-[#EAE4F5] text-slate-700 border border-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Rotar Token Secreto
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPortalPinModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPortalPin || !/^\d{4,6}$/.test(portalPinInput.trim())}
                  onClick={() => handleSavePortalAccess({ pin: portalPinInput.trim() })}
                  className="px-4 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingPortalPin ? 'Guardando...' : 'Guardar PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ÁRBOL GOOGLE DRIVE SIMULADO (DIRECCIÓN / JEFE)                    */}
      {/* ========================================================================= */}
      {showDriveTreeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl bg-[#EEF0F5] border-2 border-[#D8CFF0] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#191654] text-white">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#191654] uppercase tracking-tight">
                    Estructura Brain Storage Simulado
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Almacén desacoplado local en <code className="font-mono">/.local-drive-sim/</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveTreeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3 rounded-xl bg-white border-2 border-[#D8CFF0] shadow-xs">
              <DriveTreePanel tree={driveTree} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VISOR RÁPIDO DE ARCHIVOS (IMÁGENES, SVG, PDF, CÓDIGO)            */}
      {/* ========================================================================= */}
      {previewTarget && (
        <FilePreviewModal
          isOpen={!!previewTarget}
          onClose={() => setPreviewTarget(null)}
          title={previewTarget.title}
          fileName={previewTarget.fileName}
          mimeType={previewTarget.mimeType}
          sizeBytes={previewTarget.sizeBytes}
          contentUrl={previewTarget.contentUrl}
          folderPath={previewTarget.folderPath}
          versions={previewTarget.versions}
        />
      )}
    </div>
  );
}
