'use client';

import React, { useState, useRef } from 'react';
import { HostingService } from '@/types/hosting';
import { parseHostingCSV } from '@/lib/hosting-service';
import { notify } from '@/lib/feedback';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface HostingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (services: HostingService[], replaceAll: boolean) => Promise<void>;
}

export function HostingImportModal({
  isOpen,
  onClose,
  onImport,
}: HostingImportModalProps) {
  const [parsed, setParsed] = useState<HostingService[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [replaceAll, setReplaceAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const services = parseHostingCSV(text);
        setParsed(services);
        if (services.length === 0) {
          notify('No se pudieron detectar servicios válidos en el CSV. Comprueba el formato.', { type: 'warning' });
        } else {
          notify(`Se han detectado ${services.length} servicios en el archivo CSV.`, { type: 'success' });
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmImport = async () => {
    if (parsed.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport(parsed, replaceAll);
      notify(`Importación completada: ${parsed.length} servicios procesados.`, { type: 'success' });
      onClose();
    } catch {
      notify('Error al importar los servicios.', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-linear-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                Importar Servicios desde CSV
              </h3>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Compatible con exportaciones de Cdmon, Excel y CSV estándar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {parsed.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 sm:p-10 border-2 border-dashed border-[#D8CFF0] hover:border-[#8E0E75] rounded-2xl bg-[#F8F6FC] text-center cursor-pointer transition-all hover:bg-white space-y-3"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75] shadow-xs">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#292929]">
                  Haz clic aquí para seleccionar el archivo CSV
                </p>
                <p className="text-[11px] text-[#4A4A4A] mt-1">
                  Formatos admitidos: .csv delimitado por punto y coma (;) o comas (,)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      {fileName}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      <strong>{parsed.length}</strong> servicios listos para importar.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsed([]);
                    setFileName('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Opción de reemplazar o fusionar */}
              <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#D8CFF0] space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={!replaceAll}
                    onChange={() => setReplaceAll(false)}
                    className="h-4 w-4 text-[#8E0E75] focus:ring-[#8E0E75]"
                  />
                  <span className="text-xs font-bold text-[#292929]">
                    Añadir / Actualizar (Conservar los servicios existentes)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={replaceAll}
                    onChange={() => setReplaceAll(true)}
                    className="h-4 w-4 text-[#8E0E75] focus:ring-[#8E0E75]"
                  />
                  <span className="text-xs font-bold text-[#292929]">
                    Reemplazar catálogo completo con este archivo
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 sm:p-5 border-t border-[#D8CFF0] bg-[#F8F6FC] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs font-bold text-[#4A4A4A] hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsed.length === 0 || isSubmitting}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 disabled:opacity-50"
          >
            {isSubmitting ? 'Importando...' : `Confirmar Importación (${parsed.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
