'use client';

import React from 'react';
import { 
  TrendingUp, 
  SunMedium, 
  CalendarCheck, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { TimeEntry, Company } from '@/types/database';
import { formatMinutes } from '@/lib/utils';

interface EmployeeStatsProps {
  entries: TimeEntry[];
  selectedCompany?: Company;
}

export function EmployeeStats({ entries, selectedCompany }: EmployeeStatsProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Nombre del mes actual en español
  const monthName = now.toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Calcular inicio de semana (Lunes)
  const dayOfWeek = now.getDay(); // 0 es Domingo
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - distanceToMonday);
  mondayDate.setHours(0, 0, 0, 0);

  // ==========================================
  // PLANO 1: HORAS DE TRABAJO GENERALES (GLOBAL)
  // ==========================================
  const todayGeneralMinutes = entries
    .filter((e) => e.work_date === todayStr)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const weekGeneralMinutes = entries
    .filter((e) => {
      const [y, m, d] = e.work_date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      return entryDate >= mondayDate && entryDate <= now;
    })
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const monthGeneralMinutes = entries
    .filter((e) => e.work_date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // Meta diaria orientativa de jornada (8h = 480m)
  const dailyGoalMinutes = 8 * 60;
  const dailyProgressPercent = Math.min(100, Math.round((todayGeneralMinutes / dailyGoalMinutes) * 100));

  // ==========================================
  // PLANO 2: HORAS EN LA EMPRESA SELECCIONADA
  // ==========================================
  const companyEntries = selectedCompany
    ? entries.filter((e) => e.company_id === selectedCompany.id)
    : [];

  const todayCompanyMinutes = companyEntries
    .filter((e) => e.work_date === todayStr)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const weekCompanyMinutes = companyEntries
    .filter((e) => {
      const [y, m, d] = e.work_date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      return entryDate >= mondayDate && entryDate <= now;
    })
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const monthCompanyMinutes = companyEntries
    .filter((e) => e.work_date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // Porcentaje del día y de la semana dedicado a esta empresa
  const todayCompanyPercent = todayGeneralMinutes > 0 
    ? Math.round((todayCompanyMinutes / todayGeneralMinutes) * 100) 
    : 0;

  const weekCompanyPercent = weekGeneralMinutes > 0 
    ? Math.round((weekCompanyMinutes / weekGeneralMinutes) * 100) 
    : 0;

  // Cálculo de cuota si la empresa seleccionada tiene cuota mensual
  const isCuotaClient = selectedCompany?.client_type === 'cuota';
  const quotaHours = selectedCompany?.monthly_hours_quota || 0;
  const quotaMinutes = quotaHours * 60;
  const quotaPercent = quotaMinutes > 0 
    ? Math.round((monthCompanyMinutes / quotaMinutes) * 100) 
    : 0;
  const remainingQuotaMinutes = Math.max(0, quotaMinutes - monthCompanyMinutes);

  return (
    <div className="w-full space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* PLANO HORIZONTAL 1: HORAS DE TRABAJO GENERALES (JORNADA GLOBAL) */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EAE4F5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#191654]"></span>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#191654]">
              PLANO 1: HORAS DE TRABAJO GENERALES <span className="text-[#8E0E75]">(JORNADA GLOBAL)</span>
            </h3>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wider bg-[#F8F6FC] px-2 py-0.5 rounded-sm border border-[#D8CFF0]">
            Suma de todas las empresas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1.1: Horas Trabajadas Hoy */}
          <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-xs transition-all hover:border-[#8E0E75]/60 hover:shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A4A4A]">
                HORAS TRABAJADAS <span className="text-[#8E0E75]">HOY</span>
              </span>
              <div className="p-1.5 rounded-sm bg-amber-50 text-amber-600 border border-amber-200">
                <SunMedium className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#292929] tracking-tight font-mono tabular-nums">
                {formatMinutes(todayGeneralMinutes)}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">/ 8h diaria</span>
            </div>
            
            {/* Barra de progreso de jornada */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A] mb-1 tabular-nums">
                <span className="uppercase tracking-wider">Jornada</span>
                <span className={dailyProgressPercent >= 100 ? 'text-emerald-600 font-extrabold' : dailyProgressPercent >= 40 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'}>
                  {dailyProgressPercent}% completado
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#F8F6FC] rounded-sm overflow-hidden border border-[#D8CFF0]">
                <div
                  className={`h-full transition-all duration-700 ease-out ${
                    dailyProgressPercent >= 100
                      ? 'bg-emerald-500 shadow-xs'
                      : dailyProgressPercent >= 40
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${dailyProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 1.2: Horas de Trabajo Semanal */}
          <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-xs transition-all hover:border-[#8E0E75]/60 hover:shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#191654]"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A4A4A]">
                HORAS DE TRABAJO <span className="text-[#8E0E75]">SEMANAL</span>
              </span>
              <div className="p-1.5 rounded-sm bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#292929] tracking-tight font-mono tabular-nums">
                {formatMinutes(weekGeneralMinutes)}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">Lunes - Domingo</span>
            </div>
            <p className="mt-3 text-xs text-[#4A4A4A] flex items-center gap-1.5">
              <span>Acumulado:</span>
              <strong className="text-[#191654] font-mono tabular-nums font-extrabold">
                {(weekGeneralMinutes / 60).toFixed(1)} horas
              </strong>
              <span>registradas esta semana.</span>
            </p>
          </div>

          {/* Card 1.3: Horas de Trabajo Mensual */}
          <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-xs transition-all hover:border-[#8E0E75]/60 hover:shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#8E0E75]"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A4A4A]">
                HORAS DE TRABAJO <span className="text-[#8E0E75]">MENSUAL</span>
              </span>
              <div className="p-1.5 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#8E0E75] tracking-tight font-mono tabular-nums">
                {formatMinutes(monthGeneralMinutes)}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">{capitalizedMonth}</span>
            </div>
            <p className="mt-3 text-xs text-[#4A4A4A] flex items-center gap-1.5">
              <span>Total computable:</span>
              <strong className="text-[#8E0E75] font-mono tabular-nums font-extrabold">
                {(monthGeneralMinutes / 60).toFixed(1)} horas
              </strong>
              <span>en el mes activo.</span>
            </p>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PLANO HORIZONTAL 2: DEDICACIÓN EN LA EMPRESA SELECCIONADA */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EAE4F5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E0E75] animate-pulse"></span>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#8E0E75]">
              PLANO 2: DEDICACIÓN EN <span className="text-[#191654]">"{selectedCompany?.name || 'EMPRESA SELECCIONADA'}"</span>
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-[#8E0E75] uppercase tracking-wider bg-[#F8F6FC] px-2.5 py-0.5 rounded-sm border border-[#8E0E75]/30">
            <Sparkles className="h-3 w-3" />
            Reactivas al cambiar de empresa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 2.1: Horas Trabajadas Hoy en la Empresa */}
          <div className="relative overflow-hidden rounded-sm border-2 border-[#8E0E75]/30 bg-[#FCFBFD] p-5 shadow-xs transition-all hover:border-[#8E0E75] hover:shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#8E0E75]"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8E0E75] truncate max-w-[200px]">
                HORAS HOY EN {selectedCompany?.name || 'CLIENTE'}
              </span>
              <div className="p-1.5 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#8E0E75] tracking-tight font-mono tabular-nums">
                {formatMinutes(todayCompanyMinutes)}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">imputadas hoy</span>
            </div>
            <p className="mt-3 text-xs text-[#4A4A4A]">
              Representa el <strong className="text-[#8E0E75] font-extrabold tabular-nums">{todayCompanyPercent}%</strong> del tiempo trabajado hoy.
            </p>
          </div>

          {/* Card 2.2: Horas Trabajadas Esta Semana en la Empresa */}
          <div className="relative overflow-hidden rounded-sm border-2 border-[#8E0E75]/30 bg-[#FCFBFD] p-5 shadow-xs transition-all hover:border-[#8E0E75] hover:shadow-sm">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#191654]"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#191654] truncate max-w-[200px]">
                HORAS SEMANA EN {selectedCompany?.name || 'CLIENTE'}
              </span>
              <div className="p-1.5 rounded-sm bg-[#F8F6FC] text-[#191654] border border-[#D8CFF0]">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#191654] tracking-tight font-mono tabular-nums">
                {formatMinutes(weekCompanyMinutes)}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">esta semana</span>
            </div>
            <p className="mt-3 text-xs text-[#4A4A4A]">
              Dedicación: <strong className="text-[#191654] font-extrabold tabular-nums">{weekCompanyPercent}%</strong> del total semanal registrado.
            </p>
          </div>

          {/* Card 2.3: Horas Trabajadas Este Mes en la Empresa (Con control de cuota) */}
          <div className="relative overflow-hidden rounded-sm border-2 border-[#8E0E75]/30 bg-[#FCFBFD] p-5 shadow-xs transition-all hover:border-[#8E0E75] hover:shadow-sm">
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${quotaPercent > 100 ? 'bg-red-500' : quotaPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#065F46] truncate max-w-[200px]">
                HORAS MES EN {selectedCompany?.name || 'CLIENTE'}
              </span>
              <div className={`p-1.5 rounded-sm border ${quotaPercent > 100 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                {quotaPercent > 100 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#065F46] tracking-tight font-mono tabular-nums">
                {formatMinutes(monthCompanyMinutes)}
              </span>
              {isCuotaClient ? (
                <span className="text-xs text-[#4A4A4A] font-medium">/ {quotaHours}h cuota</span>
              ) : (
                <span className="text-xs text-[#4A4A4A] font-medium">acumulado mes</span>
              )}
            </div>

            {/* Progreso de cuota mensual si es cliente cuota */}
            {isCuotaClient ? (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A] mb-1 tabular-nums">
                  <span className="uppercase tracking-wider">Cumplimiento Cuota</span>
                  <span className={quotaPercent > 100 ? 'text-red-600 font-extrabold' : quotaPercent >= 80 ? 'text-amber-600 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                    {quotaPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#F8F6FC] rounded-sm overflow-hidden border border-[#D8CFF0]">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      quotaPercent > 100
                        ? 'bg-red-500'
                        : quotaPercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, quotaPercent)}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px]">
                  {quotaPercent >= 100 ? (
                    <span className="text-emerald-700 font-extrabold">✓ Cuota mensual completada</span>
                  ) : (
                    <span className="text-[#4A4A4A]">
                      Restan <strong className="text-[#8E0E75] font-bold">{formatMinutes(remainingQuotaMinutes)}</strong> de cuota pactada.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#4A4A4A]">
                Cliente puntual: tiempo facturable según horas realizadas.
              </p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
