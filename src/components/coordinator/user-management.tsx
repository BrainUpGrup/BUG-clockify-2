'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Mail, 
  Clock, 
  Trash2,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { Profile, TimeEntry, UserRole } from '@/types/database';
import { formatMinutes } from '@/lib/utils';

interface UserManagementProps {
  employees: Profile[];
  entries: TimeEntry[];
  onApproveUser: (id: string) => Promise<void>;
  onRejectUser: (id: string) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
}

export function UserManagement({
  employees,
  entries,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}: UserManagementProps) {
  const [copied, setCopied] = useState(false);
  const [registerUrl, setRegisterUrl] = useState('http://localhost:3000/register?invite=brainup');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Obtener URL completa del navegador si está disponible
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRegisterUrl(`${window.location.origin}/register?invite=brainup`);
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Separar empleados pendientes de los activos
  const pendingEmployees = employees.filter((e) => e.status === 'pending');
  const activeEmployees = employees.filter((e) => e.status !== 'pending');

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await onApproveUser(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Rechazar y descartar esta solicitud de registro?')) return;
    setProcessingId(id);
    try {
      await onRejectUser(id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Panel Superior: Enlace de Empresa para el Registro de Empleados */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold uppercase tracking-tight text-base text-[#292929]">
                ENLACE DE INVITACIÓN <span className="text-[#8E0E75]">A LA EMPRESA</span>
              </h3>
              <p className="text-xs text-[#4A4A4A] font-light">
                Comparte este enlace para que los nuevos empleados completen su registro. Deberás aceptar cada solicitud para activar su acceso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                copied
                  ? 'bg-[#3BB54A] text-white shadow-[#3BB54A]/25'
                  : 'bg-[#8E0E75] text-white hover:bg-[#700B5C] shadow-[#8E0E75]/25 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Enlace de Empresa</span>
                </>
              )}
            </button>

            <a
              href={registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] text-[#8E0E75] hover:bg-white hover:border-[#8E0E75] transition-all cursor-pointer"
              title="Abrir formulario de registro en nueva pestaña"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Input con el Enlace Copiable */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full relative">
            <input
              type="text"
              readOnly
              value={registerUrl}
              className="w-full px-4 py-2.5 pr-20 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-mono text-[#8E0E75] select-all outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#4A4A4A] tracking-wider pointer-events-none">
              Link Oficial
            </span>
          </div>
        </div>
      </div>

      {/* Sección 1: Solicitudes Pendientes de Aprobación */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xs bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
                SOLICITUDES PENDIENTES <span className="text-amber-700">DE APROBACIÓN</span>
              </h4>
              <p className="text-xs text-[#4A4A4A] font-light">
                Empleados que se han registrado mediante el enlace y esperan tu validación
              </p>
            </div>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
            {pendingEmployees.length} {pendingEmployees.length === 1 ? 'pendiente' : 'pendientes'}
          </span>
        </div>

        {pendingEmployees.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#4A4A4A]">
            No hay solicitudes de registro pendientes. Comparte el enlace de arriba con los nuevos trabajadores.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-wider border-b border-[#D8CFF0]">
                <tr>
                  <th className="px-6 py-3.5">Candidato / Empleado</th>
                  <th className="px-6 py-3.5">Email Solicitante</th>
                  <th className="px-6 py-3.5">Especialidad / Dpto.</th>
                  <th className="px-6 py-3.5 text-center">Fecha de Registro</th>
                  <th className="px-6 py-3.5 text-right">Acción del Coordinador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4F5]">
                {pendingEmployees.map((cand) => (
                  <tr key={cand.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[#292929]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {cand.full_name.charAt(0)}
                        </div>
                        <span className="text-sm">{cand.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[#4A4A4A] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cand.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[#4A4A4A]">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cand.department || 'General'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center text-[#4A4A4A] font-mono">
                      {cand.created_at ? cand.created_at.split('T')[0] : 'Hoy'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={processingId === cand.id}
                          onClick={() => handleApprove(cand.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#10B981] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#059669] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                          title="Aceptar y activar cuenta de empleado"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Aceptar Empleado</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === cand.id}
                          onClick={() => handleReject(cand.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          title="Rechazar solicitud"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sección 2: Empleados Activos de la Agencia */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex items-center justify-between">
          <div>
            <h4 className="font-extrabold uppercase tracking-tight text-sm text-[#292929]">
              EQUIPO ACTIVO DE LA AGENCIA ({activeEmployees.length})
            </h4>
            <p className="text-xs text-[#4A4A4A] font-light">
              Miembros con acceso autorizado a imputar horas en BUG Clockify
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F6FC] text-[#292929] font-extrabold uppercase tracking-wider border-b border-[#D8CFF0]">
              <tr>
                <th className="px-6 py-3.5">Nombre / Empleado</th>
                <th className="px-6 py-3.5">Email Corporativo</th>
                <th className="px-6 py-3.5 text-center">Rol</th>
                <th className="px-6 py-3.5 text-center">Horas Registradas</th>
                <th className="px-6 py-3.5 text-center">Estado</th>
                {onDeleteUser && <th className="px-6 py-3.5 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4F5]">
              {activeEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-[#4A4A4A]">
                    No hay empleados activos todavía. Las solicitudes aceptadas aparecerán aquí.
                  </td>
                </tr>
              ) : (
                activeEmployees.map((emp) => {
                const empEntries = entries.filter((e) => e.user_id === emp.id);
                const totalMinutes = empEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

                return (
                  <tr key={emp.id} className="hover:bg-[#F8F6FC]/60 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[#292929]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm block">{emp.full_name}</span>
                          {emp.department && (
                            <span className="text-[10px] text-[#4A4A4A] font-light block">
                              {emp.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[#4A4A4A] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                          emp.role === 'coordinator'
                            ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                            : 'bg-slate-100 text-[#4A4A4A] border-slate-200'
                        }`}
                      >
                        {emp.role === 'coordinator' ? (
                          <>
                            <ShieldCheck className="h-3 w-3" />
                            <span>Coordinador</span>
                          </>
                        ) : (
                          <span>Trabajador</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-mono tabular-nums font-extrabold text-sm text-[#8E0E75]">
                      {formatMinutes(totalMinutes)}
                      <span className="block text-[10px] text-[#4A4A4A] font-normal tabular-nums">
                        {empEntries.length} tareas
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#3BB54A]/10 text-[#3BB54A] border border-[#3BB54A]/30 text-[10px] font-extrabold uppercase tracking-wider">
                        Activo
                      </span>
                    </td>
                    {onDeleteUser && (
                      <td className="px-6 py-3.5 text-right">
                        {emp.role !== 'coordinator' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Dar de baja a ${emp.full_name}?`)) {
                                onDeleteUser(emp.id);
                              }
                            }}
                            className="p-1.5 rounded-sm border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Dar de baja usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
