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
    <div className="w-full relative rounded-3xl border-3 border-[#8E0E75] bg-gradient-to-r from-[#F5EDF6] via-[#EFE2F0] to-[#F5EDF6] p-6 sm:p-8 lg:p-10 shadow-md transition-all">
      {/* Badge flotante superior de cliente fijado */}
      <div className="absolute -top-3.5 left-8 flex items-center gap-1.5 bg-[#8E0E75] text-white text-xs sm:text-sm font-black uppercase tracking-tight px-4 py-1 rounded-full shadow-md">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Cliente Activo (Fijado)</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2 sm:pt-0">
        
        {/* Lado izquierdo: Hueco para Logo + Nombre Gigante + Cuota */}
        <div className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0">
          
          {/* HUECO PARA EL LOGO (Listo para logo real o icono representativo) */}
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl border-2 border-dashed border-[#8E0E75]/40 bg-white flex flex-col items-center justify-center p-2 shadow-xs transition-all group hover:border-[#8E0E75]">
            {selectedCompany?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCompany.logo_url}
                alt={selectedCompany.name}
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Building2 className="h-8 w-8 text-[#8E0E75]/70" />
                <span className="text-[11px] font-black uppercase tracking-tight text-[#8E0E75] leading-none mt-1">
                  LOGO
                </span>
              </div>
            )}
          </div>

          {/* Nombre de la Empresa y tipo de cuota (SIN CIF NI RESPONSABLE PARA EMPLEADOS) */}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#191654] truncate leading-tight">
              {selectedCompany?.name || 'Selecciona una Empresa'}
            </h2>

            <div className="flex items-center gap-3 mt-2">
              {selectedCompany?.client_type === 'cuota' ? (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border-2 border-emerald-300 text-emerald-800 text-xs sm:text-sm font-extrabold uppercase tracking-tight shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Cuota Mensual: {selectedCompany.monthly_hours_quota}h Pactadas
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border-2 border-slate-300 text-[#4A4A4A] text-xs sm:text-sm font-extrabold uppercase tracking-tight shadow-2xs">
                  <Shield className="h-4 w-4 text-[#4A4A4A]" />
                  Cliente Puntual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Selector compacto para cambiar de cliente */}
        <div className="sm:w-80 lg:w-96 shrink-0 border-t sm:border-t-0 sm:border-l-2 border-[#8E0E75]/25 pt-4 sm:pt-0 sm:pl-6">
          <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-tight text-[#8E0E75] mb-2 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-[#8E0E75]" />
            <span>Cambiar Cliente:</span>
          </label>
          <AppSelect
            value={selectedCompanyId}
            onChange={onSelectCompany}
            disabled={disabled}
            placeholder="Selecciona cliente..."
            ariaLabel="Cambiar cliente"
            searchable
            icon={<Building2 className="h-4 w-4 text-[#8E0E75]" />}
            options={selectOptions}
            className="w-full text-sm sm:text-base font-bold bg-white"
          />
        </div>

      </div>
    </div>
  );
}
