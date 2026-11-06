'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  Clock, 
  Tag, 
  AlertCircle,
  Building2
} from 'lucide-react';
import { ParsedCompanyItem, parseCompanyCSV, downloadCompanyCSVTemplate } from '@/lib/company-csv-service';
import { notify } from '@/lib/feedback';

interface CompanyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (companies: ParsedCompanyItem[], replaceAll: boolean) => Promise<void>;
}

export function CompanyImportModal({
  isOpen,
  onClose,
  onImport,
}: CompanyImportModalProps) {
  const [parsed, setParsed] = useState<ParsedCompanyItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [replaceAll, setReplaceAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setParsed([]);
      setFileName('');
      setReplaceAll(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const companies = parseCompanyCSV(text);
        setParsed(companies);
        if (companies.length === 0) {
          notify('No se detectaron empresas válidas en el CSV. Asegúrate de incluir la columna de Nombre de la Empresa.', { type: 'warning' });
        } else {
          notify(`Se han detectado ${companies.length} empresas listas para importar.`, { type: 'success' });
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
      onClose();
    } catch {
      notify('Error al procesar la importación masiva.', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-import-title"
      >
        {/* Cabecera Corporativa "La Abuela" */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-purple-200" />
            </div>
            <div>
              <h3 id="company-import-title" className="text-base font-black uppercase tracking-tight text-white">
                Importar Empresas y Clientes (CSV)
              </h3>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Carga masiva con detección automática de cuotas, CIF y contactos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido Desplazable Confinado */}
        <div className="p-6 space-y-4 overflow-y-auto font-sans flex-1">
          {/* Banner con Descarga de Plantilla Oficial */}
          <div className="p-4 rounded-2xl bg-[#F8F6FC] border-2 border-[#D8CFF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white text-[#8E0E75] border border-[#D8CFF0] shrink-0 mt-0.5">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#292929]">
                    Plantilla Oficial de Importación
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/20">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-[#4A4A4A] mt-0.5 leading-relaxed">
                  Descarga nuestro CSV oficial con columnas estándar y ejemplos para organizar tus clientes en Excel.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadCompanyCSVTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#8E0E75] text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-2xs cursor-pointer shrink-0"
              title="Descargar plantilla .CSV para rellenar en Excel"
            >
              <Download className="h-4 w-4" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

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
              className="p-8 sm:p-10 border-2 border-dashed border-[#D8CFF0] hover:border-[#8E0E75] rounded-2xl bg-[#F8F6FC] text-center cursor-pointer transition-all hover:bg-white space-y-3 group"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-[#D8CFF0] group-hover:border-[#8E0E75] flex items-center justify-center text-[#8E0E75] shadow-xs transition-colors">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#292929] group-hover:text-[#8E0E75] transition-colors">
                  Haz clic aquí para seleccionar tu archivo CSV
                </p>
                <p className="text-[11px] text-[#4A4A4A] mt-1">
                  Formatos admitidos: .csv delimitado por punto y coma (;) o comas (,)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen del Archivo Detectado */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      {fileName}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      <strong>{parsed.length}</strong> empresas válidas detectadas y listas para importar.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsed([]);
                    setFileName('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer underline"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Vista Previa de Empresas Detectadas (primeros registros) */}
              <div className="rounded-2xl border border-[#D8CFF0] overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-2 bg-[#F8F6FC] border-b border-[#D8CFF0] flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#292929]">
                  <span>Vista Previa de Empresas ({Math.min(parsed.length, 5)} de {parsed.length})</span>
                  <span className="text-[11px] font-bold text-[#8E0E75]">
                    {parsed.filter((p) => p.client_type === 'cuota').length} Cuota &middot; {parsed.filter((p) => p.client_type === 'puntual').length} Puntuales
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FAF8FE] text-[#4A4A4A] font-bold border-b border-[#EAE4F5]">
                      <tr>
                        <th className="px-3 py-2">Empresa</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-center">Cuota</th>
                        <th className="px-3 py-2">CIF</th>
                        <th className="px-3 py-2">Contacto</th>
                        <th className="px-3 py-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4F5]">
                      {parsed.slice(0, 5).map((comp, idx) => (
                        <tr key={idx} className="hover:bg-[#F8F6FC]">
                          <td className="px-3 py-2 font-bold text-[#292929]">
                            {comp.name}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                comp.client_type === 'cuota'
                                  ? 'bg-[#8E0E75]/10 text-[#8E0E75]'
                                  : 'bg-[#191654]/10 text-[#191654]'
                              }`}
                            >
                              {comp.client_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono tabular-nums font-bold text-[#8E0E75]">
                            {comp.client_type === 'cuota' && comp.monthly_hours_quota
                              ? `${comp.monthly_hours_quota}h`
                              : '-'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {comp.cif || '-'}
                          </td>
                          <td className="px-3 py-2 text-[#4A4A4A] truncate max-w-[120px]">
                            {comp.contact_name || comp.contact_email || '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                comp.is_active
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {comp.is_active ? 'Activa' : 'Archivada'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modo de Importación */}
              <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#D8CFF0] space-y-2.5">
                <p className="text-xs font-black uppercase tracking-wider text-[#292929]">
                  Modo de Importación
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="companyImportMode"
                    checked={!replaceAll}
                    onChange={() => setReplaceAll(false)}
                    className="h-4 w-4 mt-0.5 text-[#8E0E75] focus:ring-[#8E0E75]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#292929] block">
                      Añadir y Actualizar (Recomendado)
                    </span>
                    <span className="text-[11px] text-[#4A4A4A] block">
                      Conserva las empresas existentes, añade las nuevas del CSV y actualiza cuotas/contactos de las que ya existan.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="companyImportMode"
                    checked={replaceAll}
                    onChange={() => setReplaceAll(true)}
                    className="h-4 w-4 mt-0.5 text-[#8E0E75] focus:ring-[#8E0E75]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#292929] block">
                      Reemplazar catálogo completo
                    </span>
                    <span className="text-[11px] text-amber-700 block">
                      Reemplaza todas las empresas sin registros de horas por las del archivo CSV (las que tengan horas se conservarán por seguridad).
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Pie con Acciones */}
        <div className="p-4 sm:p-5 border-t border-[#D8CFF0] bg-[#F8F6FC] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-[#D8CFF0] bg-white text-xs font-extrabold uppercase tracking-wider text-[#4A4A4A] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsed.length === 0 || isSubmitting}
            onClick={handleConfirmImport}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Confirmar Importación ({parsed.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
