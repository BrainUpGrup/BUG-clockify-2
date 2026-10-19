'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Archive, 
  Layers,
  Clock,
  Tag,
  Mail,
  User,
  FileSpreadsheet
} from 'lucide-react';
import { Company, TimeEntry, ClientType } from '@/types/database';
import { confirmDialog } from '@/lib/feedback';

interface CompanyCrudProps {
  companies: Company[];
  entries: TimeEntry[];
  onCreateCompany: (
    name: string,
    clientType: ClientType,
    quotaHours: number | null,
    cif?: string,
    contactName?: string,
    contactEmail?: string
  ) => Promise<void>;
  onToggleCompanyStatus: (id: string, currentStatus: boolean) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

export function CompanyCrud({
  companies,
  entries,
  onCreateCompany,
  onToggleCompanyStatus,
  onDeleteCompany,
}: CompanyCrudProps) {
  const [newCompanyName, setNewCompanyName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('cuota');
  const [monthlyQuota, setMonthlyQuota] = useState<string>('15');
  const [cif, setCif] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    setIsCreatingCompany(true);
    try {
      const quota = clientType === 'cuota' ? parseFloat(monthlyQuota) || 15 : null;
      await onCreateCompany(
        newCompanyName.trim(),
        clientType,
        quota,
        cif.trim() || undefined,
        contactName.trim() || undefined,
        contactEmail.trim() || undefined
      );
      setNewCompanyName('');
      setMonthlyQuota('15');
      setCif('');
      setContactName('');
      setContactEmail('');
      setShowAdvanced(false);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Formulario de Alta de Empresa / Cliente con Datos Detallados */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold uppercase tracking-tight text-base text-[#292929]">
              DAR DE ALTA <span className="text-[#8E0E75]">EMPRESA / CLIENTE</span>
            </h3>
            <p className="text-xs text-[#4A4A4A] font-light">
              Configura el tipo de cliente (cuota mensual o trabajos puntuales) e información fiscal y de contacto oficial.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Nombre de la empresa */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Nombre de la Empresa / Cliente
              </label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="ej. BrandStudio SL, InnovaTech..."
                className="w-full px-4 py-2.5 rounded-sm border border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                required
              />
            </div>

            {/* Selector de Tipo de Cliente (Cuota vs Puntual) */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Tipo de Relación Comercial
              </label>
              <div className="flex items-center rounded-sm bg-[#F8F6FC] p-1 border border-[#D8CFF0]">
                <button
                  type="button"
                  onClick={() => setClientType('cuota')}
                  className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                    clientType === 'cuota'
                      ? 'bg-[#8E0E75] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#8E0E75]'
                  }`}
                >
                  Cliente Cuota
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('puntual')}
                  className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                    clientType === 'puntual'
                      ? 'bg-[#191654] text-white shadow-xs'
                      : 'text-[#4A4A4A] hover:text-[#191654]'
                  }`}
                >
                  Cliente Puntual
                </button>
              </div>
            </div>

            {/* Input de Cuota Mensual (Solo si es Cliente Cuota) */}
            <div className="md:col-span-3">
              {clientType === 'cuota' ? (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                    Cuota Mensual (Horas)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={monthlyQuota}
                      onChange={(e) => setMonthlyQuota(e.target.value)}
                      placeholder="ej. 15"
                      className="w-full px-3 py-2 rounded-sm border border-[#D8CFF0] bg-white text-sm font-extrabold font-mono tabular-nums text-[#8E0E75] focus:border-[#8E0E75] outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4A4A4A]">
                      h / mes
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#4A4A4A] italic py-2.5">
                  Sin cuota fija pactada (por tarea)
                </div>
              )}
            </div>
          </div>

          {/* Botón para desplegar campos opcionales de información detallada */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-[#8E0E75] hover:text-[#700B5C] uppercase tracking-wider cursor-pointer"
            >
              {showAdvanced ? '▲ Ocultar datos de contacto y CIF' : '▼ Añadir CIF y persona de contacto (opcional)'}
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  NIF / CIF
                </label>
                <input
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  placeholder="ej. B-87654321"
                  className="w-full px-3 py-2 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="ej. Laura Gómez (Dir. Marketing)"
                  className="w-full px-3 py-2 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] mb-1">
                  Email de Contacto
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ej. contacto@empresa.com"
                  className="w-full px-3 py-2 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] focus:border-[#8E0E75] outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isCreatingCompany || !newCompanyName.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#8E0E75]/25 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isCreatingCompany ? 'Creando...' : 'Guardar Empresa'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Listado Líquido de Empresas */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex items-center justify-between">
          <div>
            <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
              EMPRESAS Y CLIENTES <span className="text-[#8E0E75]">REGISTRADOS</span> ({companies.length})
            </h4>
            <p className="text-xs text-[#4A4A4A] font-light">
              Clientes cuota con control al milímetro y clientes de servicios puntuales
            </p>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#4A4A4A]">
            No hay empresas registradas todavía. Añade la primera arriba.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-wider border-b border-[#D8CFF0]">
                <tr>
                  <th className="px-6 py-3.5">Empresa / Cliente</th>
                  <th className="px-6 py-3.5 text-center">Tipo de Cliente</th>
                  <th className="px-6 py-3.5 text-center">Cuota Pactada</th>
                  <th className="px-6 py-3.5 text-center">Contacto / CIF</th>
                  <th className="px-6 py-3.5 text-center">Estado</th>
                  <th className="px-6 py-3.5 text-center">Horas Imputadas</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4F5]">
                {companies.map((company) => {
                  const companyEntries = entries.filter((e) => e.company_id === company.id);
                  const totalCompanyMinutes = companyEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

                  return (
                    <tr key={company.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#8E0E75]" />
                          <div>
                            <span className="font-bold text-sm text-[#292929] block">{company.name}</span>
                            {company.cif && (
                              <span className="text-[11px] text-[#4A4A4A] font-mono block">CIF: {company.cif}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[11px] font-extrabold uppercase tracking-wider border ${
                            company.client_type === 'cuota'
                              ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                              : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                          }`}
                        >
                          {company.client_type === 'cuota' ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Cuota</span>
                            </>
                          ) : (
                            <>
                              <Tag className="h-3 w-3" />
                              <span>Puntual</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono tabular-nums font-extrabold text-xs">
                        {company.client_type === 'cuota' && company.monthly_hours_quota
                          ? `${company.monthly_hours_quota}h / mes`
                          : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-center text-[11px] text-[#4A4A4A]">
                        {company.contact_name ? (
                          <div>
                            <span className="font-medium text-[#292929] block">{company.contact_name}</span>
                            {company.contact_email && (
                              <span className="text-[11px] text-slate-500 font-mono block">{company.contact_email}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No especificado</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[11px] font-extrabold uppercase tracking-wider border ${
                            company.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-700 border-red-300'
                          }`}
                        >
                          {company.is_active ? 'Activa' : 'Archivada'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono tabular-nums font-bold text-[#8E0E75]">
                        {(totalCompanyMinutes / 60).toFixed(1)} hrs ({companyEntries.length} reg.)
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleCompanyStatus(company.id, company.is_active)}
                            className="p-1.5 rounded-sm border border-[#D8CFF0] bg-white text-[#4A4A4A] hover:bg-[#F8F6FC] hover:text-[#8E0E75] transition-colors cursor-pointer"
                            title={company.is_active ? 'Archivar Empresa' : 'Reactivar Empresa'}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: `¿Eliminar la empresa "${company.name}"?`,
                                message: 'Solo es posible si no tiene horas registradas. Si las tiene, archívala.',
                                confirmLabel: 'Eliminar',
                                danger: true,
                              });
                              if (ok) onDeleteCompany(company.id);
                            }}
                            aria-label={`Eliminar empresa ${company.name}`}
                            className="p-1.5 rounded-sm border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Eliminar Empresa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
