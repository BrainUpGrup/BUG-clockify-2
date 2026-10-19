'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  StickyNote, 
  Calendar, 
  Info, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNotifications, AppNotification } from '@/context/notifications-context';
import { PostItItem } from '@/types/postit';

interface NotificationsPanelProps {
  postIts?: PostItItem[];
  onOpenPostIt?: (postItId: string) => void;
  className?: string;
  isCompact?: boolean;
}

export function NotificationsPanel({
  postIts = [],
  onOpenPostIt,
  className = '',
  isCompact = false,
}: NotificationsPanelProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useNotifications();

  const [filterSource, setFilterSource] = useState<'all' | 'postit' | 'taskflow'>('all');
  const [showScheduled, setShowScheduled] = useState(false);

  // Filtrado de notificaciones activas
  const filteredNotifs = notifications.filter((n) => {
    if (filterSource === 'postit') return n.source === 'postit';
    if (filterSource === 'taskflow') return n.source === 'taskflow';
    return true;
  });

  // Calcular recordatorios futuros en cola procedentes de Post-its
  const now = Date.now();
  const futureReminders = postIts
    .filter((p) => !p.isCompleted)
    .flatMap((postIt) => {
      const targetTimeStr = postIt.targetTime || '09:00';
      const targetTimestamp = new Date(`${postIt.targetDate}T${targetTimeStr}:00`).getTime();
      if (isNaN(targetTimestamp)) return [];

      return postIt.reminders
        .map((rem) => {
          const triggerTime = targetTimestamp - rem.offsetMinutes * 60 * 1000;
          return {
            postItId: postIt.id,
            postItTitle: postIt.title,
            reminderLabel: rem.label,
            targetDate: postIt.targetDate,
            triggerTime,
            isFuture: triggerTime > now,
          };
        })
        .filter((r) => r.isFuture);
    })
    .sort((a, b) => a.triggerTime - b.triggerTime)
    .slice(0, 5);

  const getSourceBadge = (source: AppNotification['source']) => {
    switch (source) {
      case 'postit':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9px] uppercase tracking-wider">
            <StickyNote className="h-2.5 w-2.5" />
            <span>Post-it</span>
          </span>
        );
      case 'taskflow':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-purple-100 text-[#8E0E75] border border-purple-300 font-extrabold text-[9px] uppercase tracking-wider">
            <Calendar className="h-2.5 w-2.5" />
            <span>Tarea</span>
          </span>
        );
      case 'clockify':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[9px] uppercase tracking-wider">
            <Clock className="h-2.5 w-2.5" />
            <span>Clockify</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-[9px] uppercase tracking-wider">
            <Info className="h-2.5 w-2.5" />
            <span>Sistema</span>
          </span>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return `Hace ${diffDays} d`;
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#FAF9FD] overflow-hidden ${className}`}>
      
      {/* Cabecera del Panel */}
      <div className="p-2.5 border-b border-[#D8CFF0] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative p-1 rounded-sm bg-[#8E0E75] text-white">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-[#292929] leading-tight">
              Notificaciones
            </h3>
            <p className="text-[9px] text-[#4A4A4A] leading-tight">
              {notifications.length} registro(s) {unreadCount > 0 ? `· ${unreadCount} no leída(s)` : '· Al día'}
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="p-1 rounded-xs hover:bg-[#F8F6FC] text-[#8E0E75] transition-colors cursor-pointer"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1 rounded-xs hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Limpiar todas"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Filtro */}
      <div className="px-2 py-1.5 bg-[#F4F0FA] border-b border-[#EAE4F5] flex items-center gap-1 shrink-0 text-[10px]">
        <button
          type="button"
          onClick={() => setFilterSource('all')}
          className={`px-2 py-0.5 rounded-xs font-extrabold uppercase transition-all cursor-pointer ${
            filterSource === 'all'
              ? 'bg-[#8E0E75] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-white/80'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSource('postit')}
          className={`px-2 py-0.5 rounded-xs font-extrabold uppercase transition-all cursor-pointer ${
            filterSource === 'postit'
              ? 'bg-[#8E0E75] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-white/80'
          }`}
        >
          Post-its ({notifications.filter((n) => n.source === 'postit').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSource('taskflow')}
          className={`px-2 py-0.5 rounded-xs font-extrabold uppercase transition-all cursor-pointer ${
            filterSource === 'taskflow'
              ? 'bg-[#8E0E75] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-white/80'
          }`}
        >
          Tareas ({notifications.filter((n) => n.source === 'taskflow').length})
        </button>
      </div>

      {/* Lista Desplazable de Notificaciones: toma todo el espacio vertical disponible */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {filteredNotifs.length === 0 ? (
          <div className="py-8 px-3 text-center bg-white border border-dashed border-[#D8CFF0] rounded-sm">
            <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-[#292929]">Sin notificaciones pendientes</p>
            <p className="text-[9px] text-[#4A4A4A] mt-1 leading-snug">
              Los recordatorios programados de tus post-its (ej. 20d, 15d, 1d, 1h antes) y tareas aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`p-2 rounded-sm border transition-all text-xs relative group ${
                notif.read
                  ? 'bg-white border-[#EAE4F5] opacity-80 hover:opacity-100 shadow-2xs'
                  : 'bg-white border-[#8E0E75]/40 shadow-xs ring-1 ring-[#8E0E75]/15'
              }`}
            >
              {/* Barra superior de la notificación */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  {getSourceBadge(notif.source)}
                  <span className="text-[9px] text-slate-400 font-mono">
                    {formatRelativeTime(notif.date)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notif.id)}
                      className="p-0.5 rounded-xs text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors cursor-pointer"
                      title="Marcar como leída"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id)}
                    className="p-0.5 rounded-xs text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Eliminar notificación"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Título y Mensaje */}
              <h4 className={`text-[11px] font-black leading-tight text-[#292929] ${!notif.read ? 'text-[#8E0E75]' : ''}`}>
                {notif.title}
              </h4>
              <p className="text-[10px] text-[#4A4A4A] mt-0.5 leading-snug">
                {notif.message}
              </p>

              {/* Botón de acción hacia Post-it si corresponde */}
              {notif.source === 'postit' && notif.relatedId && onOpenPostIt && (
                <div className="mt-1.5 pt-1 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenPostIt(notif.relatedId!)}
                    className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#8E0E75] hover:underline cursor-pointer"
                  >
                    <span>Ver Post-it</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Sección Inferior Acoplada: Próximas Alertas en Cola */}
      {/* Permanece anclada en la base para que al retraerse jamás se corte el cuadro visual */}
      <div className="shrink-0 border-t border-[#D8CFF0] bg-white">
        <button
          type="button"
          onClick={() => setShowScheduled(!showScheduled)}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-extrabold text-[#8E0E75] uppercase hover:bg-[#F8F6FC] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#8E0E75]" />
            <span>Próximas Alertas en Cola ({futureReminders.length})</span>
          </div>
          {showScheduled ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#8E0E75]" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-[#8E0E75]" />
          )}
        </button>

        {showScheduled && (
          <div className="max-h-52 overflow-y-auto p-2 border-t border-[#EAE4F5] bg-[#F8F6FC] space-y-1.5">
            {futureReminders.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-2">
                No hay recordatorios futuros en cola
              </p>
            ) : (
              futureReminders.map((r, idx) => (
                <div key={idx} className="flex items-start justify-between gap-1 text-[9px] border-b border-dashed border-slate-200 pb-1.5 last:border-0 last:pb-0">
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-[#292929] block truncate max-w-[155px]">
                      {r.postItTitle}
                    </span>
                    <span className="text-[#8E0E75] font-semibold">{r.reminderLabel}</span>
                  </div>
                  <span className="text-slate-400 font-mono shrink-0">
                    Límite: {r.targetDate}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
