'use client';

import React from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Circle, 
  Building2, 
  Pin, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  MessageSquare,
  Check,
  Calendar,
  Layers
} from 'lucide-react';
import { Channel, ChatMessage } from '@/types/chat';
import { Profile } from '@/types/database';

interface SummaryDashboardProps {
  currentUser: Profile | null;
  channels: Channel[];
  actionItems: ChatMessage[];
  pinnedMessages: ChatMessage[];
  onToggleCompleteActionItem: (messageId: string, currentStatus: boolean) => void;
  onNavigateToChannel: (channelId: string) => void;
}

export function SummaryDashboard({
  currentUser,
  channels,
  actionItems,
  pinnedMessages,
  onToggleCompleteActionItem,
  onNavigateToChannel,
}: SummaryDashboardProps) {
  const firstName = currentUser?.full_name?.split(' ')[0] || 'Compañero';

  // Tareas pendientes asignadas al usuario actual
  const pendingTasks = actionItems.filter((item) => !item.is_completed);
  const completedTasks = actionItems.filter((item) => item.is_completed);

  // Canales de clientes con novedades / no leídos
  const clientChannelsWithUpdates = channels.filter(
    (c) => c.type === 'client' && ((c.unread_count && c.unread_count > 0) || c.last_message_at)
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-4 sm:p-6 lg:p-8 space-y-6 select-none custom-scrollbar">
      
      {/* Banner de Bienvenida "Anti-Ruido" */}
      <div className="rounded-sm bg-gradient-to-r from-[#191654]/5 via-[#8E0E75]/5 to-transparent border border-[#D8CFF0] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-xs bg-[#8E0E75] text-white text-[11px] font-black uppercase tracking-wider">
              Panel Anti-Ruido
            </span>
            <span className="text-xs font-bold text-[#8E0E75]">
              Brain Up Comms
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#292929]">
            ¡Hola, {firstName}! Esto es lo importante de hoy
          </h1>
          <p className="text-xs text-[#4A4A4A] max-w-2xl leading-relaxed">
            Ponte al día en 30 segundos. Consulta tus tareas pendientes por cliente, los avisos fijados de la agencia y las últimas novedades sin perderte en el ruido.
          </p>
        </div>

        {/* Contador Rápido de Tareas */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-sm border border-[#D8CFF0] shadow-xs">
          <div className="p-2 rounded-xs bg-[#F8F6FC] text-[#8E0E75]">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black text-[#292929] leading-none">
              {pendingTasks.length}
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75] mt-0.5">
              Por Revisar
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 1: "PARA HACER / REVISAR POR TI" (Agrupado por Cliente / Canal) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xs bg-[#8E0E75] text-white">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#292929]">
              Para Hacer / Revisar por ti ({pendingTasks.length})
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#4A4A4A]">
            {completedTasks.length} completadas recientemente
          </span>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="rounded-sm bg-[#F8F6FC] border border-dashed border-[#D8CFF0] p-6 text-center space-y-2">
            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold text-[#292929]">
              ¡Estás completamente al día! No tienes tareas ni revisiones pendientes.
            </p>
            <p className="text-[11px] text-[#4A4A4A]">
              Los mensajes marcados como tarea en cualquier canal de cliente aparecerán automáticamente aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTasks.map((task) => {
              const isUrgent = task.priority === 'urgent';
              return (
                <div
                  key={task.id}
                  className="rounded-sm border border-[#D8CFF0] bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 border-l-4 border-l-[#8E0E75] relative group"
                >
                  <div className="space-y-2">
                    {/* Cabecera de la tarjeta: Cliente y Prioridad */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-3.5 w-3.5 text-[#8E0E75] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#8E0E75] truncate">
                          {task.company_name || task.channel_name || 'Cliente'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold">
                          #{task.channel_name}
                        </span>
                      </div>
                      {isUrgent && (
                        <span className="text-[11px] font-black uppercase px-1.5 py-0.5 rounded-2xs bg-red-100 text-red-700 tracking-wider">
                          Urgente
                        </span>
                      )}
                    </div>

                    {/* Contenido del Mensaje / Tarea */}
                    <p className="text-xs font-medium text-[#292929] leading-relaxed">
                      {task.content}
                    </p>

                    {/* Autor y fecha */}
                    <div className="flex items-center gap-2 text-[11px] text-[#4A4A4A]">
                      <span className="font-bold text-[#191654]">
                        Asignado por: {task.sender_name || 'Compañero'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(task.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción Directa: Marcar Revisado y Navegar al Canal */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F8F6FC] gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleCompleteActionItem(task.id, false)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-white hover:bg-emerald-50 text-[#3BB54A] border border-[#3BB54A] text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                      title="Marcar como revisado / hecho"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Completar / Revisado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateToChannel(task.channel_id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#8E0E75] hover:text-[#700B5C] transition-all cursor-pointer"
                      title="Abrir canal"
                    >
                      <span>Ir al canal</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BLOQUE 2 Y BLOQUE 3 EN DOS COLUMNAS PARALELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BLOQUE 2: "NOVEDADES EN TUS CLIENTES (NO LEÍDOS)" */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xs bg-[#191654] text-white">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#292929]">
                Novedades en tus Clientes
              </h2>
            </div>
            <span className="text-[11px] font-bold text-[#4A4A4A]">
              Canales de Empresas
            </span>
          </div>

          <div className="space-y-2">
            {clientChannelsWithUpdates.slice(0, 4).map((channel) => {
              const hasUnread = channel.unread_count && channel.unread_count > 0;
              return (
                <div
                  key={channel.id}
                  onClick={() => onNavigateToChannel(channel.id)}
                  className={`p-3 rounded-sm border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    hasUnread
                      ? 'bg-[#F8F6FC] border-[#8E0E75] shadow-2xs'
                      : 'bg-white border-[#D8CFF0] hover:bg-[#F8F6FC]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#292929] uppercase tracking-wide truncate">
                        #{channel.name}
                      </span>
                      {hasUnread && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#8E0E75] text-white text-[11px] font-black flex items-center justify-center">
                          {channel.unread_count} nuevos
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#4A4A4A] truncate">
                      {channel.description || 'Seguimiento de cuenta y entregables'}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-[#8E0E75] shrink-0" />
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOQUE 3: "AVISOS FIJADOS RECIENTES" */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xs bg-[#8E0E75] text-white">
                <Pin className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#292929]">
                Avisos Fijados Recientes ({pinnedMessages.length})
              </h2>
            </div>
            <span className="text-[11px] font-bold text-[#4A4A4A]">
              Información Clave
            </span>
          </div>

          <div className="space-y-2">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-[#4A4A4A] italic py-4">No hay mensajes fijados en este momento.</p>
            ) : (
              pinnedMessages.slice(0, 4).map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => onNavigateToChannel(msg.channel_id)}
                  className="p-3 rounded-sm border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] transition-all cursor-pointer flex items-start gap-2.5"
                >
                  <div className="p-1 rounded-xs bg-amber-50 text-amber-700 shrink-0 mt-0.5">
                    <Pin className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                        #{msg.channel_name || 'Canal'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(msg.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#292929] line-clamp-2 font-medium">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

    </div>
  );
}
