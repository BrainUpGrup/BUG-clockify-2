'use client';

import React from 'react';
import { TrendingUp, SunMedium, CalendarCheck } from 'lucide-react';
import { TimeEntry } from '@/types/database';
import { formatMinutes } from '@/lib/utils';

interface EmployeeStatsProps {
  entries: TimeEntry[];
}

export function EmployeeStats({ entries }: EmployeeStatsProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Calcular inicio de semana (Lunes)
  const dayOfWeek = now.getDay(); // 0 es Domingo
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - distanceToMonday);
  mondayDate.setHours(0, 0, 0, 0);

  // 1. Horas Hoy
  const todayMinutes = entries
    .filter((e) => e.work_date === todayStr)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // 2. Horas Esta Semana
  const weekMinutes = entries
    .filter((e) => {
      const [y, m, d] = e.work_date.split('-').map(Number);
      const entryDate = new Date(y, m - 1, d);
      return entryDate >= mondayDate && entryDate <= now;
    })
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // 3. Horas Este Mes
  const monthMinutes = entries
    .filter((e) => e.work_date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // Metas orientativas
  const dailyGoalMinutes = 8 * 60; // 8 horas
  const dailyProgressPercent = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tarjeta: Horas Hoy */}
      <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
            HORAS <span className="text-[#8E0E75]">HOY</span>
          </span>
          <div className="p-2 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
            <SunMedium className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#292929] tracking-tight font-mono tabular-nums">
            {formatMinutes(todayMinutes)}
          </span>
          <span className="text-xs text-[#4A4A4A] font-light">/ 8h diaria</span>
        </div>
        {/* Barra de progreso diario */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-bold text-[#4A4A4A] mb-1 tabular-nums">
            <span className="uppercase tracking-wider">Jornada</span>
            <span>{dailyProgressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#F8F6FC] rounded-sm overflow-hidden border border-[#D8CFF0]">
            <div
              className={`h-full transition-all duration-500 ${
                dailyProgressPercent >= 100 ? 'bg-[#3BB54A]' : 'bg-[#8E0E75]'
              }`}
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tarjeta: Horas Esta Semana */}
      <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
            HORAS <span className="text-[#8E0E75]">ESTA SEMANA</span>
          </span>
          <div className="p-2 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#292929] tracking-tight font-mono tabular-nums">
            {formatMinutes(weekMinutes)}
          </span>
          <span className="text-xs text-[#4A4A4A] font-light">Lunes - Domingo</span>
        </div>
        <p className="mt-3 text-xs text-[#4A4A4A]">
          Acumulado: <span className="font-bold text-[#8E0E75] tabular-nums">{(weekMinutes / 60).toFixed(1)} horas</span> registradas esta semana.
        </p>
      </div>

      {/* Tarjeta: Horas Este Mes */}
      <div className="relative overflow-hidden rounded-sm border border-[#D8CFF0] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929]">
            HORAS <span className="text-[#8E0E75]">ESTE MES</span>
          </span>
          <div className="p-2 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
            <CalendarCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#8E0E75] tracking-tight font-mono tabular-nums">
            {formatMinutes(monthMinutes)}
          </span>
          <span className="text-xs text-[#4A4A4A] font-light">Total mensual</span>
        </div>
        <p className="mt-3 text-xs text-[#4A4A4A]">
          Total computable: <span className="font-bold text-[#292929] tabular-nums">{(monthMinutes / 60).toFixed(1)} horas</span> en el mes activo.
        </p>
      </div>
    </div>
  );
}
