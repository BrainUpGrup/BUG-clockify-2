'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileVideo, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Globe2, 
  Layers,
  Sparkles,
  FileText,
  FileEdit,
  Tag,
  ShieldAlert,
  Shield,
  ExternalLink
} from 'lucide-react';
import { SubtitulosJob } from '@/types/subtitulos';
import { parseSubtitulosError } from '@/lib/subtitulos-error-parser';
import { notify, confirmDialog } from '@/lib/feedback';
import { FilesDownloadList } from './files-download-list';

interface JobCardProps {
  job: SubtitulosJob;
  onOpenReview: (job: SubtitulosJob) => void;
  onJobUpdated: (job: SubtitulosJob) => void;
  onJobDeleted: (jobId: string) => void;
}

export function JobCard({
  job,
  onOpenReview,
  onJobUpdated,
  onJobDeleted,
}: JobCardProps) {
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(job.status === 'completed' || job.status === 'awaiting_review');
  const [showAllRevisar, setShowAllRevisar] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // 3. Consultar GET /jobs/{id} cada 5 segundos si el trabajo está en curso
  useEffect(() => {
    if (job.status !== 'queued' && job.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(job.id)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const updated: SubtitulosJob = await res.json();
          onJobUpdated(updated);
        }
      } catch (err) {
        console.warn(`Error consultando estado del trabajo ${job.id}:`, err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [job.id, job.status, onJobUpdated]);

  const getStatusBadge = () => {
    switch (job.status) {
      case 'queued':
        return {
          label: 'En cola',
          color: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: Clock,
          pulse: false,
        };
      case 'processing':
        return {
          label: 'Procesando',
          color: 'bg-[#8E0E75] text-white border-[#8E0E75]',
          icon: RotateCw,
          pulse: true,
        };
      case 'awaiting_review':
        return {
          label: 'Revisión pendiente',
          color: 'bg-amber-500 text-white border-amber-600',
          icon: AlertTriangle,
          pulse: true,
        };
      case 'completed':
        return {
          label: 'Completado',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: CheckCircle2,
          pulse: false,
        };
      case 'failed':
        return {
          label: 'Error',
          color: 'bg-red-100 text-red-900 border-red-300',
          icon: AlertTriangle,
          pulse: false,
        };
      default:
        return {
          label: job.status,
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Clock,
          pulse: false,
        };
    }
  };

  const getPhaseDescription = () => {
    switch (job.phase) {
      case 'transcription':
        return 'Fase 1/4 · Transcripción con Whisper large-v3';
      case 'review':
        return 'Fase 2/4 · Revisión de coherencia con Claude';
      case 'translation':
        return 'Fase 3/4 · Traducción y localización con Claude';
      case 'rendering':
        return 'Fase 4/4 · Renderizado de vídeo con ffmpeg';
      case 'done':
        return 'Proceso completado';
      default:
        if (job.status === 'queued') return 'Esperando turno en el worker...';
        if (job.status === 'completed') return 'Proceso finalizado con éxito';
        if (job.status === 'awaiting_review') return 'Pausado: requiere validación de las correcciones';
        if (job.status === 'failed') return 'Trabajo detenido por error';
        return '';
    }
  };

  const formatSecondsToMinutes = (seconds: number) => {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(job.id)}/retry`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('No se pudo reintentar el trabajo');
      const updated = await res.json();
      notify('Trabajo reencolado para reintento', { type: 'success' });
      onJobUpdated(updated);
    } catch (err: any) {
      notify(err.message || 'Error al reintentar', { type: 'error' });
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: '¿Eliminar trabajo y sus archivos?',
      message: `Se borrará permanentemente "${job.original_filename || job.id}" y todos los vídeos y subtítulos generados.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(job.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        throw new Error('No se pudo eliminar el trabajo');
      }
      notify('Trabajo eliminado correctamente', { type: 'info' });
      onJobDeleted(job.id);
    } catch (err: any) {
      notify(err.message || 'Error al eliminar', { type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const badge = getStatusBadge();
  const Icon = badge.icon;
  const progressPercent = Math.min(Math.round((job.progress || 0) * 100), 100);

  // Formato de fecha
  const formattedDate = new Date(job.created_at).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const revisarItems = job.review_summary?.revisar || [];

  return (
    <div
      className={`rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
        job.status === 'awaiting_review'
          ? 'border-amber-400 bg-amber-50/20 shadow-md ring-2 ring-amber-400/20'
          : job.status === 'completed'
          ? 'border-emerald-300 bg-white hover:border-[#8E0E75]'
          : job.status === 'failed'
          ? 'border-red-300 bg-red-50/10'
          : 'border-[#D8CFF0] bg-white'
      }`}
    >
      {/* Cabecera de la tarjeta */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-[#F8F6FC] border-2 border-[#D8CFF0] flex items-center justify-center text-[#8E0E75] shrink-0">
              <FileVideo className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base sm:text-lg text-[#292929] truncate" title={job.original_filename || job.id}>
                {job.original_filename || `Trabajo ${job.id}`}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#4A4A4A]">
                <span>ID: <code className="font-mono text-[#8E0E75] font-bold">{job.id}</code></span>
                <span>•</span>
                <span>{formattedDate}</span>
                {job.source_lang && job.target_lang && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#8E0E75] bg-[#F8F6FC] px-1.5 py-0.5 rounded border border-[#D8CFF0]">
                      <Globe2 className="h-3 w-3" />
                      {job.source_lang.toUpperCase()} → {job.target_lang.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${badge.color}`}
            >
              <Icon className={`h-3.5 w-3.5 ${badge.pulse ? 'animate-spin' : ''}`} />
              <span>{badge.label}</span>
            </span>

            {job.status !== 'processing' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Eliminar trabajo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Metadatos: Contexto y Glosario */}
        {(job.topic || job.glossary) && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {job.topic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8FE] border border-[#D8CFF0] text-[#292929]">
                <Tag className="h-3 w-3 text-[#8E0E75]" />
                <strong>Contexto:</strong> {job.topic}
              </span>
            )}
            {job.glossary && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8FE] border border-[#D8CFF0] text-[#292929]">
                <Sparkles className="h-3 w-3 text-[#8E0E75]" />
                <strong>Términos:</strong> {job.glossary}
              </span>
            )}
          </div>
        )}

        {/* 3. Barra de Progreso y Fase (Para trabajos activos o en proceso) */}
        {job.status !== 'completed' && job.status !== 'failed' && (
          <div className="space-y-2 mb-4 bg-[#F8F6FC] p-3.5 rounded-xl border border-[#D8CFF0]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#292929] flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-[#8E0E75] animate-spin" />
                {getPhaseDescription()}
              </span>
              <span className="text-[#8E0E75] font-mono text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#E5E0F2] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#8E0E75] h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 4. ALERTA Y ACCIÓN REQUERIDA: Awaiting Review */}
        {job.status === 'awaiting_review' && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-950">
                  Revisión de coherencia pendiente de validación
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {job.review_summary ? (
                    <>
                      Se han propuesto <strong>{job.review_summary.total}</strong> correcciones, con{' '}
                      <strong className="text-amber-900 underline font-bold">
                        {revisarItems.length} marcadas como REVISAR
                      </strong>.
                    </>
                  ) : (
                    'Claude ha preparado las correcciones de transcripción para su validación.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenReview(job)}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileEdit className="h-4 w-4" />
              <span>Revisar correcciones</span>
            </button>
          </div>
        )}

        {/* 6. ERROR DE PROCESO: AVISO HUMANO + PARADA DE SEGURIDAD + REINTENTAR */}
        {job.status === 'failed' && (() => {
          const parsed = parseSubtitulosError(job.error);
          return (
            <div
              className={`p-5 rounded-2xl border-2 space-y-4 mb-4 transition-all shadow-sm ${
                parsed.isSafetyStop
                  ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-200/50'
                  : 'bg-red-50/60 border-red-300'
              }`}
            >
              {/* Cabecera del aviso humano */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      parsed.isSafetyStop
                        ? 'bg-rose-100 border-rose-300 text-rose-700'
                        : 'bg-red-100 border-red-300 text-red-700'
                    }`}
                  >
                    {parsed.isSafetyStop ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-rose-950">
                        {parsed.title}
                      </h4>
                      {parsed.isSafetyStop && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-900 border border-rose-300">
                          <Shield className="h-3 w-3" />
                          Parada preventiva: Cero cobros extra
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed max-w-2xl">
                      {parsed.humanMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying}
                    className="px-4 py-2 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                    <span>Reintentar</span>
                  </button>
                </div>
              </div>

              {/* Recomendación paso a paso y acciones */}
              <div className="p-3.5 rounded-xl bg-white/95 border border-rose-200 text-xs text-rose-950 space-y-2.5">
                <p className="font-semibold text-[#292929] leading-relaxed">
                  👉 <strong>¿Qué debes hacer ahora?</strong> {parsed.recommendation}
                </p>

                {parsed.actionUrl && (
                  <div className="pt-0.5">
                    <a
                      href={parsed.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      <span>{parsed.actionLabel || 'Abrir panel de Anthropic'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Detalle técnico colapsado para no ensuciar la pantalla con códigos gigantes */}
              <div className="pt-1 border-t border-rose-200/70">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 hover:text-rose-950 transition-colors cursor-pointer"
                >
                  <span>{showTechnicalDetails ? 'Ocultar código técnico' : 'Ver detalle técnico del servidor (para soporte)'}</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-2 p-2.5 bg-gray-900 text-rose-300 rounded-lg text-[11px] font-mono break-all leading-normal max-h-40 overflow-y-auto animate-in fade-in">
                    {parsed.rawError}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 5. AL COMPLETARSE: AVISO DE PUNTOS REVISAR */}
        {job.status === 'completed' && job.review_summary && (
          <div className="mb-4">
            {revisarItems.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Aviso: {revisarItems.length} {revisarItems.length === 1 ? 'punto marcado' : 'puntos marcados'} como REVISAR
                    </span>
                  </div>
                  {revisarItems.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllRevisar(!showAllRevisar)}
                      className="text-[11px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                    >
                      {showAllRevisar ? 'Ver menos' : `Ver todos (${revisarItems.length})`}
                    </button>
                  )}
                </div>
                <p className="text-xs text-amber-800">
                  Comprueba estos minutos en el vídeo generado para validar que los nombres deducidos por contexto se ajustan al original:
                </p>
                <div className="space-y-1.5 pt-1">
                  {(showAllRevisar ? revisarItems : revisarItems.slice(0, 3)).map((item) => (
                    <div
                      key={item.index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-white/80 border border-amber-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                          Min {formatSecondsToMinutes(item.time)}
                        </span>
                        <span className="font-mono text-gray-500 text-[11px]">#{item.index}</span>
                        <span className="font-semibold text-[#292929]">&quot;{item.text}&quot;</span>
                      </div>
                      {item.reason && (
                        <span className="text-[11px] text-[#4A4A4A] italic sm:text-right">
                          {item.reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>0 puntos dudosos:</strong> Todas las correcciones de transcripción fueron de alta certeza.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 5. AL COMPLETARSE: BOTONES DE DESCARGA DE CADA ARCHIVO DE "FILES" */}
        {job.status === 'completed' && job.files && job.files.length > 0 && (
          <div className="mt-2 pt-4 border-t border-[#F0EBF8]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E0E75] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Archivos y resultados listos ({job.files.length}):
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-bold text-[#8E0E75] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <span>Ocultar descargas</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Mostrar descargas</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {isExpanded && (
              <FilesDownloadList
                jobId={job.id}
                files={job.files}
                originalFilename={job.original_filename}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
