'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  Building2, 
  Hash, 
  MessageSquare, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Pin,
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Channel } from '@/types/chat';

interface ChannelsSidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  isSummaryActive: boolean;
  onSelectSummary: () => void;
  onSelectChannel: (channelId: string) => void;
  onOpenCreateChannelModal: (type: 'client' | 'group' | 'dm') => void;
  pendingActionItemsCount: number;
}

export function ChannelsSidebar({
  channels,
  selectedChannelId,
  isSummaryActive,
  onSelectSummary,
  onSelectChannel,
  onOpenCreateChannelModal,
  pendingActionItemsCount,
}: ChannelsSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientsOpen, setIsClientsOpen] = useState(true);
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);
  const [isDmsOpen, setIsDmsOpen] = useState(true);

  // Filtrar canales según búsqueda
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientChannels = filteredChannels.filter((c) => c.type === 'client');
  const groupChannels = filteredChannels.filter((c) => c.type === 'group');
  const dmChannels = filteredChannels.filter((c) => c.type === 'dm');

  return (
    <aside className="w-64 h-full bg-gradient-to-b from-[#191654] to-[#8E0E75] text-white flex flex-col border-r border-white/10 shrink-0 select-none overflow-hidden">
      
      {/* Cabecera del Espacio de Trabajo */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white leading-tight flex items-center gap-1.5">
            <span>Brain Up Comms</span>
          </h2>
          <p className="text-[10px] text-white/60 font-medium">
            Canales Clientes & Equipo
          </p>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-white/15 text-white/90 uppercase tracking-widest">
          Slack Hub
        </span>
      </div>

      {/* Buscador Rápido de Canales */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Ir a canal o compañero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-sm bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-white/40 border border-transparent focus:border-white/30 outline-none transition-all"
          />
        </div>
      </div>

      {/* Lista de Secciones con Scroll Interno Confinado */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 custom-scrollbar text-xs">
        
        {/* SECCIÓN 1: MI RESUMEN (PENDIENTES & ANTI-RUIDO) */}
        <div>
          <button
            type="button"
            onClick={onSelectSummary}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-all cursor-pointer ${
              isSummaryActive
                ? 'bg-white/25 text-white font-extrabold shadow-xs ring-1 ring-white/30'
                : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Inbox className={`h-4 w-4 shrink-0 ${isSummaryActive ? 'text-amber-300' : 'text-white/70'}`} />
              <span className="truncate">Mi Resumen (Lo Importante)</span>
            </div>
            {pendingActionItemsCount > 0 ? (
              <span className="h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 shadow-xs">
                {pendingActionItemsCount}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-300 font-bold">
                Al día
              </span>
            )}
          </button>
        </div>

        {/* SECCIÓN 2: CANALES DE CLIENTES */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-white/60 hover:text-white">
            <button
              type="button"
              onClick={() => setIsClientsOpen(!isClientsOpen)}
              className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider cursor-pointer"
            >
              {isClientsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Building2 className="h-3 w-3 text-white/70" />
              <span>Clientes ({clientChannels.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateChannelModal('client')}
              className="h-4 w-4 rounded-xs flex items-center justify-center hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Añadir canal de cliente"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {isClientsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {clientChannels.length === 0 ? (
                <p className="px-5 py-1 text-[11px] text-white/40 italic">No hay canales</p>
              ) : (
                clientChannels.map((channel) => {
                  const isActive = !isSummaryActive && selectedChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => onSelectChannel(channel.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1 rounded-sm text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/25 text-white font-extrabold shadow-xs ring-1 ring-white/30'
                          : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white/50 font-bold shrink-0">#</span>
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {channel.unread_count && channel.unread_count > 0 ? (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#8E0E75] text-white text-[9px] font-black flex items-center justify-center shrink-0 border border-white/20">
                          {channel.unread_count}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 3: GRUPOS INTERNOS */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-white/60 hover:text-white">
            <button
              type="button"
              onClick={() => setIsGroupsOpen(!isGroupsOpen)}
              className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider cursor-pointer"
            >
              {isGroupsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Hash className="h-3 w-3 text-white/70" />
              <span>Grupos Internos ({groupChannels.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateChannelModal('group')}
              className="h-4 w-4 rounded-xs flex items-center justify-center hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Añadir grupo interno"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {isGroupsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {groupChannels.map((channel) => {
                const isActive = !isSummaryActive && selectedChannelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-sm text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/25 text-white font-extrabold shadow-xs ring-1 ring-white/30'
                        : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/50 font-bold shrink-0">#</span>
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.unread_count && channel.unread_count > 0 ? (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-[#8E0E75] text-white text-[9px] font-black flex items-center justify-center shrink-0 border border-white/20">
                        {channel.unread_count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN 4: MENSAJES DIRECTOS (DMs) */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-white/60 hover:text-white">
            <button
              type="button"
              onClick={() => setIsDmsOpen(!isDmsOpen)}
              className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider cursor-pointer"
            >
              {isDmsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <MessageSquare className="h-3 w-3 text-white/70" />
              <span>Mensajes Directos</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateChannelModal('dm')}
              className="h-4 w-4 rounded-xs flex items-center justify-center hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Iniciar chat privado"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {isDmsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {dmChannels.map((channel) => {
                const isActive = !isSummaryActive && selectedChannelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-sm text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/25 text-white font-extrabold shadow-xs ring-1 ring-white/30'
                        : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-[#3BB54A] shrink-0 ring-1 ring-white/20" />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.unread_count && channel.unread_count > 0 ? (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-[#8E0E75] text-white text-[9px] font-black flex items-center justify-center shrink-0 border border-white/20">
                        {channel.unread_count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Pie de Barra de Canales: Estado de Conexión Realtime */}
      <div className="p-2.5 bg-black/15 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3BB54A] animate-pulse" />
          <span className="font-bold">Realtime Activo</span>
        </div>
        <span className="text-[9px] opacity-75">Supabase v15</span>
      </div>

    </aside>
  );
}
