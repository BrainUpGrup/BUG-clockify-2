'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirección automática inmediata
    const timer = setTimeout(() => {
      router.replace('/dashboard/coordinator');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-sm p-8 border border-[#D8CFF0] text-center shadow-xl shadow-[#191654]/10">
        <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full ring-2 ring-[#8E0E75]/30 mb-4 bg-[#F8F6FC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Brain Up Grup - La Abuela"
            className="h-full w-full object-contain p-1"
          />
        </div>
        <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#292929]">
          BRAIN <span className="text-[#8E0E75]">UP</span> CLOCKIFY
        </h2>
        <p className="text-xs text-[#4A4A4A] font-light mt-1 mb-6">
          Accediendo con rol dual de <strong>Coordinador & Trabajador</strong>.
        </p>

        <button
          onClick={() => router.push('/dashboard/coordinator')}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] shadow-md shadow-[#8E0E75]/25 transition-all cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Acceder al Panel de Coordinador</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
