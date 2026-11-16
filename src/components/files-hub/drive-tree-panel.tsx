'use client';

import React from 'react';
import {
  Folder,
  FolderLock,
  FolderCheck,
  File as FileIcon,
  Shield,
  HardDrive,
} from 'lucide-react';
import { SimulatedDriveEntry } from '@/types/files-portal';
import { formatBytesCompact } from './file-preview-modal';

interface DriveTreePanelProps {
  tree: SimulatedDriveEntry[];
}

function DriveNode({ node, depth = 0 }: { node: SimulatedDriveEntry; depth?: number }) {
  const isInternalZone = node.name.includes('01_AREA_INTERNA');
  const isClientZone = node.name.includes('02_PORTAL_CLIENTE');
  const isValidatedFolder = node.name.includes('03_Validados') || node.name.includes('01_Entregables_Publicados');

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs ${
          node.kind === 'folder'
            ? isInternalZone
              ? 'bg-[#F8F6FC] border border-[#D8CFF0] font-bold text-[#191654]'
              : isClientZone
              ? 'bg-emerald-50/70 border border-emerald-200 font-bold text-emerald-900'
              : 'bg-white border border-slate-100 font-semibold text-[#292929]'
            : 'bg-white border border-[#EAE4F5] text-[#4A4A4A]'
        }`}
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {node.kind === 'folder' ? (
            isInternalZone ? (
              <FolderLock className="h-4 w-4 text-[#8E0E75] shrink-0" />
            ) : isValidatedFolder || isClientZone ? (
              <FolderCheck className="h-4 w-4 text-[#3BB54A] shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-[#191654] shrink-0" />
            )
          ) : (
            <FileIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}

          <span className="truncate font-mono text-[11px]">{node.name}</span>

          {isInternalZone && (
            <span className="px-1.5 py-0.5 rounded bg-[#191654] text-white text-[9px] font-sans font-black uppercase">
              Privado Equipo
            </span>
          )}
          {isClientZone && (
            <span className="px-1.5 py-0.5 rounded bg-[#3BB54A] text-white text-[9px] font-sans font-black uppercase">
              Aislado Cliente
            </span>
          )}
        </div>

        {node.kind === 'file' && typeof node.sizeBytes === 'number' && (
          <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums">
            {formatBytesCompact(node.sizeBytes)}
          </span>
        )}
        {node.kind === 'folder' && node.children && (
          <span className="text-[10px] font-bold text-slate-400 shrink-0 tabular-nums">
            {node.children.length} elem.
          </span>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <DriveNode key={child.relativePath} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DriveTreePanel({ tree }: DriveTreePanelProps) {
  return (
    <div className="rounded-2xl bg-white border-2 border-[#D8CFF0] p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4F5]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75]">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#191654] uppercase tracking-tight">
              Simulador de Unidad Compartida (Google Drive)
            </h3>
            <p className="text-xs text-[#4A4A4A]">
              Así se organizan y separan físicamente las carpetas al aprobar, rechazar o publicar archivos.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
          <Shield className="h-3.5 w-3.5" />
          <span>Separación física anti-fugas activa</span>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          No hay carpetas creadas todavía en el almacén simulado.
        </p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {tree.map((node) => (
            <DriveNode key={node.relativePath} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

