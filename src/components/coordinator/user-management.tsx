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
  Briefcase,
  KeyRound,
  Lock,
  RefreshCw,
  X
} from 'lucide-react';
import { Profile, TimeEntry, UserRole } from '@/types/database';
import { formatMinutes } from '@/lib/utils';
import { confirmDialog, notify } from '@/lib/feedback';
import { UserAvatar } from '@/components/ui/user-avatar';
import { createClient } from '@/lib/supabase/client';

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

  // Estado para modal de asignación de contraseña
  const [passwordModalEmployee, setPasswordModalEmployee] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleOpenPasswordModal = (emp: Profile) => {
    setPasswordModalEmployee(emp);
    setNewPasswordInput('');
  };

  const handleGeneratePassword = () => {
    if (!passwordModalEmployee) return;
    const namePart = (passwordModalEmployee.full_name.split(' ')[0] || 'empleado').toLowerCase();
    setNewPasswordInput(`${namePart}2026`);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalEmployee) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      notify('La contraseña debe tener al menos 6 caracteres.', { type: 'warning' });
      return;
    }

    setIsUpdatingPassword(true);
    const cleanPwd = newPasswordInput.trim();

    try {
      // 1. Guardar en Supabase profiles directamente
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({
          custom_password: cleanPwd,
          password_configured: true,
        })
        .eq('id', passwordModalEmployee.id);

      // 2. Disparar endpoint de sincronización
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_password',
          email: passwordModalEmployee.email,
          newPassword: cleanPwd,
        }),
      });

      notify(`Contraseña asignada con éxito a ${passwordModalEmployee.full_name}. Ya puede iniciar sesión.`, { type: 'success' });
      setPasswordModalEmployee(null);
      setNewPasswordInput('');
    } catch (err) {
      console.error('Error saving employee password:', err);
      notify('Hubo un error al actualizar la contraseña.', { type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
    const ok = await confirmDialog({
      title: '¿Rechazar esta solicitud de registro?',
      message: 'La persona no podrá entrar en la plataforma hasta que vuelva a solicitar acceso.',
      confirmLabel: 'Rechazar',
      danger: true,
    });
    if (!ok) return;
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
      <div className="w-full rounded-2xl border-2 border-[#D0C4EB] bg-white p-6 shadow-md shadow-[#191654]/6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
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
              className="p-2.5 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-[#8E0E75] hover:bg-white hover:border-[#8E0E75] transition-all cursor-pointer"
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
              className="w-full px-4 py-2.5 pr-20 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-mono text-[#8E0E75] select-all outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase font-bold text-[#4A4A4A] tracking-wider pointer-events-none">
              Link Oficial
            </span>
          </div>
        </div>
      </div>

      {/* Sección 1: Solicitudes Pendientes de Aprobación */}
      <div className="w-full rounded-2xl border-2 border-[#D0C4EB] bg-white overflow-hidden shadow-md shadow-[#191654]/6">
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EAE4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
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

          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
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
                        <UserAvatar
                          src={cand.avatar_url}
                          name={cand.full_name}
                          size="sm"
                          className="ring-1 ring-amber-300"
                        />
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#059669] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                          title="Aceptar y activar cuenta de empleado"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Aceptar Empleado</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === cand.id}
                          onClick={() => handleReject(cand.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
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
      <div className="w-full rounded-2xl border-2 border-[#D0C4EB] bg-white overflow-hidden shadow-md shadow-[#191654]/6">
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
                <th className="px-6 py-3.5 text-right">Acciones</th>
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
                        <UserAvatar
                          src={emp.avatar_url}
                          name={emp.full_name}
                          size="sm"
                          className="ring-1 ring-[#D8CFF0]"
                        />
                        <div>
                          <span className="text-sm block">{emp.full_name}</span>
                          {emp.department && (
                            <span className="text-[11px] text-[#4A4A4A] font-light block">
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
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider border ${
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
                      <span className="block text-[11px] text-[#4A4A4A] font-normal tabular-nums">
                        {empEntries.length} tareas
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#3BB54A]/10 text-[#3BB54A] border border-[#3BB54A]/30 text-[11px] font-extrabold uppercase tracking-wider">
                        Activo
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPasswordModal(emp)}
                          className="p-1.5 rounded-lg border border-[#D8CFF0] bg-white text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors cursor-pointer"
                          title={`Asignar o cambiar contraseña de acceso para ${emp.full_name}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>

                        {onDeleteUser && emp.role !== 'coordinator' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: `¿Dar de baja a ${emp.full_name}?`,
                                message: 'Perderá el acceso a todas las herramientas del Hub.',
                                confirmLabel: 'Dar de baja',
                                danger: true,
                              });
                              if (!ok) return;
                              onDeleteUser(emp.id);
                            }}
                            aria-label={`Dar de baja a ${emp.full_name}`}
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Dar de baja usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Zero-Scroll de Asignación / Cambio de Contraseña de Empleado */}
      {passwordModalEmployee && (
        <div className="fixed inset-0 z-50 bg-[#191654]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border-2 border-[#D8CFF0] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Cabecera */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <KeyRound className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Asignar Contraseña
                  </h3>
                  <p className="text-[11px] text-white/80 font-light truncate max-w-[280px]">
                    {passwordModalEmployee.full_name} ({passwordModalEmployee.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalEmployee(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSavePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                  Nueva Contraseña de Acceso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mínimo 6 caracteres (ej. lidia2026)..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F6FC] border-2 border-[#D8CFF0] focus:border-[#8E0E75] focus:outline-hidden rounded-xl text-xs text-[#292929] font-mono font-bold transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Botón generar sugerencia rápida */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#4A4A4A]">¿Deseas una sugerencia rápida?</span>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#8E0E75] hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Generar sugerida</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] text-[11px] text-[#4A4A4A] leading-relaxed">
                Al guardar, el empleado podrá iniciar sesión de inmediato con este correo y esta contraseña sin depender de confirmación de email.
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4F5]">
                <button
                  type="button"
                  onClick={() => setPasswordModalEmployee(null)}
                  className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white text-[#4A4A4A] hover:bg-slate-50 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3BB54A] hover:bg-[#2e943c] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>{isUpdatingPassword ? 'Guardando...' : 'Guardar y Habilitar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
