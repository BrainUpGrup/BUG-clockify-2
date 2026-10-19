'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor introduce tu correo y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.user) {
        router.push('/hub');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await login(quickEmail, quickPass);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      if (result.user) {
        router.push('/hub');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FC] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white border border-[#D8CFF0] rounded-sm shadow-xl p-8 space-y-6">
        {/* Cabecera con Logotipo de "La Abuela" */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 relative rounded-full bg-white border border-[#D8CFF0] p-1 shadow-xs">
              <Image
                src="/logo.png"
                alt="Brain Up Grup"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-[#292929]">
              INICIAR <span className="text-[#8E0E75]">SESIÓN</span>
            </h1>
            <p className="text-xs text-[#4A4A4A] font-light mt-0.5">
              Acceso a la plataforma de Control Horario de <span className="font-bold text-[#8E0E75]">Brain Up Grup</span>
            </p>
          </div>
        </div>

        {/* Mensaje de Error o Estado Pendiente */}
        {errorMessage && (
          <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
              Email Corporativo
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@brainupgrup.com"
                className="w-full px-4 py-3 pl-10 rounded-md border-2 border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all font-medium"
              />
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#292929] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 pl-10 rounded-md border-2 border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all font-medium"
              />
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-md bg-[#8E0E75] text-white text-sm font-black uppercase tracking-wider hover:bg-[#700B5C] active:scale-[0.98] hover:scale-[1.01] disabled:opacity-50 transition-all shadow-lg shadow-[#8E0E75]/30 hover:shadow-xl hover:shadow-[#8E0E75]/40 cursor-pointer mt-3"
          >
            <LogIn className="h-4 w-4" />
            <span>{isSubmitting ? 'Iniciando Sesión...' : 'Entrar a mi Cuenta'}</span>
          </button>
        </form>

        {/* Acceso Rápido con Cuentas de Demostración (1 Clic) */}
        <div className="pt-4 border-t border-[#D8CFF0] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#8E0E75]">
              Acceso Rápido (1 Clic)
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Cuentas de Prueba</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Coordinadora */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('coordinacion@brainupgrup.com', 'BrainUp2026!')}
              className="w-full flex items-center justify-between p-2.5 rounded-md border-2 border-[#D8CFF0] bg-[#F8F6FC] hover:bg-[#8E0E75] hover:border-[#8E0E75] hover:text-white group transition-all text-left cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-white group-hover:bg-white/20 border border-[#D8CFF0] flex items-center justify-center text-base shrink-0 shadow-2xs">
                  👩‍💼
                </span>
                <div>
                  <div className="text-xs font-black uppercase leading-tight text-[#191654] group-hover:text-white">
                    Coordinadora de Operaciones
                  </div>
                  <div className="text-[10px] text-[#8E0E75] group-hover:text-white/80 font-mono mt-0.5">
                    coordinacion@brainupgrup.com
                  </div>
                </div>
              </div>
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-sm bg-white group-hover:bg-white/20 text-[#8E0E75] group-hover:text-white border border-[#D8CFF0] group-hover:border-transparent shrink-0 shadow-2xs">
                Entrar
              </span>
            </button>

            {/* Empleado */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('empleado@brainupgrup.com', 'BrainUp2026!')}
              className="w-full flex items-center justify-between p-2.5 rounded-md border-2 border-[#D8CFF0] bg-[#F8F6FC] hover:bg-[#10B981] hover:border-[#10B981] hover:text-white group transition-all text-left cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-white group-hover:bg-white/20 border border-[#D8CFF0] flex items-center justify-center text-base shrink-0 shadow-2xs">
                  👨‍💻
                </span>
                <div>
                  <div className="text-xs font-black uppercase leading-tight text-[#191654] group-hover:text-white">
                    Empleado / Trabajador
                  </div>
                  <div className="text-[10px] text-emerald-700 group-hover:text-white/80 font-mono mt-0.5">
                    empleado@brainupgrup.com
                  </div>
                </div>
              </div>
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-sm bg-white group-hover:bg-white/20 text-emerald-700 group-hover:text-white border border-[#D8CFF0] group-hover:border-transparent shrink-0 shadow-2xs">
                Entrar
              </span>
            </button>

            {/* Super Admin */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('appadmin@brainupgrup.com', 'fn.5loDnrTTfI2z!')}
              className="w-full flex items-center justify-between p-2.5 rounded-md border-2 border-[#D8CFF0] bg-[#F8F6FC] hover:bg-[#191654] hover:border-[#191654] hover:text-white group transition-all text-left cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-white group-hover:bg-white/20 border border-[#D8CFF0] flex items-center justify-center text-base shrink-0 shadow-2xs">
                  👑
                </span>
                <div>
                  <div className="text-xs font-black uppercase leading-tight text-[#191654] group-hover:text-white">
                    Super Administrador
                  </div>
                  <div className="text-[10px] text-slate-500 group-hover:text-white/80 font-mono mt-0.5">
                    appadmin@brainupgrup.com
                  </div>
                </div>
              </div>
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-sm bg-white group-hover:bg-white/20 text-[#191654] group-hover:text-white border border-[#D8CFF0] group-hover:border-transparent shrink-0 shadow-2xs">
                Entrar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
