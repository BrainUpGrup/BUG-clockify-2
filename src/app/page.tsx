'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
    } else {
      router.replace('/hub');
    }
  }, [user, isLoading, router]);

  // Fallback de seguridad perimetral: si tras 1.2 segundos no ha redirigido, forzar navegación nativa
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('bug_clockify_current_user') : null;
        if (stored) {
          window.location.replace('/hub');
        } else {
          window.location.replace('/login');
        }
      } catch {
        window.location.replace('/login');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
          Verificando sesión en Brain Up Clockify...
        </p>
      </div>
    </div>
  );
}
