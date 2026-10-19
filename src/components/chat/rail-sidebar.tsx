'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Inbox, 
  MessageSquare, 
  CheckSquare, 
  Building2, 
  Clock, 
  Calendar as CalendarIcon, 
  LayoutGrid,
  Hash
} from 'lucide-react';
import { Profile } from '@/types/database';

interface RailSidebarProps {
  activeTab: 'summary' | 'clients' | 'groups' | 'dms';
  onSelectTab: (tab: 'summary' | 'clients' | 'groups' | 'dms') => void;
  pendingCount: number;
  currentUser: Profile | null;
}

export function RailSidebar({
  activeTab,
  onSelectTab,
  pendingCount,
  currentUser,
}: RailSidebarProps) {
  const userInitials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'BU';

  return (
    <aside className="w-16 h-full bg-[#191654] flex flex-col items-center justify-between py-3 px-1 border-r border-[#191654]/40 shrink-0 z-20 select-none">
      
      {/* Parte Superior: Avatar de La Abuela + Navegación Rápida */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Avatar Oficial "La Abuela" */}
        <Link
          href="/hub"
          title="Volver al HUB de Aplicaciones"
          className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-[#8E0E75]/40 hover:ring-[#8E0E75] transition-all bg-[#F8F6FC] flex items-center justify-center group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Brain Up Grup"
            className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Separador fino */}
        <div className="w-8 h-px bg-white/10" />

        {/* Botón 1: Resumen / Tareas Pendientes (Anti-Ruido) */}
        <button
          type="button"
          onClick={() => onSelectTab('summary')}
          className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer group ${
            activeTab === 'summary'
              ? 'bg-[#8E0E75] text-white shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Mi Resumen: Lo Importante de Hoy"
        >
          <Inbox className="h-5 w-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#191654] animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Botón 2: Canales de Clientes */}
        <button
          type="button"
          onClick={() => onSelectTab('clients')}
          className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer group ${
            activeTab === 'clients'
              ? 'bg-[#8E0E75] text-white shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Canales por Cliente"
        >
          <Building2 className="h-5 w-5" />
        </button>

        {/* Botón 3: Grupos Internos */}
        <button
          type="button"
          onClick={() => onSelectTab('groups')}
          className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer group ${
            activeTab === 'groups'
              ? 'bg-[#8E0E75] text-white shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Grupos Internos de la Agencia"
        >
          <Hash className="h-5 w-5" />
        </button>

        {/* Botón 4: Mensajes Directos (DMs) */}
        <button
          type="button"
          onClick={() => onSelectTab('dms')}
          className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer group ${
            activeTab === 'dms'
              ? 'bg-[#8E0E75] text-white shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Mensajes Directos con Compañeros"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      </div>

      {/* Parte Inferior: Enlaces a Suite + Avatar del Usuario Online */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Acceso Rápido a Clockify */}
        <Link
          href="/dashboard/employee"
          title="Ir a Brain Up Clockify"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <Clock className="h-4 w-4" />
        </Link>

        {/* Acceso Rápido a TaskFlow */}
        <Link
          href="/apps/taskflow"
          title="Ir a Brain Up TaskFlow"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <CalendarIcon className="h-4 w-4" />
        </Link>

        {/* Separador fino */}
        <div className="w-8 h-px bg-white/10" />

        {/* Avatar Usuario con Punto Verde Online */}
        <div 
          className="relative h-10 w-10 rounded-full bg-[#8E0E75] text-white font-extrabold text-xs flex items-center justify-center ring-2 ring-white/20 select-none cursor-pointer"
          title={`${currentUser?.full_name || 'Usuario'} (En línea)`}
        >
          <span>{userInitials}</span>
          <span 
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#3BB54A] ring-2 ring-[#191654]"
            title="Conectado en tiempo real"
          />
        </div>
      </div>

    </aside>
  );
}
