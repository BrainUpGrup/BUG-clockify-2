'use client';

import React from 'react';
import {
  X,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  History,
  FolderOpen,
} from 'lucide-react';
import { InternalFileVersion } from '@/types/files-portal';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentUrl: string;
  folderPath?: string;
  versions?: InternalFileVersion[];
}

export function formatBytesCompact(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  title,
  fileName,
  mimeType,
  sizeBytes,
  contentUrl,
  folderPath,
  versions,
}: FilePreviewModalProps) {
  if (!isOpen) return null;

  const lower = (mimeType || '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = lower.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isVideo = lower.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext);
  const isPdf = lower === 'application/pdf' || ext === 'pdf';
  const isText = lower.startsWith('text/') || ['txt', 'csv', 'md', 'json'].includes(ext);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191654]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-[#EEF0F5] border-2 border-[#D8CFF0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera compacta */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-white border border-[#D8CFF0] text-[#8E0E75] shrink-0">
              {isImage ? (
                <ImageIcon className="h-5 w-5" />
              ) : isVideo ? (
                <Film className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[#191654] truncate">
                {title}
              </h3>
              <p className="text-xs text-[#4A4A4A] truncate font-mono">
                {fileName} • {formatBytesCompact(sizeBytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`${contentUrl}?download=1`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-[#8E0E75] hover:bg-white transition-colors cursor-pointer"
              aria-label="Cerrar visor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido en 2 columnas si hay historial o ruta Drive (DM-15 Zero-Scroll, altura <420px) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 max-h-[420px]">
          <div className={`${versions && versions.length > 0 ? 'md:col-span-8' : 'md:col-span-12'} rounded-xl bg-white border-2 border-[#D8CFF0] shadow-xs flex items-center justify-center overflow-hidden h-[340px]`}>
            {isImage && (
              <img
                src={contentUrl}
                alt={title}
                className="max-h-full max-w-full object-contain p-2"
              />
            )}
            {isVideo && (
              <video
                src={contentUrl}
                controls
                className="max-h-full max-w-full rounded-lg"
              />
            )}
            {(isPdf || isText) && (
              <iframe
                src={contentUrl}
                title={title}
                className="w-full h-full bg-white"
              />
            )}
            {!isImage && !isVideo && !isPdf && !isText && (
              <div className="text-center p-6 space-y-2">
                <FileText className="h-10 w-10 text-[#8E0E75] mx-auto" />
                <p className="text-xs font-bold text-[#292929]">
                  Vista previa directa no disponible para formato .{ext || 'binario'}
                </p>
                <a
                  href={`${contentUrl}?download=1`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#191654] text-white text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar archivo original</span>
                </a>
              </div>
            )}
          </div>

          {versions && versions.length > 0 && (
            <div className="md:col-span-4 flex flex-col bg-[#F8F6FC] rounded-xl border border-[#D8CFF0] p-3 h-[340px] overflow-y-auto space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#191654]">
                <History className="h-3.5 w-3.5 text-[#8E0E75]" />
                <span>Historial de Versiones ({versions.length})</span>
              </div>

              {folderPath && (
                <div className="p-2 rounded-lg bg-white border border-[#D8CFF0] text-[10px] font-mono text-[#4A4A4A] break-all">
                  <div className="flex items-center gap-1 font-sans font-bold text-[#191654] mb-0.5">
                    <FolderOpen className="h-3 w-3 text-[#8E0E75]" />
                    <span>Carpeta Drive:</span>
                  </div>
                  {folderPath}
                </div>
              )}

              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg bg-white border border-[#EAE4F5] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#191654] text-white font-mono text-[10px] font-black">
                        v{v.version_number}
                      </span>
                      <a
                        href={`/api/files-hub/content/internal_version/${v.id}?download=1`}
                        className="text-[11px] font-bold text-[#8E0E75] hover:underline inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Bajar</span>
                      </a>
                    </div>
                    <p className="text-[11px] font-semibold text-[#292929] truncate">
                      {v.file_name}
                    </p>
                    {v.change_note && (
                      <p className="text-[11px] text-[#4A4A4A] leading-tight">
                        {v.change_note}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {v.uploaded_by_name} • {new Date(v.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

