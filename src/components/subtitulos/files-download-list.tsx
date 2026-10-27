'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileVideo, 
  FileText, 
  FileCode, 
  Eye, 
  X, 
  Check, 
  Layers,
  Sparkles
} from 'lucide-react';
import { notify } from '@/lib/feedback';

interface FilesDownloadListProps {
  jobId: string;
  files: string[];
  originalFilename?: string;
}

export function FilesDownloadList({ jobId, files, originalFilename }: FilesDownloadListProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  if (!files || files.length === 0) {
    return (
      <p className="text-xs text-[#4A4A4A] italic">
        Aún no hay archivos generados.
      </p>
    );
  }

  const getFileInfo = (filename: string) => {
    if (filename.includes('subtitulado.mp4')) {
      return {
        label: 'Vídeo con subtítulos quemados',
        desc: 'Subtítulos incrustados en la imagen permanentemente',
        badge: 'MP4 · Quemado',
        icon: FileVideo,
        color: 'text-[#8E0E75] bg-[#F8F6FC] border-[#D8CFF0]',
      };
    }
    if (filename.includes('seleccionables.mp4')) {
      return {
        label: 'Vídeo multipista seleccionable',
        desc: 'Vídeo con 2 pistas de subtítulos (destino + original)',
        badge: 'MP4 · Multipista',
        icon: Layers,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      };
    }
    if (filename === 'video.es.srt') {
      return {
        label: 'Subtítulos en Español',
        desc: 'SRT corregido y formateado a máx. 42 chars/línea',
        badge: 'SRT · ES',
        icon: FileText,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (filename === 'video.en.srt') {
      return {
        label: 'Subtítulos en Inglés',
        desc: 'SRT traducido y formateado a máx. 42 chars/línea',
        badge: 'SRT · EN',
        icon: FileText,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
      };
    }
    if (filename === 'video.original.srt') {
      return {
        label: 'Transcripción Whisper Original',
        desc: 'SRT bruto tal como salió del modelo Whisper',
        badge: 'SRT · Whisper',
        icon: FileCode,
        color: 'text-gray-700 bg-gray-50 border-gray-200',
      };
    }
    if (filename === 'revision_cambios.md') {
      return {
        label: 'Informe de revisión y cambios',
        desc: 'Tabla detallada con cada término corregido, minuto y nivel',
        badge: 'MD · Auditoría',
        icon: FileText,
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        canPreview: true,
      };
    }
    return {
      label: filename,
      desc: 'Archivo del proceso',
      badge: filename.split('.').pop()?.toUpperCase() || 'FILE',
      icon: FileText,
      color: 'text-gray-700 bg-gray-50 border-gray-200',
    };
  };

  const handleDownload = (filename: string) => {
    // Descarga directa a través del backend del hub
    const url = `/api/subtitulos/jobs/${encodeURIComponent(jobId)}/files/${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify(`Descargando ${filename}...`, { type: 'info', duration: 2500 });
  };

  const handlePreview = async (filename: string) => {
    setLoadingPreview(true);
    setPreviewTitle(filename);
    try {
      const res = await fetch(
        `/api/subtitulos/jobs/${encodeURIComponent(jobId)}/files/${encodeURIComponent(filename)}`
      );
      if (!res.ok) throw new Error('No se pudo cargar el archivo');
      const text = await res.text();
      setPreviewContent(text);
    } catch (err: any) {
      notify(err.message || 'Error al previsualizar archivo', { type: 'error' });
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((filename) => {
          const info = getFileInfo(filename);
          const Icon = info.icon;

          return (
            <div
              key={filename}
              className="flex flex-col justify-between p-3.5 rounded-xl border-2 border-[#D8CFF0] bg-white hover:border-[#8E0E75] transition-all shadow-2xs group"
            >
              <div className="flex items-start gap-2.5 mb-2.5">
                <div
                  className={`p-2 rounded-lg border shrink-0 ${info.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#292929] truncate block" title={info.label}>
                      {info.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4A4A4A] line-clamp-1 mt-0.5">
                    {info.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0EBF8]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                  {info.badge}
                </span>

                <div className="flex items-center gap-1.5">
                  {info.canPreview && (
                    <button
                      type="button"
                      onClick={() => handlePreview(filename)}
                      className="px-2 py-1 rounded-lg border border-[#D8CFF0] bg-[#F8F6FC] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] text-xs font-bold transition-colors inline-flex items-center gap-1"
                      title="Ver contenido"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Ver</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(filename)}
                    className="px-2.5 py-1 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                    title={`Descargar ${filename}`}
                  >
                    <Download className="h-3 w-3" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Previsualización para Informe MD */}
      {previewContent !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-[#D8CFF0] max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[#D8CFF0] flex items-center justify-between bg-[#F8F6FC]">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#8E0E75]" />
                <h3 className="font-bold text-base text-[#292929]">
                  {previewTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewContent(null)}
                className="p-1 rounded-lg hover:bg-white text-gray-500 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#292929] bg-[#FAF8FE]">
              {previewContent}
            </div>
            <div className="p-4 border-t border-[#D8CFF0] flex justify-end bg-white">
              <button
                type="button"
                onClick={() => handleDownload(previewTitle)}
                className="px-4 py-2 rounded-xl bg-[#8E0E75] text-white font-bold text-xs hover:bg-[#700B5C] inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar informe completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
