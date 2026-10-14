'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  UserPlus, 
  Mail, 
  User, 
  Briefcase, 
  Lock, 
  CheckCircle2, 
  ArrowLeft,
  Clock,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';

export default function RegisterEmployeePage() {
  const { isSupabaseConnected } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Marketing Digital & Creatividad');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConnected) {
        const supabase = createClient();
        
        // 1. Crear en auth si aplica o insertar directamente en profiles con status: 'pending'
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            role: 'employee',
            status: 'pending',
            department: department.trim(),
          });

        if (profileError) {
          console.error(profileError);
          // Si falla por RLS o clave duplicada, intentamos fallback informativo
          if (profileError.code === '23505') {
            setErrorMsg('Este correo ya tiene una solicitud o cuenta registrada.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Guardar también en localStorage para que el coordinador local lo visualice al instante
      const pendingUsers = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]');
      pendingUsers.push({
        id: `u_${Date.now()}`,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: 'employee',
        status: 'pending',
        department: department.trim(),
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('bug_clockify_pending_users', JSON.stringify(pendingUsers));

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FC] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Tarjeta de Registro */}
      <div className="w-full max-w-lg bg-white border border-[#D8CFF0] rounded-sm shadow-xl p-8 sm:p-10 space-y-6">
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
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#292929]">
              REGISTRO DE <span className="text-[#8E0E75]">NUEVO EMPLEADO</span>
            </h1>
            <p className="text-xs text-[#4A4A4A] font-light mt-1">
              Enlace oficial de invitación para el equipo de <span className="font-bold text-[#8E0E75]">Brain Up Grup</span>
            </p>
          </div>
        </div>

        {/* Estado Enviado con Éxito */}
        {isSubmitted ? (
          <div className="space-y-5 text-center py-4">
            <div className="h-14 w-14 rounded-full bg-[#3BB54A]/10 text-[#3BB54A] border border-[#3BB54A]/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-extrabold uppercase tracking-tight text-[#292929]">
                ¡SOLICITUD ENVIADA AL COORDINADOR!
              </h2>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Tu cuenta para <span className="font-bold text-[#292929]">{email}</span> ha sido registrada correctamente.
              </p>
            </div>

            <div className="p-4 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8E0E75]">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Estado: Pendiente de Aceptación</span>
              </div>
              <p className="text-[11px] text-[#4A4A4A] font-light leading-normal">
                Por protocolo de seguridad de la agencia, el <strong className="text-[#292929]">Coordinador de Brain Up Grup</strong> debe aceptar tu solicitud desde el panel de control. En cuanto sea aprobada, tu perfil pasará a estar activo para imputar jornadas y horas.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/employee"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all shadow-md shadow-[#8E0E75]/25"
              >
                <span>Ir al Panel Principal</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Formulario de Registro */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-[#8E0E75] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#4A4A4A] leading-normal font-light">
                Has accedido mediante el <strong>enlace de empresa</strong>. Rellena tus datos para solicitar el alta. El coordinador validará tu cuenta.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Nombre y Apellidos */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Nombre y Apellidos
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej. Marc Torrent"
                  className="w-full px-4 py-2.5 pl-10 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email Corporativo */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Email Corporativo o Personal
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.nombre@brainupgrup.com"
                  className="w-full px-4 py-2.5 pl-10 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                />
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Departamento / Especialidad */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Departamento o Especialidad
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="ej. Marketing Digital, Diseño UX, Copywriting..."
                  className="w-full px-4 py-2.5 pl-10 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                />
                <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Contraseña de acceso */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#292929] mb-1.5">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 pl-10 rounded-sm border border-[#D8CFF0] bg-white text-xs text-[#292929] placeholder:text-slate-400 focus:border-[#8E0E75] focus:ring-2 focus:ring-[#8E0E75]/15 outline-none transition-all"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#8E0E75]/25 cursor-pointer mt-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Enviando Solicitud...' : 'Solicitar Alta de Empleado'}</span>
            </button>
          </form>
        )}

        {/* Pie de página con enlace */}
        <div className="pt-4 border-t border-[#EAE4F5] text-center">
          <Link
            href="/dashboard/coordinator"
            className="inline-flex items-center gap-1.5 text-xs text-[#4A4A4A] hover:text-[#8E0E75] font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a la aplicación principal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
