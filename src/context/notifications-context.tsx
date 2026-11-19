'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PostItItem } from '@/types/postit';
import { useAuth } from '@/context/auth-context';

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

const STORAGE_KEY_PREFIX = 'brainup_suite_notifications_v1';

function buildSeedNotifications(): AppNotification[] {
  return [
    {
      id: 'notif-welcome',
      title: 'Bienvenido al Centro de Notificaciones',
      message: 'Aquí recibirás las alertas automáticas de tus Post-its, recordatorios con antelación y tareas pendientes.',
      source: 'system',
      date: new Date().toISOString(),
      read: false,
      urgency: 'info',
    },
  ];
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);
  notificationsRef.current = notifications;
  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const persistLocalCache = useCallback((list: AppNotification[]) => {
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(list));
    } catch (e) {
      console.warn('Error guardando caché local de notificaciones:', e);
    }
  }, []);

  // Cargar notificaciones desde caché local e hidratar desde Supabase (/api/data/notifications)
  useEffect(() => {
    let mounted = true;
    let localSeed: AppNotification[] = [];

    try {
      const raw = localStorage.getItem(storageKey) || localStorage.getItem(STORAGE_KEY_PREFIX);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localSeed = parsed;
        }
      }
    } catch (e) {
      console.warn('Error cargando notificaciones locales:', e);
    }

    if (localSeed.length === 0) {
      localSeed = buildSeedNotifications();
      persistLocalCache(localSeed);
    }
    setNotifications(localSeed);

    if (!user?.id) return;

    fetch('/api/data/notifications', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json?.success) return;
        if (json.tableReady) {
          const remoteList = Array.isArray(json.notifications) ? (json.notifications as AppNotification[]) : [];
          if (remoteList.length > 0) {
            setNotifications(remoteList);
            persistLocalCache(remoteList);
          } else if (localSeed.length > 0) {
            // Sembrar la primera vez en Supabase sin duplicar
            fetch('/api/data/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notifications: localSeed.slice(0, 30) }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [user?.id, storageKey, persistLocalCache]);

  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'date' | 'read'> & { id?: string }) => {
      const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (notificationsRef.current.some((n) => n.id === id)) {
        return;
      }

      const created: AppNotification = {
        ...notif,
        id,
        date: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        const updated = [created, ...prev];
        notificationsRef.current = updated;
        persistLocalCache(updated);
        return updated;
      });

      if (user?.id) {
        fetch('/api/data/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification: created }),
        }).catch(() => {});
      }
    },
    [persistLocalCache, user?.id]
  );

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persistLocalCache(updated);
        return updated;
      });

      if (user?.id) {
        fetch('/api/data/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        }).catch(() => {});
      }
    },
    [persistLocalCache, user?.id]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistLocalCache(updated);
      return updated;
    });

    if (user?.id) {
      fetch('/api/data/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      }).catch(() => {});
    }
  }, [persistLocalCache, user?.id]);

  const deleteNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        persistLocalCache(updated);
        return updated;
      });

      if (user?.id) {
        fetch(`/api/data/notifications?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    },
    [persistLocalCache, user?.id]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKeyRef.current);
    } catch (e) {
      console.warn(e);
    }

    if (user?.id) {
      fetch('/api/data/notifications?all=1', {
        method: 'DELETE',
      }).catch(() => {});
    }
  }, [user?.id]);

  // Sincronizar y generar notificaciones automáticas para los Post-its
  const syncPostItReminders = useCallback(
    (postIts: PostItItem[]) => {
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
        const currentExistingIds = new Set(notificationsRef.current.map((n) => n.id));
        const toAddSync = newAlerts.filter((a) => !currentExistingIds.has(a.id));
        if (toAddSync.length === 0) return;

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
          if (toAdd.length === 0) return prev;
          const updated = [...toAdd, ...prev];
          notificationsRef.current = updated;
          persistLocalCache(updated);
          return updated;
        });

        if (user?.id) {
          fetch('/api/data/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifications: toAddSync }),
          }).catch(() => {});
        }
      }
    },
    [persistLocalCache, user?.id]
  );

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
