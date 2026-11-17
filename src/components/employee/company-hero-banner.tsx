'use client';

import React from 'react';
import { AlertCircle, Building2, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { Company } from '@/types/database';
import { AppSelect } from '@/components/ui/app-select';
import { CompanyLogo } from '@/components/ui/company-logo';

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

  const selectOptions = [
    { value: '', label: 'Sin empresa' },
    ...activeCompanies.map((c) => ({
      value: c.id,
      label:
        c.client_type === 'cuota'
          ? `${c.name} [Cuota: ${c.monthly_hours_quota}h]`
          : `${c.name} [Puntual]`,
      icon: <CompanyLogo company={c} size="sm" />,
    })),
  ];

  const hasCompany = !!selectedCompany;

  return (
    <div
      className={`w-full relative rounded-3xl border-2 p-6 sm:p-8 lg:p-10 shadow-md transition-all ${
        hasCompany
          ? 'border-[#8E0E75] bg-gradient-to-r from-[#E3D2EB] via-[#D5BCE3] to-[#E3D2EB] shadow-[#8E0E75]/10'
          : 'border-[#D8CFF0] bg-gradient-to-r from-[#F8F6FC] via-white to-[#F8F6FC] shadow-slate-200/40'
      }`}
    >
      {/* Badge flotante superior de cliente fijado / sin empresa */}
      <div
        className={`absolute -top-3.5 left-8 flex items-center gap-1.5 text-white text-xs sm:text-sm font-black uppercase tracking-tight px-4 py-1 rounded-full shadow-md ${
          hasCompany ? 'bg-[#8E0E75]' : 'bg-[#191654]'
        }`}
      >
        {hasCompany ? (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Cliente Activo (Fijado)</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
            <span>Sin Cliente Fijado</span>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2 sm:pt-0">
        
        {/* Lado izquierdo: Hueco para Logo + Nombre Gigante + Cuota o Aviso de Selección */}
        <div className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0">
          
          {/* HUECO PARA EL LOGO (Marco sólido corporativo a juego con el contenedor principal) */}
          <div
            className={`relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl border-2 bg-white flex flex-col items-center justify-center p-2 shadow-xs transition-all group ${
              hasCompany
                ? 'border-[#8E0E75]'
                : 'border-[#D8CFF0] hover:border-[#8E0E75]'
            }`}
          >
            {selectedCompany?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCompany.logo_url}
                alt={selectedCompany.name}
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Building2 className={`h-8 w-8 ${hasCompany ? 'text-[#8E0E75]/70' : 'text-slate-400'}`} />
                <span
                  className={`text-[11px] font-black uppercase tracking-tight leading-none mt-1 ${
                    hasCompany ? 'text-[#8E0E75]' : 'text-slate-400'
                  }`}
                >
                  {hasCompany ? 'LOGO' : 'VACÍO'}
                </span>
              </div>
            )}
          </div>

          {/* Nombre de la Empresa y tipo de cuota, o aviso de selección obligatoria */}
          <div className="min-w-0 flex-1">
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight truncate leading-tight ${
                hasCompany ? 'text-[#191654]' : 'text-[#4A4A4A]'
              }`}
            >
              {selectedCompany?.name || 'Sin empresa'}
            </h2>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {hasCompany ? (
                selectedCompany.client_type === 'cuota' ? (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border-2 border-emerald-300 text-emerald-800 text-xs sm:text-sm font-extrabold uppercase tracking-tight shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Cuota Mensual: {selectedCompany.monthly_hours_quota}h Pactadas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border-2 border-slate-300 text-[#4A4A4A] text-xs sm:text-sm font-extrabold uppercase tracking-tight shadow-2xs">
                    <Shield className="h-4 w-4 text-[#4A4A4A]" />
                    Cliente Puntual
                  </span>
                )
              ) : (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-50 border-2 border-amber-300 text-[#191654] text-xs sm:text-sm font-extrabold shadow-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Selecciona un cliente para poder comenzar a contabilizar las horas por cliente
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Selector compacto para cambiar de cliente */}
        <div
          className={`sm:w-80 lg:w-96 shrink-0 border-t sm:border-t-0 sm:border-l-2 pt-4 sm:pt-0 sm:pl-6 ${
            hasCompany ? 'border-[#8E0E75]/25' : 'border-[#D8CFF0]'
          }`}
        >
          <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-tight text-[#8E0E75] mb-2 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-[#8E0E75]" />
            <span>{hasCompany ? 'Cambiar Cliente:' : 'Seleccionar Cliente:'}</span>
          </label>
          <AppSelect
            value={selectedCompanyId}
            onChange={onSelectCompany}
            disabled={disabled}
            placeholder="Sin empresa"
            ariaLabel="Seleccionar cliente"
            searchable
            icon={!hasCompany ? <Building2 className="h-4 w-4 text-[#8E0E75]" /> : undefined}
            options={selectOptions}
            className="w-full text-sm sm:text-base font-bold"
          />
        </div>

      </div>
    </div>
  );
}
