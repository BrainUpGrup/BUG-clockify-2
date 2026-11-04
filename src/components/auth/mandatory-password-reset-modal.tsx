'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { 
  Lock, 
  Key, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { notify } from '@/lib/feedback';

export function MandatoryPasswordResetModal() {
  const { user, mustResetPassword, completePasswordReset } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Si no hay usuario o la contraseña ya está configurada, no renderizar
  const isRequired = !!user && (user.password_configured === false || mustResetPassword);
  if (!isRequired) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor, revísalas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completePasswordReset(newPassword);
      if (res.success) {
        notify('Contraseña establecida correctamente. Bienvenido/a al sistema.', { type: 'success' });
      } else {
        setErrorMessage(res.error || 'No se pudo actualizar la contraseña.');
      }
    } catch {
      setErrorMessage('Ocurrió un error inesperado al guardar la nueva contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div 
        className="w-full max-w-md bg-white border-2 border-[#D0C4EB] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
      >
        {/* Cabecera con Logotipo e Identidad */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 relative rounded-2xl bg-[#F8F6FC] border-2 border-[#D8CFF0] p-3 shadow-xs flex items-center justify-center">
            <Image
              src="/isotipo.svg"
              alt="Brain Up Grup"
              fill
              sizes="64px"
              className="object-contain p-2"
              priority
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#8E0E75]/10 border border-[#8E0E75]/25 text-[#8E0E75] text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Reinicio Obligatorio de Credenciales</span>
            </div>
            <h2 id="reset-modal-title" className="text-xl sm:text-2xl font-black text-[#292929] tracking-tight">
              Configura tu <span className="text-[#8E0E75]">Nueva Contraseña</span>
            </h2>
            <p className="text-xs text-[#4A4A4A] leading-relaxed max-w-sm mx-auto">
              Has accedido con una clave temporal de un solo uso. Por seguridad corporativa, debes establecer tu contraseña definitiva para desbloquear el sistema.
            </p>
          </div>

          {/* Tarjeta de Usuario Actual */}
          <div className="w-full bg-[#F8F6FC] rounded-xl border border-[#D8CFF0] p-3 text-left flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#292929] truncate">
                {user.full_name}
              </p>
              <p className="text-[11px] font-mono text-[#4A4A4A] truncate">
                {user.email}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#D8CFF0] text-[#8E0E75]">
              {user.role === 'coordinator' ? 'Coordinadora' : user.role === 'admin' ? 'Super Admin' : 'Empleado'}
            </span>
          </div>
        </div>

        {/* Mensaje de Error si aplica */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario de Nueva Contraseña */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
              Nueva Contraseña Definitiva
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E0E75]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#F8F6FC] border-2 border-[#D8CFF0] rounded-xl text-xs sm:text-sm font-semibold text-[#292929] placeholder:text-[#4A4A4A]/50 focus:outline-hidden focus:border-[#8E0E75] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#4A4A4A] hover:text-[#8E0E75] cursor-pointer"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E0E75]">
                <Key className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#F8F6FC] border-2 border-[#D8CFF0] rounded-xl text-xs sm:text-sm font-semibold text-[#292929] placeholder:text-[#4A4A4A]/50 focus:outline-hidden focus:border-[#8E0E75] focus:bg-white transition-all"
              />
            </div>
            {newPassword && confirmPassword && (
              <p className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 ${
                newPassword === confirmPassword ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {newPassword === confirmPassword ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Las contraseñas coinciden</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-red-600" />
                    <span>Las contraseñas aún no coinciden</span>
                  </>
                )}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3 px-4 bg-[#8E0E75] hover:bg-[#720B5E] text-white rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-md shadow-[#8E0E75]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Guardando Contraseña...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Guardar Contraseña y Entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
