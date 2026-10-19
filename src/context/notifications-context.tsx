'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PostItItem } from '@/types/postit';

export type NotificationSource = 'postit' | 'taskflow' | 'clockify' | 'system';
export type NotificationUrgency = 'normal' | 'alta' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  source: NotificationSource;
  date: string; // ISO timestamp
  read: boolean;
  urgency?: NotificationUrgency;
  relatedId?: string; // ID del post-it o tarea asociada
  reminderLabel?: string; // ej. "20 días antes", "1 hora antes"
  targetDate?: string;
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'> & { id?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  syncPostItReminders: (postIts: PostItItem[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'brainup_suite_notifications_v1';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar notificaciones persistidas en el inicio
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      } else {
        // Notificaciones iniciales de bienvenida / sistema
        const seedNotifications: AppNotification[] = [
          {
            id: 'notif-welcome',
            title: 'Bienvenido al Centro de Notificaciones',
            message: 'Aquí recibirás las alertas automáticas de tus Post-its, recordatorios con antelación y tareas pendientes.',
            source: 'system',
            date: new Date().toISOString(),
            read: false,
            urgency: 'info',
          },
          {
            id: 'notif-sample-postit',
            title: 'Recordatorio Post-it: Revisión trimestral',
            message: 'Alerta programada (20 días antes): entrega de informe Q4 fijada.',
            source: 'postit',
            date: new Date(Date.now() - 3600000).toISOString(),
            read: false,
            urgency: 'normal',
            reminderLabel: '20 días antes',
          },
        ];
        setNotifications(seedNotifications);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedNotifications));
      }
    } catch (e) {
      console.warn('Error cargando notificaciones de localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Guardar en localStorage ante cualquier cambio
  const saveNotifications = useCallback((updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error guardando notificaciones en localStorage', e);
    }
  }, []);

  const addNotification = useCallback((
    notif: Omit<AppNotification, 'id' | 'date' | 'read'> & { id?: string }
  ) => {
    setNotifications((prev) => {
      const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // Evitar duplicados por id
      if (prev.some((n) => n.id === id)) {
        return prev;
      }
      const newEntry: AppNotification = {
        ...notif,
        id,
        date: new Date().toISOString(),
        read: false,
      };
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Sincronizar y generar notificaciones automáticas para los Post-its
  const syncPostItReminders = useCallback((postIts: PostItItem[]) => {
    const now = Date.now();
    const newAlerts: AppNotification[] = [];

    postIts.forEach((postIt) => {
      if (postIt.isCompleted) return;

      const targetDateStr = postIt.targetDate;
      const targetTimeStr = postIt.targetTime || '09:00';
      const targetTimestamp = new Date(`${targetDateStr}T${targetTimeStr}:00`).getTime();

      if (isNaN(targetTimestamp)) return;

      postIt.reminders.forEach((rem) => {
        const triggerTime = targetTimestamp - rem.offsetMinutes * 60 * 1000;
        const uniqueId = `notif-postit-${postIt.id}-${rem.id}`;

        // Si ya llegó el momento de disparo
        if (now >= triggerTime) {
          newAlerts.push({
            id: uniqueId,
            title: `Recordatorio Post-it: ${postIt.title}`,
            message: `${rem.label}: Fecha límite ${postIt.targetDate} a las ${targetTimeStr}. Nota: "${postIt.content.slice(0, 70)}${postIt.content.length > 70 ? '...' : ''}"`,
            source: 'postit',
            date: new Date(Math.max(triggerTime, now - 86400000)).toISOString(),
            read: false,
            urgency: rem.offsetMinutes <= 60 ? 'alta' : 'normal',
            relatedId: postIt.id,
            reminderLabel: rem.label,
            targetDate: postIt.targetDate,
            link: '/apps/taskflow?tab=postits',
          });
        }
      });
    });

    if (newAlerts.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
        if (toAdd.length === 0) return prev;

        const updated = [...toAdd, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn(e);
        }
        return updated;
      });
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        syncPostItReminders,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de un NotificationProvider');
  }
  return context;
}
