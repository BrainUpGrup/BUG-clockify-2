'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Users, 
  Building2, 
  Calendar, 
  Search,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Company, Profile, TimeEntry } from '@/types/database';
import { formatMinutes } from '@/lib/utils';
import { 
  exportGeneralReportToPDF,
  exportGeneralReportToExcel,
  exportCompanyReportToPDF,
  exportCompanyReportToExcel,
  exportEmployeeReportToPDF,
  exportEmployeeReportToExcel,
} from '@/lib/export-reports';
import { AppSelect } from '@/components/ui/app-select';

interface MonthlyReportsProps {
  entries: TimeEntry[];
  companies: Company[];
  employees: Profile[];
}

const MONTHS = [
  { value: 1, name: 'Enero' },
  { value: 2, name: 'Febrero' },
  { value: 3, name: 'Marzo' },
  { value: 4, name: 'Abril' },
  { value: 5, name: 'Mayo' },
  { value: 6, name: 'Junio' },
  { value: 7, name: 'Julio' },
  { value: 8, name: 'Agosto' },
  { value: 9, name: 'Septiembre' },
  { value: 10, name: 'Octubre' },
  { value: 11, name: 'Noviembre' },
  { value: 12, name: 'Diciembre' },
];

export function MonthlyReports({
  entries,
  companies,
  employees,
}: MonthlyReportsProps) {
  // Pestaña de perspectiva estadística: 'general' | 'company' | 'employee'
  const [statsView, setStatsView] = useState<'general' | 'company' | 'employee'>('general');

  // Filtros temporales
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Filtro de empresa específica para la vista por empresa
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || 'all');
  
  // Filtro de empleado específico para la vista por empleado
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || 'all');

  // Buscador de tareas / texto
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Nombre del mes para etiquetas y exportaciones
  const monthName = useMemo(() => {
    return MONTHS.find((m) => m.value === selectedMonth)?.name || `Mes ${selectedMonth}`;
  }, [selectedMonth]);

  // Entradas de tiempo filtradas por el mes y año seleccionados
  const monthEntries = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return entries.filter((e) => e.work_date.startsWith(monthPrefix));
  }, [entries, selectedMonth, selectedYear]);

  // Cálculos globales de la agencia para el mes
  const generalStats = useMemo(() => {
    const totalMinutes = monthEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
    const cuotaMinutes = monthEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMinutes = monthEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);

    // Estado de cuotas de empresas cliente
    const cuotaCompanies = companies.filter((c) => c.client_type === 'cuota');
    let faltanCount = 0;
    let sobranCount = 0;
    let exactoCount = 0;

    const quotasBreakdown = cuotaCompanies.map((company) => {
      const compEntries = monthEntries.filter((e) => e.company_id === company.id);
      const compCuotaMin = compEntries
        .filter((e) => e.compute_type === 'cuota')
        .reduce((sum, e) => sum + e.duration_minutes, 0);
      const compPuntualMin = compEntries
        .filter((e) => e.compute_type === 'puntual')
        .reduce((sum, e) => sum + e.duration_minutes, 0);
      const targetMin = (company.monthly_hours_quota || 0) * 60;
      const deltaMin = compCuotaMin - targetMin;

      if (deltaMin < 0) faltanCount++;
      else if (deltaMin > 0) sobranCount++;
      else exactoCount++;

      return {
        company,
        targetMin,
        cuotaMin: compCuotaMin,
        puntualMin: compPuntualMin,
        totalMin: compCuotaMin + compPuntualMin,
        deltaMin,
        percent: targetMin > 0 ? (compCuotaMin / targetMin) * 100 : 0,
      };
    });

    return {
      totalMinutes,
      cuotaMinutes,
      puntualMinutes,
      faltanCount,
      sobranCount,
      exactoCount,
      quotasBreakdown,
    };
  }, [monthEntries, companies]);

  // Empresa seleccionada actualmente
  const currentCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  // Entradas de la empresa seleccionada
  const companyEntries = useMemo(() => {
    if (!currentCompany) return [];
    return monthEntries.filter((e) => e.company_id === currentCompany.id);
  }, [monthEntries, currentCompany]);

  // Estadísticas de la empresa seleccionada
  const currentCompanyStats = useMemo(() => {
    if (!currentCompany) return null;
    const cuotaMin = companyEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = companyEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const targetMin = (currentCompany.monthly_hours_quota || 0) * 60;
    const deltaMin = cuotaMin - targetMin;

    // Empleados que han participado en esta empresa
    const empMap = new Map<string, { employee: Profile; minutes: number; cuotaMin: number; puntualMin: number }>();
    companyEntries.forEach((e) => {
      const emp = e.profile || employees.find((p) => p.id === e.user_id);
      if (!emp) return;
      if (!empMap.has(emp.id)) {
        empMap.set(emp.id, { employee: emp, minutes: 0, cuotaMin: 0, puntualMin: 0 });
      }
      const item = empMap.get(emp.id)!;
      item.minutes += e.duration_minutes;
      if (e.compute_type === 'cuota') item.cuotaMin += e.duration_minutes;
      else item.puntualMin += e.duration_minutes;
    });

    return {
      cuotaMin,
      puntualMin,
      totalMin: cuotaMin + puntualMin,
      targetMin,
      deltaMin,
      workers: Array.from(empMap.values()),
    };
  }, [currentCompany, companyEntries, employees]);

  // Empleado seleccionado actualmente
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  }, [employees, selectedEmployeeId]);

  // Entradas del empleado seleccionado
  const employeeEntries = useMemo(() => {
    if (!currentEmployee) return [];
    return monthEntries.filter((e) => e.user_id === currentEmployee.id);
  }, [monthEntries, currentEmployee]);

  // Estadísticas del empleado seleccionado
  const currentEmployeeStats = useMemo(() => {
    if (!currentEmployee) return null;
    const totalMin = employeeEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
    const cuotaMin = employeeEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = employeeEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);

    // Empresas para las que ha trabajado el empleado
    const compMap = new Map<string, { companyName: string; isCuota: boolean; minutes: number }>();
    employeeEntries.forEach((e) => {
      const comp = e.company || companies.find((c) => c.id === e.company_id);
      const name = comp?.name || 'General';
      const isCuota = comp?.client_type === 'cuota';
      if (!compMap.has(name)) {
        compMap.set(name, { companyName: name, isCuota, minutes: 0 });
      }
      compMap.get(name)!.minutes += e.duration_minutes;
    });

    return {
      totalMin,
      cuotaMin,
      puntualMin,
      companyBreakdown: Array.from(compMap.values()).sort((a, b) => b.minutes - a.minutes),
    };
  }, [currentEmployee, employeeEntries, companies]);

  // Handlers de exportación según la vista activa
  const handleExportPDF = async () => {
    if (statsView === 'general') {
      await exportGeneralReportToPDF({
        monthName,
        year: selectedYear,
        companies,
        employees,
        entries: monthEntries,
      });
    } else if (statsView === 'company' && currentCompany) {
      await exportCompanyReportToPDF(currentCompany, {
        monthName,
        year: selectedYear,
        entries: monthEntries,
      });
    } else if (statsView === 'employee' && currentEmployee) {
      await exportEmployeeReportToPDF(currentEmployee, {
        monthName,
        year: selectedYear,
        entries: monthEntries,
      });
    }
  };

  const handleExportExcel = () => {
    if (statsView === 'general') {
      exportGeneralReportToExcel({
        monthName,
        year: selectedYear,
        companies,
        employees,
        entries: monthEntries,
      });
    } else if (statsView === 'company' && currentCompany) {
      exportCompanyReportToExcel(currentCompany, {
        monthName,
        year: selectedYear,
        entries: monthEntries,
      });
    } else if (statsView === 'employee' && currentEmployee) {
      exportEmployeeReportToExcel(currentEmployee, {
        monthName,
        year: selectedYear,
        entries: monthEntries,
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Panel Superior: Selector de Perspectiva Estadística y Filtros de Fecha */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-[#EAE4F5] gap-4">
          {/* Pestañas de las 3 Perspectivas de Estadísticas */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-lg bg-[#F8F6FC] border-2 border-[#D8CFF0] shadow-2xs">
            <button
              type="button"
              onClick={() => setStatsView('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm uppercase tracking-tight font-extrabold transition-all cursor-pointer ${
                statsView === 'general'
                  ? 'bg-[#8E0E75] text-white shadow-sm'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Estadísticas Generales</span>
            </button>
            <button
              type="button"
              onClick={() => setStatsView('company')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm uppercase tracking-tight font-extrabold transition-all cursor-pointer ${
                statsView === 'company'
                  ? 'bg-[#8E0E75] text-white shadow-sm'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Por Empresa / Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setStatsView('employee')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm uppercase tracking-tight font-extrabold transition-all cursor-pointer ${
                statsView === 'employee'
                  ? 'bg-[#8E0E75] text-white shadow-sm'
                  : 'text-[#4A4A4A] hover:text-[#8E0E75]'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Por Empleado</span>
            </button>
          </div>

          {/* Botones de Exportación Personalizados por Vista (Grandes y Visuales) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md border-2 border-[#8E0E75] bg-white text-[#8E0E75] text-xs sm:text-sm font-extrabold uppercase tracking-tight hover:bg-[#8E0E75] hover:text-white active:scale-95 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
              title="Descargar informe en plantilla PDF nativa con gráficos"
            >
              <FileText className="h-4 w-4" />
              <span>
                {statsView === 'general' ? 'PDF General' : statsView === 'company' ? 'PDF Cliente' : 'PDF Empleado'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#3BB54A] text-white text-xs sm:text-sm font-extrabold uppercase tracking-tight hover:bg-[#32993E] active:scale-95 shadow-md shadow-[#3BB54A]/30 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
              title="Descargar plantilla Excel estructurada con sentido humano"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>
                {statsView === 'general' ? 'Excel General' : statsView === 'company' ? 'Excel Cliente' : 'Excel Empleado'}
              </span>
            </button>
          </div>
        </div>

        {/* Fila de Filtros Dinámicos con AppSelect Nativo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Selector de Mes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-[#292929] mb-1.5">
              Mes
            </label>
            <AppSelect
              value={String(selectedMonth)}
              onChange={(val) => setSelectedMonth(Number(val))}
              options={MONTHS.map((m) => ({
                value: String(m.value),
                label: m.name,
              }))}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>

          {/* Selector de Año */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-[#292929] mb-1.5">
              Año
            </label>
            <AppSelect
              value={String(selectedYear)}
              onChange={(val) => setSelectedYear(Number(val))}
              options={[2024, 2025, 2026, 2027, 2028].map((y) => ({
                value: String(y),
                label: String(y),
              }))}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>

          {/* Selector condicional: Empresa si estamos en 'company', o Empleado si estamos en 'employee' */}
          {statsView === 'company' && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-tight text-[#292929] mb-1.5">
                Seleccionar Empresa / Cliente
              </label>
              <AppSelect
                value={selectedCompanyId}
                onChange={(val) => setSelectedCompanyId(val)}
                options={companies.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.client_type === 'cuota' ? `Cuota ${c.monthly_hours_quota}h` : 'Puntual'})`,
                }))}
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>
          )}

          {statsView === 'employee' && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-tight text-[#292929] mb-1.5">
                Seleccionar Empleado
              </label>
              <AppSelect
                value={selectedEmployeeId}
                onChange={(val) => setSelectedEmployeeId(val)}
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.full_name} (${emp.role === 'coordinator' ? 'Coordinador' : 'Trabajador'})`,
                }))}
                icon={<Users className="h-4 w-4" />}
              />
            </div>
          )}

          {statsView === 'general' && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-tight text-[#292929] mb-1.5">
                Búsqueda Rápida en Tareas
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar texto en descripciones..."
                  className="w-full px-4 py-2.5 pl-9 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] outline-none"
                />
                <Search className="h-4 w-4 text-[#8E0E75] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: ESTADÍSTICAS GENERALES                                           */}
      {/* ========================================================================= */}
      {statsView === 'general' && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Resumen General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Horas Totales */}
            <div className="rounded-sm border border-[#D8CFF0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-tight text-[#4A4A4A]">
                  Horas Totales Agencia
                </span>
                <Clock className="h-4 w-4 text-[#8E0E75]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold font-mono text-[#8E0E75] tabular-nums">
                {formatMinutes(generalStats.totalMinutes)}
              </p>
              <p className="text-[11px] text-[#4A4A4A] mt-0.5 font-light">
                {(generalStats.totalMinutes / 60).toFixed(1)} horas en {monthEntries.length} tareas
              </p>
            </div>

            {/* KPI 2: Horas en Cuotas */}
            <div className="rounded-sm border border-[#D8CFF0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-tight text-[#4A4A4A]">
                  Horas en Cuotas
                </span>
                <Briefcase className="h-4 w-4 text-[#191654]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold font-mono text-[#191654] tabular-nums">
                {formatMinutes(generalStats.cuotaMinutes)}
              </p>
              <p className="text-[11px] text-[#4A4A4A] mt-0.5 font-light">
                {generalStats.totalMinutes > 0
                  ? ((generalStats.cuotaMinutes / generalStats.totalMinutes) * 100).toFixed(0)
                  : 0}% del volumen general
              </p>
            </div>

            {/* KPI 3: Horas Puntuales */}
            <div className="rounded-sm border border-[#D8CFF0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-tight text-[#4A4A4A]">
                  Horas Puntuales / Extras
                </span>
                <TrendingUp className="h-4 w-4 text-[#8E0E75]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold font-mono text-[#8E0E75] tabular-nums">
                {formatMinutes(generalStats.puntualMinutes)}
              </p>
              <p className="text-[11px] text-[#4A4A4A] mt-0.5 font-light">
                {generalStats.totalMinutes > 0
                  ? ((generalStats.puntualMinutes / generalStats.totalMinutes) * 100).toFixed(0)
                  : 0}% del volumen general
              </p>
            </div>

            {/* KPI 4: Salud de Cuotas */}
            <div className="rounded-sm border border-[#D8CFF0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-tight text-[#4A4A4A]">
                  Salud de Cuotas
                </span>
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-[#292929]">
                  {generalStats.exactoCount}
                </span>
                <span className="text-xs text-[#10B981] font-bold">al milímetro</span>
              </div>
              <p className="text-[11px] text-[#4A4A4A] mt-0.5">
                <span className="text-red-600 font-extrabold">{generalStats.faltanCount} con faltantes</span> |{' '}
                <span className="text-[#8E0E75] font-bold">{generalStats.sobranCount} con sobrantes</span>
              </p>
            </div>
          </div>

          {/* Gráfico y Panel de Seguimiento de Cuotas con Alertas de Horas Faltantes / Sobrantes */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-2">
              <div>
                <h3 className="font-extrabold uppercase tracking-tight text-sm text-[#292929] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#8E0E75]" />
                  <span>SEGUIMIENTO DE CUOTAS: <span className="text-[#8E0E75]">HORAS FALTANTES Y SOBRANTES</span></span>
                </h3>
                <p className="text-xs text-[#4A4A4A] font-light">
                  Supervisión al milímetro de clientes cuota en {monthName} {selectedYear}
                </p>
              </div>

              {/* Leyenda de colores: Rojo (Faltante), Amarillo (En Proceso), Verde (Exacto), Lila (Cuota) */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4A4A4A] font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-xs bg-[#8E0E75]" />
                  <span>Horas Cuota</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-xs bg-red-500" />
                  <span className="font-bold text-red-700">Horas Faltantes (Déficit)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-xs bg-amber-400" />
                  <span className="font-bold text-amber-700">En Proceso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-xs bg-[#10B981]" />
                  <span className="font-bold text-emerald-700">Al Milímetro (100%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-xs bg-[#191654]" />
                  <span>Horas Sobrantes</span>
                </div>
              </div>
            </div>

            {/* Listado interactivo de Clientes Cuota */}
            <div className="space-y-4">
              {generalStats.quotasBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#4A4A4A] bg-[#F8F6FC] rounded-sm border border-[#D8CFF0]">
                  No hay clientes con cuota pactada registrados para este período.
                </div>
              ) : (
                generalStats.quotasBreakdown.map((item) => {
                const targetHours = item.company.monthly_hours_quota || 0;
                const isFaltan = item.deltaMin < 0;
                const isSobran = item.deltaMin > 0;
                const isExacto = item.deltaMin === 0;

                return (
                  <div
                    key={item.company.id}
                    className="p-4 rounded-sm border border-[#EAE4F5] bg-[#F8F6FC]/60 hover:bg-[#F8F6FC] transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-sm bg-white border border-[#D8CFF0] text-[#8E0E75]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#292929]">{item.company.name}</h4>
                          <p className="text-xs text-[#4A4A4A]">
                            Cuota pactada: <span className="font-bold text-[#292929]">{targetHours}h / mes</span> |{' '}
                            Trabajo general total: <span className="font-bold text-[#8E0E75]">{formatMinutes(item.totalMin)}</span>{' '}
                            {item.puntualMin > 0 && `(incluye ${formatMinutes(item.puntualMin)} puntuales fuera de cuota)`}
                          </p>
                        </div>
                      </div>

                      {/* Badge Destacado: Rojo para faltantes, Verde para exacto, Lila para sobrantes */}
                      <div className="shrink-0">
                        {isFaltan && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-red-50 border border-red-300 text-red-700 text-xs font-bold uppercase tracking-tight badge-pop">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            <span>Horas faltantes: {formatMinutes(Math.abs(item.deltaMin))}</span>
                          </div>
                        )}
                        {isSobran && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#8E0E75]/10 border border-[#8E0E75]/40 text-[#8E0E75] text-xs font-bold uppercase tracking-tight badge-pop">
                            <TrendingUp className="h-3.5 w-3.5 text-[#8E0E75]" />
                            <span>Horas sobrantes: {formatMinutes(item.deltaMin)}</span>
                          </div>
                        )}
                        {isExacto && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold uppercase tracking-tight badge-pop">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Cuota cumplida al milímetro</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progreso Visual con Semáforo Semántico */}
                    <div className="space-y-1">
                      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative flex">
                        {/* Segmento de cuota consumida */}
                        <div
                          className={`h-full transition-all duration-500 ${
                            isExacto
                              ? 'bg-gradient-to-r from-emerald-600 to-[#10B981]'
                              : item.percent < 40
                              ? 'bg-red-500'
                              : item.percent < 80
                              ? 'bg-amber-400'
                              : 'bg-gradient-to-r from-[#191654] to-[#8E0E75]'
                          }`}
                          style={{
                            width: `${Math.min(item.percent, 100)}%`,
                          }}
                        />
                        {/* Segmento de horas sobrantes si se ha superado */}
                        {isSobran && (
                          <div
                            className="h-full bg-[#191654] transition-all"
                            style={{
                              width: `${Math.min(((item.deltaMin) / item.targetMin) * 100, 50)}%`,
                            }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#4A4A4A] font-mono tabular-nums">
                        <span>
                          Consumidas a cuota:{' '}
                          <strong className={isExacto ? 'text-emerald-700' : isFaltan ? 'text-red-700' : 'text-[#8E0E75]'}>
                            {formatMinutes(item.cuotaMin)} ({item.percent.toFixed(1)}%)
                          </strong>
                        </span>
                        <span className="font-bold">Objetivo: {targetHours}h 00m</span>
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* Tabla Resumen de Dedicación General por Empresa */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex items-center justify-between">
              <div>
                <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                  MATRIZ GENERAL DE TODAS LAS EMPRESAS ({monthName} {selectedYear})
                </h4>
                <p className="text-xs text-[#4A4A4A] font-light">
                  Desglose de clientes cuota y clientes con contratación puntual
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-tight border-b border-[#D8CFF0]">
                  <tr>
                    <th className="px-6 py-3.5">Empresa / Cliente</th>
                    <th className="px-6 py-3.5 text-center">Tipo</th>
                    <th className="px-6 py-3.5 text-center">Cuota Mensual</th>
                    <th className="px-6 py-3.5 text-right">Horas Cuota</th>
                    <th className="px-6 py-3.5 text-right">Horas Puntuales</th>
                    <th className="px-6 py-3.5 text-right">Total Horas</th>
                    <th className="px-6 py-3.5 text-center">Estado del Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4F5]">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-xs text-[#4A4A4A]">
                        No hay empresas registradas todavía. Puedes añadir clientes desde la pestaña &quot;Gestión de Empresas&quot;.
                      </td>
                    </tr>
                  ) : (
                    companies.map((c) => {
                    const cEntries = monthEntries.filter((e) => e.company_id === c.id);
                    const cuotaMin = cEntries
                      .filter((e) => e.compute_type === 'cuota')
                      .reduce((sum, e) => sum + e.duration_minutes, 0);
                    const puntualMin = cEntries
                      .filter((e) => e.compute_type === 'puntual')
                      .reduce((sum, e) => sum + e.duration_minutes, 0);
                    const totalMin = cuotaMin + puntualMin;

                    return (
                      <tr key={c.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-[#292929]">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-[#8E0E75]" />
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tight border ${
                              c.client_type === 'cuota'
                                ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                            }`}
                          >
                            {c.client_type === 'cuota' ? 'Cuota' : 'Puntual'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono tabular-nums font-bold">
                          {c.client_type === 'cuota' && c.monthly_hours_quota
                            ? `${c.monthly_hours_quota}h / mes`
                            : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono tabular-nums font-bold text-[#8E0E75]">
                          {c.client_type === 'cuota' ? formatMinutes(cuotaMin) : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono tabular-nums font-bold text-[#191654]">
                          {formatMinutes(puntualMin)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono tabular-nums font-extrabold text-[#292929] text-sm">
                          {formatMinutes(totalMin)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {c.client_type === 'cuota' ? (
                            (() => {
                              const targetM = (c.monthly_hours_quota || 0) * 60;
                              const diff = cuotaMin - targetM;
                              if (diff < 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm bg-red-50 text-red-700 border border-red-300 font-extrabold text-[10px]">
                                    Faltan {formatMinutes(Math.abs(diff))}
                                  </span>
                                );
                              } else if (diff > 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/40 font-extrabold text-[10px]">
                                    Sobran {formatMinutes(diff)}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-[10px]">
                                    Al milímetro
                                  </span>
                                );
                              }
                            })()
                          ) : (
                            <span className="text-[11px] text-[#4A4A4A] italic">Puntual</span>
                          )}
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: ESTADÍSTICAS POR EMPRESA / CLIENTE                               */}
      {/* ========================================================================= */}
      {statsView === 'company' && currentCompany && currentCompanyStats && (
        <div className="space-y-6">
          {/* Ficha Principal de la Empresa */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#EAE4F5] gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-tight text-[#292929]">
                    {currentCompany.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                        currentCompany.client_type === 'cuota'
                          ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                          : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                      }`}
                    >
                      {currentCompany.client_type === 'cuota' ? 'Cliente Cuota' : 'Cliente Puntual'}
                    </span>
                    <span className="text-xs text-[#4A4A4A]">
                      Período: <span className="font-bold text-[#292929]">{monthName} {selectedYear}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner de Estado de Cuota con Horas Faltantes (Rojo) o Al Milímetro (Verde) */}
              {currentCompany.client_type === 'cuota' && (
                <div className="shrink-0">
                  {currentCompanyStats.deltaMin < 0 && (
                    <div className="p-3 rounded-sm bg-red-50 border border-red-300 text-red-800 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider text-red-700">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span>HORAS FALTANTES: {formatMinutes(Math.abs(currentCompanyStats.deltaMin))}</span>
                      </div>
                      <p className="text-[11px] text-red-600 mt-0.5 font-light">
                        Quedan {formatMinutes(Math.abs(currentCompanyStats.deltaMin))} por imputar para cumplir las {currentCompany.monthly_hours_quota}h del mes.
                      </p>
                    </div>
                  )}

                  {currentCompanyStats.deltaMin > 0 && (
                    <div className="p-3 rounded-sm bg-[#8E0E75]/10 border border-[#8E0E75]/40 text-[#8E0E75] animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
                        <TrendingUp className="h-4 w-4 text-[#8E0E75]" />
                        <span>HORAS SOBRANTES: {formatMinutes(currentCompanyStats.deltaMin)}</span>
                      </div>
                      <p className="text-[11px] text-[#700B5C] mt-0.5 font-light">
                        Se ha superado la cuota pactada de {currentCompany.monthly_hours_quota}h en {formatMinutes(currentCompanyStats.deltaMin)}.
                      </p>
                    </div>
                  )}

                  {currentCompanyStats.deltaMin === 0 && (
                    <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-800 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>CUOTA CUMPLIDA AL MILÍMETRO</span>
                      </div>
                      <p className="text-[11px] text-emerald-600 mt-0.5 font-light">
                        Se han completado exactamente las {currentCompany.monthly_hours_quota}h 00m pactadas para este mes.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fila de Métricas Clave de la Empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentCompany.client_type === 'cuota' ? (
                <>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Cuota Mensual Pactada
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#292929] tabular-nums mt-1 block">
                      {currentCompany.monthly_hours_quota}h 00m
                    </span>
                  </div>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Horas Imputadas a Cuota
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#8E0E75] tabular-nums mt-1 block">
                      {formatMinutes(currentCompanyStats.cuotaMin)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Horas Puntuales / Extras
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#191654] tabular-nums mt-1 block">
                      {formatMinutes(currentCompanyStats.puntualMin)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Total Trabajo General
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#292929] tabular-nums mt-1 block">
                      {formatMinutes(currentCompanyStats.totalMin)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] sm:col-span-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Total Horas Puntuales Imputadas
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#8E0E75] tabular-nums mt-1 block">
                      {formatMinutes(currentCompanyStats.totalMin)} ({(currentCompanyStats.totalMin / 60).toFixed(2)} hrs)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] sm:col-span-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                      Nº de Tareas Registradas
                    </span>
                    <span className="text-xl font-extrabold font-mono text-[#292929] tabular-nums mt-1 block">
                      {companyEntries.length} registros
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Equipo Involucrado */}
            <div className="pt-2">
              <h4 className="font-extrabold uppercase tracking-tight text-xs text-[#292929] mb-3">
                EQUIPO ASIGNADO A ESTE CLIENTE ({currentCompanyStats.workers.length} trabajadores)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentCompanyStats.workers.map((w) => (
                  <div
                    key={w.employee.id}
                    className="p-3 rounded-sm border border-[#EAE4F5] bg-white flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white font-extrabold flex items-center justify-center text-xs">
                        {w.employee.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#292929]">{w.employee.full_name}</p>
                        <p className="text-[10px] text-[#4A4A4A] font-light">
                          Cuota: {formatMinutes(w.cuotaMin)} | Puntual: {formatMinutes(w.puntualMin)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-[#8E0E75] tabular-nums">
                      {formatMinutes(w.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Listado Cronológico de Tareas para este Cliente */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex items-center justify-between">
              <div>
                <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                  REGISTRO DETALLADO DE ACTIVIDADES ({companyEntries.length} tareas)
                </h4>
                <p className="text-xs text-[#4A4A4A] font-light">
                  Tareas imputadas por los empleados para {currentCompany.name}
                </p>
              </div>
            </div>

            {companyEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4A4A4A]">
                No hay actividades registradas para esta empresa en el período seleccionado.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-wider border-b border-[#D8CFF0]">
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Responsable</th>
                      <th className="px-6 py-3.5 text-center">Tipo Imputación</th>
                      <th className="px-6 py-3.5">Descripción de la Tarea</th>
                      <th className="px-6 py-3.5 text-right">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4F5]">
                    {companyEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-[#4A4A4A] whitespace-nowrap">
                          {e.work_date}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-[#292929] whitespace-nowrap">
                          {e.profile?.full_name || 'Desconocido'}
                        </td>
                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                              e.compute_type === 'cuota'
                                ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                            }`}
                          >
                            {e.compute_type === 'cuota' ? 'Horas de Cuota' : 'Puntual / Extra'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[#4A4A4A]">
                          {e.description || <span className="text-slate-400 italic">Sin descripción</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-extrabold text-[#8E0E75] whitespace-nowrap text-sm">
                          {formatMinutes(e.duration_minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {statsView === 'company' && (!currentCompany || !currentCompanyStats) && (
        <div className="w-full p-12 text-center text-xs text-[#4A4A4A] bg-white rounded-sm border border-[#D8CFF0]">
          No hay empresas registradas para mostrar estadísticas. Puedes dar de alta una empresa desde la pestaña &quot;Gestión de Empresas&quot;.
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: ESTADÍSTICAS POR EMPLEADO                                        */}
      {/* ========================================================================= */}
      {statsView === 'employee' && currentEmployee && currentEmployeeStats && (
        <div className="space-y-6">
          {/* Ficha Individual del Trabajador */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#EAE4F5] gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white font-extrabold flex items-center justify-center text-base shrink-0 shadow-sm">
                  {currentEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-tight text-[#292929]">
                    {currentEmployee.full_name}
                  </h3>
                  <p className="text-xs text-[#4A4A4A] font-mono">{currentEmployee.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75] text-xs font-extrabold uppercase tracking-wider">
                  {currentEmployee.role === 'coordinator' ? 'Coordinador' : 'Trabajador'}
                </span>
                <span className="text-xs text-[#4A4A4A]">
                  Período: <span className="font-bold text-[#292929]">{monthName} {selectedYear}</span>
                </span>
              </div>
            </div>

            {/* KPIs del Empleado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                  Total Horas Registradas
                </span>
                <span className="text-2xl font-extrabold font-mono text-[#8E0E75] tabular-nums mt-1 block">
                  {formatMinutes(currentEmployeeStats.totalMin)}
                </span>
                <span className="text-[11px] text-[#4A4A4A] mt-0.5 block font-light">
                  {(currentEmployeeStats.totalMin / 60).toFixed(1)} hrs en {employeeEntries.length} tareas
                </span>
              </div>

              <div className="p-4 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                  Dedicación a Clientes Cuota
                </span>
                <span className="text-2xl font-extrabold font-mono text-[#191654] tabular-nums mt-1 block">
                  {formatMinutes(currentEmployeeStats.cuotaMin)}
                </span>
                <span className="text-[11px] text-[#4A4A4A] mt-0.5 block font-light">
                  {currentEmployeeStats.totalMin > 0
                    ? ((currentEmployeeStats.cuotaMin / currentEmployeeStats.totalMin) * 100).toFixed(0)
                    : 0}% del tiempo del trabajador
                </span>
              </div>

              <div className="p-4 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0]">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A4A4A] block">
                  Dedicación a Trabajos Puntuales
                </span>
                <span className="text-2xl font-extrabold font-mono text-[#8E0E75] tabular-nums mt-1 block">
                  {formatMinutes(currentEmployeeStats.puntualMin)}
                </span>
                <span className="text-[11px] text-[#4A4A4A] mt-0.5 block font-light">
                  {currentEmployeeStats.totalMin > 0
                    ? ((currentEmployeeStats.puntualMin / currentEmployeeStats.totalMin) * 100).toFixed(0)
                    : 0}% del tiempo del trabajador
                </span>
              </div>
            </div>

            {/* Desglose de Clientes en los que ha trabajado el empleado */}
            <div className="pt-2">
              <h4 className="font-extrabold uppercase tracking-tight text-xs text-[#292929] mb-3">
                DISTRIBUCIÓN DEL TIEMPO POR CLIENTE ({currentEmployeeStats.companyBreakdown.length} empresas)
              </h4>
              <div className="space-y-2">
                {currentEmployeeStats.companyBreakdown.map((item, idx) => {
                  const percent = currentEmployeeStats.totalMin > 0
                    ? (item.minutes / currentEmployeeStats.totalMin) * 100
                    : 0;

                  return (
                    <div key={idx} className="p-3 rounded-sm border border-[#EAE4F5] bg-white">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />
                          <span className="font-bold text-[#292929]">{item.companyName}</span>
                          <span className="text-[10px] text-[#4A4A4A]">({item.isCuota ? 'Cliente Cuota' : 'Puntual'})</span>
                        </div>
                        <span className="font-mono font-bold text-[#8E0E75]">
                          {formatMinutes(item.minutes)} ({percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#191654] to-[#8E0E75]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Listado de Tareas del Empleado */}
          <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex items-center justify-between">
              <div>
                <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                  HISTORIAL DE ACTIVIDAD ({employeeEntries.length} registros)
                </h4>
                <p className="text-xs text-[#4A4A4A] font-light">
                  Registro detallado de horas trabajadas por {currentEmployee.full_name}
                </p>
              </div>
            </div>

            {employeeEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4A4A4A]">
                No hay horas registradas para este empleado en el período seleccionado.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-wider border-b border-[#D8CFF0]">
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Empresa / Cliente</th>
                      <th className="px-6 py-3.5 text-center">Tipo Imputación</th>
                      <th className="px-6 py-3.5">Descripción de la Tarea</th>
                      <th className="px-6 py-3.5 text-right">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4F5]">
                    {employeeEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-[#4A4A4A] whitespace-nowrap">
                          {e.work_date}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-[#292929] whitespace-nowrap">
                          {e.company?.name || 'General'}
                        </td>
                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                              e.compute_type === 'cuota'
                                ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                                : 'bg-[#191654]/10 text-[#191654] border-[#191654]/30'
                            }`}
                          >
                            {e.compute_type === 'cuota' ? 'Horas de Cuota' : 'Puntual'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[#4A4A4A]">
                          {e.description || <span className="text-slate-400 italic">Sin descripción</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-extrabold text-[#8E0E75] whitespace-nowrap text-sm">
                          {formatMinutes(e.duration_minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {statsView === 'employee' && (!currentEmployee || !currentEmployeeStats) && (
        <div className="w-full p-12 text-center text-xs text-[#4A4A4A] bg-white rounded-sm border border-[#D8CFF0]">
          No hay empleados registrados para mostrar estadísticas. Comparte el enlace de registro desde la pestaña &quot;Gestión de Usuarios&quot;.
        </div>
      )}
    </div>
  );
}
