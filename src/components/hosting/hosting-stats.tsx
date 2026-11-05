'use client';

import React from 'react';
import { HostingMetrics } from '@/types/hosting';
import { 
  Server, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert,
  Globe,
  Bell
} from 'lucide-react';

interface HostingStatsProps {
  metrics: HostingMetrics;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onOpenNotifications: () => void;
}

export function HostingStats({
  metrics,
  activeFilter,
  onSelectFilter,
  onOpenNotifications,
}: HostingStatsProps) {
  const urgentCount = metrics.expiredCount + metrics.critical7Days + metrics.warning15Days;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Servicios */}
      <button
        type="button"
        onClick={() => onSelectFilter('all')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
          activeFilter === 'all'
            ? 'bg-white border-[#8E0E75] shadow-md ring-2 ring-[#8E0E75]/20'
            : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/60 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#4A4A4A]">
            Contratados
          </span>
          <Server className="h-4 w-4 text-[#8E0E75]" />
        </div>
        <div className="mt-2 flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#292929] tabular-nums">
              {metrics.totalServices}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#4A4A4A] tracking-tight">
            {metrics.totalHostings} Hostings · {metrics.totalDomains} Dom · {metrics.totalEmails} Correo · {metrics.totalSubhostings} Sub
          </span>
        </div>
      </button>

      {/* 2. Caducados */}
      <button
        type="button"
        onClick={() => onSelectFilter('expired')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
          activeFilter === 'expired'
            ? 'bg-red-50 border-red-500 shadow-md ring-2 ring-red-400/20'
            : metrics.expiredCount > 0
            ? 'bg-red-50/60 border-red-200 hover:border-red-400'
            : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-700">
            Caducados
          </span>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-red-600 tabular-nums">
            {metrics.expiredCount}
          </span>
          <span className="text-[10px] font-bold text-red-500">vencidos</span>
        </div>
      </button>

      {/* 3. Vence en <= 7 días */}
      <button
        type="button"
        onClick={() => onSelectFilter('critical_7')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
          activeFilter === 'critical_7'
            ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400/20'
            : metrics.critical7Days > 0
            ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
            : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
            En 7 días
          </span>
          <Clock className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
            {metrics.critical7Days}
          </span>
          <span className="text-[10px] font-bold text-amber-600">críticos</span>
        </div>
      </button>

      {/* 4. Vence en <= 30 días */}
      <button
        type="button"
        onClick={() => onSelectFilter('notice_30')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
          activeFilter === 'notice_30'
            ? 'bg-indigo-50 border-[#191654] shadow-md ring-2 ring-[#191654]/20'
            : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#191654]">
            En 30 días
          </span>
          <Calendar className="h-4 w-4 text-[#191654]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-[#191654] tabular-nums">
            {metrics.notice30Days}
          </span>
          <span className="text-[10px] font-bold text-slate-500">a renovar</span>
        </div>
      </button>

      {/* 5. Vence en 60 a 90 días */}
      <button
        type="button"
        onClick={() => onSelectFilter('pre_90')}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
          activeFilter === 'pre_90'
            ? 'bg-purple-50 border-[#8E0E75] shadow-md ring-2 ring-[#8E0E75]/20'
            : 'bg-white border-[#D8CFF0] hover:border-[#8E0E75]/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
            60 - 90 días
          </span>
          <Clock className="h-4 w-4 text-[#8E0E75]" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-[#8E0E75] tabular-nums">
            {metrics.notice60Days + metrics.notice90Days}
          </span>
          <span className="text-[10px] font-bold text-purple-700">en agenda</span>
        </div>
      </button>

      {/* 6. Centro de Notificaciones Activas */}
      <button
        type="button"
        onClick={onOpenNotifications}
        className="p-3.5 sm:p-4 rounded-2xl border-2 border-[#D8CFF0] bg-linear-to-r from-[#191654] to-[#8E0E75] text-white hover:opacity-95 transition-all text-left cursor-pointer shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
            Alertas & Avisos
          </span>
          <Bell className="h-4 w-4 text-amber-300 animate-pulse" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
            {urgentCount}
          </span>
          <span className="text-[10px] font-bold text-amber-200">
            {urgentCount === 1 ? 'aviso prioritario' : 'avisos prioritarios'}
          </span>
        </div>
      </button>
    </div>
  );
}

