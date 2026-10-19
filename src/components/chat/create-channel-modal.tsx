'use client';

import React, { useState } from 'react';
import { X, Building2, Hash, MessageSquare, Plus } from 'lucide-react';
import { Company, Profile } from '@/types/database';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'client' | 'group' | 'dm';
  companies: Company[];
  profiles: Profile[];
  onCreateChannel: (
    name: string,
    type: 'client' | 'group' | 'dm',
    companyId?: string | null,
    description?: string
  ) => void;
}

export function CreateChannelModal({
  isOpen,
  onClose,
  type,
  companies,
  profiles,
  onCreateChannel,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');
  const [selectedUserId, setSelectedUserId] = useState<string>(profiles[0]?.id || '');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'client') {
      const comp = companies.find((c) => c.id === selectedCompanyId);
      const channelName = name.trim() || comp?.name || 'nuevo-cliente';
      onCreateChannel(
        channelName,
        'client',
        selectedCompanyId,
        description || `Canal de cliente para ${comp?.name || channelName}`
      );
    } else if (type === 'dm') {
      const prof = profiles.find((p) => p.id === selectedUserId);
      onCreateChannel(
        prof?.full_name || 'Chat Privado',
        'dm',
        null,
        `Chat directo con ${prof?.full_name}`
      );
    } else {
      if (!name.trim()) return;
      onCreateChannel(name.trim(), 'group', null, description);
    }

    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#D8CFF0] rounded-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xs bg-[#8E0E75] text-white">
              {type === 'client' ? (
                <Building2 className="h-4 w-4" />
              ) : type === 'dm' ? (
                <MessageSquare className="h-4 w-4" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#292929]">
              {type === 'client'
                ? 'Nuevo Canal de Cliente'
                : type === 'dm'
                ? 'Iniciar Mensaje Directo'
                : 'Nuevo Grupo Interno'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-xs hover:bg-[#F8F6FC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {type === 'client' && (
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                Empresa / Cliente Asociado *
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  const comp = companies.find((c) => c.id === e.target.value);
                  if (comp) setName(comp.name.toLowerCase().replace(/\s+/g, '-'));
                }}
                className="w-full p-2 rounded-sm border border-[#D8CFF0] text-xs font-bold text-[#292929] outline-none bg-white focus:border-[#8E0E75]"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.client_type === 'cuota' ? 'Cuota' : 'Puntual'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'dm' && (
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                Selecciona Compañero de Equipo *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-2 rounded-sm border border-[#D8CFF0] text-xs font-bold text-[#292929] outline-none bg-white focus:border-[#8E0E75]"
              >
                {profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name} ({prof.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {type !== 'dm' && (
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                Nombre del Canal (sin espacios) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">#</span>
                <input
                  type="text"
                  required
                  placeholder="ej. campana-navidad"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full pl-6 pr-2.5 py-1.5 rounded-sm border border-[#D8CFF0] text-xs font-bold text-[#292929] outline-none focus:border-[#8E0E75]"
                />
              </div>
            </div>
          )}

          {type !== 'dm' && (
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#4A4A4A]">
                Propósito o Descripción Breve
              </label>
              <input
                type="text"
                placeholder="Para qué se utilizará este canal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-sm border border-[#D8CFF0] text-xs font-medium text-[#292929] outline-none focus:border-[#8E0E75]"
              />
            </div>
          )}

          {/* Botones */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-[#D8CFF0] text-xs font-bold text-[#4A4A4A] hover:bg-[#F8F6FC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Crear Canal</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
