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
    } else if (user.role === 'coordinator') {
      router.replace('/dashboard/coordinator');
    } else {
      router.replace('/dashboard/employee');
    }
  }, [user, isLoading, router]);

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
