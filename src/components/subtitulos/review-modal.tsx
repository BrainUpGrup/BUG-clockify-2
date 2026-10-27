'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Check, 
  X, 
  Search, 
  Clock, 
  FileEdit,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { notify, confirmDialog } from '@/lib/feedback';
import { 
  SubtitulosCorrection, 
  SubtitulosSegment, 
  SubtitulosReviewResponse, 
  SubtitulosJob 
} from '@/types/subtitulos';

interface ReviewModalProps {
  jobId: string;
  originalFilename?: string;
  isOpen: boolean;
  onClose: () => void;
  onApproved: (job: SubtitulosJob) => void;
}

export function ReviewModal({
  jobId,
  originalFilename,
  isOpen,
  onClose,
  onApproved,
}: ReviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [transcript, setTranscript] = useState<SubtitulosSegment[]>([]);
  const [corrections, setCorrections] = useState<SubtitulosCorrection[]>([]);
  const [originalCorrections, setOriginalCorrections] = useState<SubtitulosCorrection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Filtros
  const [activeFilter, setActiveFilter] = useState<'all' | 'revisar' | 'seguro'>('revisar');
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar datos de revisión
  useEffect(() => {
    if (!isOpen || !jobId) return;

    let isMounted = true;
    async function loadReview() {
      setLoading(true);
      try {
        const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(jobId)}/review`);
        if (!res.ok) {
          throw new Error('No se pudo cargar la revisión del trabajo');
        }
        const data: SubtitulosReviewResponse = await res.json();
        if (isMounted) {
          setTranscript(data.transcript || []);
          setCorrections(data.corrections || []);
          setOriginalCorrections(JSON.parse(JSON.stringify(data.corrections || [])));
          setHasChanges(false);

          // Si no hay items REVISAR, poner filtro en all
          const revisarCount = (data.corrections || []).filter((c) => c.level === 'REVISAR').length;
          if (revisarCount === 0) {
            setActiveFilter('all');
          } else {
            setActiveFilter('revisar');
          }
        }
      } catch (err: any) {
        notify(err.message || 'Error al obtener revisión', { type: 'error' });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, jobId]);

  // Mapa de segmentos de transcripción por índice
  const transcriptMap = useMemo(() => {
    const map = new Map<number, SubtitulosSegment>();
    transcript.forEach((s) => map.set(s.i, s));
    return map;
  }, [transcript]);

  const formatSecondsToMinutes = (seconds: number) => {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (index: number, newText: string) => {
    setCorrections((prev) =>
      prev.map((c) => (c.index === index ? { ...c, text: newText } : c))
    );
    setHasChanges(true);
  };

  const handleLevelToggle = (index: number) => {
    setCorrections((prev) =>
      prev.map((c) =>
        c.index === index
          ? { ...c, level: c.level === 'REVISAR' ? 'SEGURO' : 'REVISAR' }
          : c
      )
    );
    setHasChanges(true);
  };

  const handleRestoreOriginalTranscript = (index: number) => {
    const origSegment = transcriptMap.get(index);
    if (!origSegment) return;
    setCorrections((prev) =>
      prev.map((c) => (c.index === index ? { ...c, text: origSegment.text } : c))
    );
    setHasChanges(true);
  };

  // Guardar cambios vía PUT
  const handleSaveChanges = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(jobId)}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corrections),
      });

      if (!res.ok) {
        let msg = 'Error al guardar la revisión';
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      setOriginalCorrections(JSON.parse(JSON.stringify(corrections)));
      setHasChanges(false);
      notify('Cambios en la revisión guardados con éxito', { type: 'success' });
      return true;
    } catch (err: any) {
      notify(err.message || 'Error al guardar', { type: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Aprobar revisión vía POST
  const handleApprove = async () => {
    const confirmed = await confirmDialog({
      title: '¿Aprobar y continuar?',
      message:
        'Al aprobar, el trabajo pasará a la fase de traducción y renderizado final de los vídeos y subtítulos.',
      confirmLabel: 'Aprobar y continuar',
      cancelLabel: 'Seguir revisando',
    });

    if (!confirmed) return;

    setApproving(true);
    try {
      // Si hay cambios pendientes, guardarlos primero vía PUT
      if (hasChanges) {
        const saved = await handleSaveChanges();
        if (!saved) {
          setApproving(false);
          return;
        }
      }

      const res = await fetch(`/api/subtitulos/jobs/${encodeURIComponent(jobId)}/approve`, {
        method: 'POST',
      });

      if (!res.ok) {
        let msg = 'Error al aprobar el trabajo';
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      const updatedJob: SubtitulosJob = await res.json();
      notify('¡Revisión aprobada! El vídeo continúa con la traducción y renderizado.', {
        type: 'success',
      });
      onApproved(updatedJob);
      onClose();
    } catch (err: any) {
      notify(err.message || 'Error al aprobar', { type: 'error' });
    } finally {
      setApproving(false);
    }
  };

  // Conteo de niveles
  const counts = useMemo(() => {
    const total = corrections.length;
    const revisar = corrections.filter((c) => c.level === 'REVISAR').length;
    const seguro = total - revisar;
    return { total, revisar, seguro };
  }, [corrections]);

  // Lista filtrada
  const filteredCorrections = useMemo(() => {
    return corrections
      .filter((c) => {
        if (activeFilter === 'revisar') return c.level === 'REVISAR';
        if (activeFilter === 'seguro') return c.level === 'SEGURO';
        return true;
      })
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const seg = transcriptMap.get(c.index);
        const originalText = seg?.text?.toLowerCase() || '';
        const correctedText = c.text.toLowerCase();
        const reason = c.reason.toLowerCase();
        return (
          originalText.includes(q) ||
          correctedText.includes(q) ||
          reason.includes(q) ||
          c.index.toString().includes(q)
        );
      });
  }, [corrections, activeFilter, searchQuery, transcriptMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-[#D8CFF0] max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-6 border-b-2 border-[#D8CFF0] bg-[#F8F6FC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75] shadow-xs shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#292929] tracking-tight">
                  Revisión de Transcripción y Coherencia
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                  Esperando Validación
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A] mt-0.5 truncate max-w-md">
                Vídeo: <strong className="text-[#292929]">{originalFilename || jobId}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[#D8CFF0] hover:bg-white text-gray-400 hover:text-[#292929] transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Banner Informativo */}
        <div className="px-4 sm:px-6 py-3 bg-[#FFFBEB] border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Las correcciones marcadas en <strong className="text-amber-800 uppercase font-black">REVISAR</strong> son deducciones de Claude por contexto: conviene validarlas antes de continuar. Puedes editar cualquier corrección directamente en el recuadro antes de pulsar &quot;Aprobar y continuar&quot;.
          </p>
        </div>

        {/* Filtros y Buscador */}
        <div className="p-4 sm:px-6 border-b border-[#F0EBF8] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#F8F6FC] rounded-xl border border-[#D8CFF0]">
            <button
              type="button"
              onClick={() => setActiveFilter('revisar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'revisar'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Dudosas (REVISAR)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === 'revisar' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {counts.revisar}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('seguro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'seguro'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Seguras</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === 'seguro' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {counts.seguro}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <span>Todas ({counts.total})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar término o motivo..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border-2 border-[#D8CFF0] text-xs text-[#292929] placeholder:text-gray-400 focus:border-[#8E0E75] focus:outline-none"
            />
          </div>
        </div>

        {/* Contenido / Lista de Correcciones */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#FAF8FE]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#D8CFF0] border-t-[#8E0E75]" />
              <p className="text-xs font-bold text-[#8E0E75] uppercase tracking-wider">
                Cargando correcciones de transcripción...
              </p>
            </div>
          ) : filteredCorrections.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4A4A4A] bg-white rounded-xl border-2 border-dashed border-[#D8CFF0] p-6">
              <p className="font-bold text-[#292929]">No hay correcciones que coincidan con el filtro.</p>
              <p className="text-xs mt-1">Prueba a cambiar de pestaña o borrar la búsqueda.</p>
            </div>
          ) : (
            filteredCorrections.map((corr) => {
              const seg = transcriptMap.get(corr.index);
              const isRevisar = corr.level === 'REVISAR';
              const timeDisplay = seg ? formatSecondsToMinutes(seg.start) : '--:--';

              return (
                <div
                  key={corr.index}
                  className={`p-4 rounded-xl border-2 transition-all shadow-2xs ${
                    isRevisar
                      ? 'border-amber-300 bg-white hover:border-amber-400'
                      : 'border-[#D8CFF0] bg-white hover:border-[#8E0E75]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                        #{corr.index}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-[#4A4A4A]">
                        <Clock className="h-3 w-3 text-gray-400" />
                        Minuto {timeDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLevelToggle(corr.index)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-colors ${
                          isRevisar
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        }`}
                        title="Haz clic para alternar entre REVISAR y SEGURO"
                      >
                        {isRevisar ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-amber-700" />
                            <span>REVISAR</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            <span>SEGURO</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreOriginalTranscript(corr.index)}
                        className="text-[11px] font-bold text-gray-500 hover:text-[#8E0E75] inline-flex items-center gap-1 hover:underline cursor-pointer"
                        title="Restaurar lo que oyó Whisper exactamente"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restaurar audio original</span>
                      </button>
                    </div>
                  </div>

                  {/* Comparativa: Lo que oyó Whisper vs Lo que corrigió Claude */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {/* Whisper */}
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Whisper oyó:
                      </span>
                      <p className="text-gray-700 font-medium italic">
                        &quot;{seg?.text || '—'}&quot;
                      </p>
                    </div>

                    {/* Claude corregido (Editable) */}
                    <div className="p-2.5 rounded-lg bg-[#FAF8FE] border-2 border-[#D8CFF0] focus-within:border-[#8E0E75] text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-[#8E0E75] flex items-center gap-1">
                          <FileEdit className="h-3 w-3" />
                          Texto corregido (editable):
                        </span>
                        {!corr.text && (
                          <span className="text-[10px] text-red-600 font-bold">
                            *(subtítulo eliminado)*
                          </span>
                        )}
                      </div>
                      <textarea
                        value={corr.text}
                        onChange={(e) => handleTextChange(corr.index, e.target.value)}
                        rows={2}
                        className="w-full bg-white px-2.5 py-1.5 rounded-md border border-[#D8CFF0] text-xs font-semibold text-[#292929] focus:outline-none focus:border-[#8E0E75] resize-y"
                        placeholder="Escribe la corrección o déjalo vacío para eliminar el subtítulo..."
                      />
                    </div>
                  </div>

                  {/* Justificación de Claude */}
                  {corr.reason && (
                    <div className="mt-2.5 pt-2 border-t border-[#F0EBF8] flex items-start gap-1.5 text-xs text-[#4A4A4A]">
                      <Sparkles className="h-3.5 w-3.5 text-[#8E0E75] shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-[#292929]">Motivo del cambio:</strong> {corr.reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="p-4 sm:p-6 border-t-2 border-[#D8CFF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#4A4A4A] flex items-center gap-2">
            {hasChanges ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                Tienes cambios sin guardar
              </span>
            ) : (
              <span className="text-gray-500">
                Todos los cambios están sincronizados
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving || !hasChanges}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border-2 border-[#D8CFF0] bg-white hover:border-[#8E0E75] hover:bg-[#F8F6FC] disabled:opacity-50 text-xs font-bold text-[#8E0E75] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 border-2 border-[#8E0E75] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Guardar cambios</span>
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {approving ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Aprobando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Aprobar y continuar</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
