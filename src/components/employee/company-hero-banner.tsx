'use client';

import React from 'react';
import { Building2, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { Company } from '@/types/database';
import { AppSelect } from '@/components/ui/app-select';

interface CompanyHeroBannerProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  disabled?: boolean;
}

export function CompanyHeroBanner({
  companies,
  selectedCompanyId,
  onSelectCompany,
  disabled = false,
}: CompanyHeroBannerProps) {
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const activeCompanies = companies.filter((c) => c.is_active);

  const selectOptions = activeCompanies.map((c) => ({
    value: c.id,
    label:
      c.client_type === 'cuota'
        ? `${c.name} [Cuota: ${c.monthly_hours_quota}h]`
        : `${c.name} [Puntual]`,
  }));

  return (
    <div className="w-full relative rounded-2xl border-2 border-[#8E0E75] bg-gradient-to-r from-[#F5EDF6] via-[#EFE2F0] to-[#F5EDF6] p-3.5 sm:p-4 shadow-sm transition-all">
      {/* Badge flotante superior de cliente fijado */}
      <div className="absolute -top-2.5 left-5 flex items-center gap-1 bg-[#8E0E75] text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
        <Sparkles className="h-2.5 w-2.5" />
        <span>Cliente Activo (Fijado)</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 sm:pt-0">
        
        {/* Lado izquierdo: Hueco para Logo + Nombre Gigante + Cuota */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          
          {/* HUECO PARA EL LOGO (Listo para logo real o icono representativo) */}
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl border-2 border-dashed border-[#8E0E75]/40 bg-white flex flex-col items-center justify-center p-1 shadow-xs transition-all group hover:border-[#8E0E75]">
            {selectedCompany?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCompany.logo_url}
                alt={selectedCompany.name}
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Building2 className="h-5 w-5 text-[#8E0E75]/70" />
                <span className="text-[7.5px] font-black uppercase tracking-wider text-[#8E0E75] leading-none mt-0.5">
                  LOGO
                </span>
              </div>
            )}
          </div>

          {/* Nombre de la Empresa y tipo de cuota (SIN CIF NI RESPONSABLE PARA EMPLEADOS) */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#191654] truncate leading-tight">
              {selectedCompany?.name || 'Selecciona una Empresa'}
            </h2>

            <div className="flex items-center gap-2 mt-1">
              {selectedCompany?.client_type === 'cuota' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/95 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Cuota Mensual: {selectedCompany.monthly_hours_quota}h Pactadas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/95 border border-slate-300 text-[#4A4A4A] text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                  <Shield className="h-3 w-3 text-[#4A4A4A]" />
                  Cliente Puntual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Selector compacto para cambiar de cliente */}
        <div className="sm:w-72 shrink-0 border-t sm:border-t-0 sm:border-l border-[#8E0E75]/25 pt-2 sm:pt-0 sm:pl-4">
          <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-[#8E0E75] mb-1">
            Cambiar Cliente:
          </label>
          <AppSelect
            value={selectedCompanyId}
            onChange={onSelectCompany}
            disabled={disabled}
            placeholder="Selecciona cliente..."
            icon={<Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />}
            options={selectOptions}
            className="w-full text-xs font-bold bg-white"
          />
        </div>

      </div>
    </div>
  );
}
