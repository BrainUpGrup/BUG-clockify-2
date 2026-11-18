'use client';

import { TimeEntry, Company, Profile } from '@/types/database';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/utils';

export interface OfflineSyncItem {
  queueId: string;
  action: 'insert' | 'update' | 'delete';
  id: string; // ID local temporal (local_...) o UUID real
  entry: Partial<TimeEntry>;
  userId: string;
  timestamp: number;
  attempts: number;
  lastError?: string;
}

const SYNC_QUEUE_KEY = 'bug_clockify_sync_queue';
let isSyncing = false;

/**
 * Obtiene la cola de sincronización pendiente desde localStorage
 */
export function getSyncQueue(): OfflineSyncItem[] {
  if (typeof window === 'undefined') return [];
  return safeGetLocalStorage<OfflineSyncItem[]>(SYNC_QUEUE_KEY, []);
}

/**
 * Guarda la cola de sincronización en localStorage
 */
export function setSyncQueue(queue: OfflineSyncItem[]): void {
  if (typeof window === 'undefined') return;
  safeSetLocalStorage(SYNC_QUEUE_KEY, queue);
  window.dispatchEvent(new CustomEvent('bug_clockify_sync_status_changed', { detail: { count: queue.length } }));
}

/**
 * Retorna el número de operaciones pendientes de sincronizar con la nube
 */
export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

/**
 * Guarda un registro de tiempo PRIMERO en LocalStorage con ID temporal local.
 * La interfaz de usuario lo ve y lo usa de forma instantánea sin latencia.
 * En paralelo y en segundo plano, se añade a la cola y se intenta sincronizar con Supabase.
 */
export function saveLocalFirstEntry(
  newEntryData: Omit<TimeEntry, 'id' | 'created_at' | 'user_id'> & { user_id?: string },
  user: Profile,
  targetCompany?: Company | null
): TimeEntry {
  const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const localEntry: TimeEntry = {
    id: tempId,
    user_id: user.id,
    company_id: newEntryData.company_id,
    work_date: newEntryData.work_date,
    start_time: newEntryData.start_time || null,
    end_time: newEntryData.end_time || null,
    duration_minutes: newEntryData.duration_minutes,
    description: newEntryData.description || 'Sin descripción',
    compute_type: newEntryData.compute_type || (targetCompany?.client_type === 'cuota' ? 'cuota' : 'puntual'),
    created_at: nowIso,
    company: targetCompany || undefined,
    profile: user,
  };

  if (typeof window !== 'undefined') {
    try {
      // 1. Guardar en caché del usuario
      const userCacheKey = `bug_clockify_cache_entries_${user.id}`;
      const existingUserEntries = safeGetLocalStorage<TimeEntry[]>(userCacheKey, []);
      const updatedUserEntries = [localEntry, ...existingUserEntries.filter((e) => e.id !== tempId)].slice(0, 300);
      safeSetLocalStorage(userCacheKey, updatedUserEntries);

      // 2. Guardar en caché general (coordinador/admin)
      const coordCacheKey = 'bug_clockify_cache_entries';
      const existingCoordEntries = safeGetLocalStorage<TimeEntry[]>(coordCacheKey, []);
      const updatedCoordEntries = [localEntry, ...existingCoordEntries.filter((e) => e.id !== tempId)].slice(0, 500);
      safeSetLocalStorage(coordCacheKey, updatedCoordEntries);

      // 3. Añadir a la cola de sincronización en segundo plano
      const queue = getSyncQueue();
      queue.push({
        queueId: tempId,
        action: 'insert',
        id: tempId,
        entry: localEntry,
        userId: user.id,
        timestamp: Date.now(),
        attempts: 0,
      });
      setSyncQueue(queue);

      // 4. Disparar eventos locales y multi-pestaña
      localStorage.setItem('bug_clockify_entry_trigger', JSON.stringify({
        timestamp: Date.now(),
        entryId: tempId,
        userId: user.id,
        durationMinutes: localEntry.duration_minutes,
      }));

      window.dispatchEvent(new CustomEvent('bug_clockify_entry_created', { detail: localEntry }));
    } catch (err) {
      console.warn('[OfflineTimeSync] Error saving to localStorage:', err);
    }

    // 5. Intentar subir inmediatamente a la nube en segundo plano (sin bloquear)
    setTimeout(() => {
      syncPendingEntries().catch((err) => console.warn('[OfflineTimeSync] Background sync err:', err));
    }, 50);
  }

  return localEntry;
}

/**
 * Actualiza un registro primero en LocalStorage y programa la sincronización
 */
export function updateLocalFirstEntry(
  id: string,
  updatedFields: Partial<TimeEntry>,
  userId: string,
  companies?: Company[]
): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Actualizar en caché del usuario
    const userCacheKey = `bug_clockify_cache_entries_${userId}`;
    const userEntries = safeGetLocalStorage<TimeEntry[]>(userCacheKey, []);
    const updatedUserEntries = userEntries.map((e) => {
      if (e.id !== id) return e;
      const newComp = updatedFields.company_id && companies
        ? companies.find((c) => c.id === updatedFields.company_id) || e.company
        : e.company;
      return { ...e, ...updatedFields, company: newComp };
    });
    safeSetLocalStorage(userCacheKey, updatedUserEntries);

    // 2. Actualizar en caché general
    const coordCacheKey = 'bug_clockify_cache_entries';
    const coordEntries = safeGetLocalStorage<TimeEntry[]>(coordCacheKey, []);
    const updatedCoordEntries = coordEntries.map((e) => (e.id === id ? { ...e, ...updatedFields } : e));
    safeSetLocalStorage(coordCacheKey, updatedCoordEntries);

    // 3. Añadir o actualizar en la cola de sincronización
    const queue = getSyncQueue();
    // Si ya hay un insert pendiente para este mismo ID local, actualizar el insert directamente
    const pendingInsert = queue.find((item) => item.action === 'insert' && item.id === id);
    if (pendingInsert) {
      pendingInsert.entry = { ...pendingInsert.entry, ...updatedFields };
      setSyncQueue(queue);
    } else {
      queue.push({
        queueId: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: 'update',
        id,
        entry: updatedFields,
        userId,
        timestamp: Date.now(),
        attempts: 0,
      });
      setSyncQueue(queue);
    }
  } catch (err) {
    console.warn('[OfflineTimeSync] Error updating local storage:', err);
  }

  setTimeout(() => {
    syncPendingEntries().catch((err) => console.warn('[OfflineTimeSync] Background sync err:', err));
  }, 50);
}

/**
 * Elimina un registro primero en LocalStorage y programa la eliminación en la nube
 */
export function deleteLocalFirstEntry(id: string, userId: string): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Eliminar de caché del usuario
    const userCacheKey = `bug_clockify_cache_entries_${userId}`;
    const userEntries = safeGetLocalStorage<TimeEntry[]>(userCacheKey, []);
    safeSetLocalStorage(userCacheKey, userEntries.filter((e) => e.id !== id));

    // 2. Eliminar de caché general
    const coordCacheKey = 'bug_clockify_cache_entries';
    const coordEntries = safeGetLocalStorage<TimeEntry[]>(coordCacheKey, []);
    safeSetLocalStorage(coordCacheKey, coordEntries.filter((e) => e.id !== id));

    // 3. Gestionar la cola
    let queue = getSyncQueue();
    if (id.startsWith('local_')) {
      // Como solo existía localmente y nunca llegó a la nube, simplemente quitamos sus acciones pendientes
      queue = queue.filter((item) => item.id !== id);
      setSyncQueue(queue);
    } else {
      // Si existía en la nube, añadir acción de delete
      queue.push({
        queueId: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: 'delete',
        id,
        entry: {},
        userId,
        timestamp: Date.now(),
        attempts: 0,
      });
      setSyncQueue(queue);
    }
  } catch (err) {
    console.warn('[OfflineTimeSync] Error deleting in local storage:', err);
  }

  setTimeout(() => {
    syncPendingEntries().catch((err) => console.warn('[OfflineTimeSync] Background sync err:', err));
  }, 50);
}

/**
 * Procesa la cola de sincronización en segundo plano cuando hay conexión a Internet
 */
export async function syncPendingEntries(): Promise<{ synced: number; remaining: number }> {
  if (typeof window === 'undefined') return { synced: 0, remaining: 0 };
  if (!navigator.onLine) {
    return { synced: 0, remaining: getPendingSyncCount() };
  }
  if (isSyncing) {
    return { synced: 0, remaining: getPendingSyncCount() };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  isSyncing = true;
  let syncedCount = 0;
  const remainingQueue: OfflineSyncItem[] = [];

  try {
    for (const item of queue) {
      try {
        if (item.action === 'insert') {
          const entry = item.entry;
          const payload = {
            company_id: entry.company_id,
            work_date: entry.work_date,
            start_time: entry.start_time || null,
            end_time: entry.end_time || null,
            duration_minutes: entry.duration_minutes,
            description: entry.description || 'Sin descripción',
            compute_type: entry.compute_type || 'cuota',
          };

          const res = await fetch('/api/data/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));

          if (!res.ok || !json?.entry) {
            const errMsg = json?.error || `HTTP ${res.status}`;
            console.warn('[OfflineTimeSync] Cloud insert failed for item:', item.id, errMsg);
            item.attempts += 1;
            item.lastError = errMsg;
            remainingQueue.push(item);
          } else {
            syncedCount += 1;
            const newCloudEntry = json.entry as TimeEntry;
            const oldTempId = item.id;

            // Reemplazar el ID temporal en localStorage por el UUID real de la nube
            if (oldTempId.startsWith('local_')) {
              const userCacheKey = `bug_clockify_cache_entries_${item.userId}`;
              const userEntries = safeGetLocalStorage<TimeEntry[]>(userCacheKey, []);
              const updatedUserEntries = userEntries.map((e) => (e.id === oldTempId ? newCloudEntry : e));
              safeSetLocalStorage(userCacheKey, updatedUserEntries);

              const coordCacheKey = 'bug_clockify_cache_entries';
              const coordEntries = safeGetLocalStorage<TimeEntry[]>(coordCacheKey, []);
              const updatedCoordEntries = coordEntries.map((e) => (e.id === oldTempId ? newCloudEntry : e));
              safeSetLocalStorage(coordCacheKey, updatedCoordEntries);

              // Si había actualizaciones posteriores encoladas con el ID local, renombrarlas al ID real
              for (const nextItem of remainingQueue) {
                if (nextItem.id === oldTempId) {
                  nextItem.id = newCloudEntry.id;
                }
              }

              window.dispatchEvent(
                new CustomEvent('bug_clockify_entry_synced', {
                  detail: { tempId: oldTempId, realEntry: newCloudEntry },
                })
              );
            }
          }
        } else if (item.action === 'update') {
          if (item.id.startsWith('local_')) {
            // Aún no tiene ID de nube, mantener en cola
            remainingQueue.push(item);
          } else {
            const res = await fetch('/api/data/time-entries', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.id, updates: item.entry }),
            });

            if (!res.ok) {
              const json = await res.json().catch(() => ({}));
              const errMsg = json?.error || `HTTP ${res.status}`;
              console.warn('[OfflineTimeSync] Cloud update failed for item:', item.id, errMsg);
              item.attempts += 1;
              item.lastError = errMsg;
              remainingQueue.push(item);
            } else {
              syncedCount += 1;
            }
          }
        } else if (item.action === 'delete') {
          if (item.id.startsWith('local_')) {
            // Ya eliminado localmente, no requiere acción en nube
            syncedCount += 1;
          } else {
            const res = await fetch(`/api/data/time-entries?id=${encodeURIComponent(item.id)}`, {
              method: 'DELETE',
            });

            if (!res.ok) {
              const json = await res.json().catch(() => ({}));
              const errMsg = json?.error || `HTTP ${res.status}`;
              console.warn('[OfflineTimeSync] Cloud delete failed for item:', item.id, errMsg);
              item.attempts += 1;
              item.lastError = errMsg;
              remainingQueue.push(item);
            } else {
              syncedCount += 1;
            }
          }
        }
      } catch (itemErr: any) {
        console.warn('[OfflineTimeSync] Unexpected error syncing item:', item.id, itemErr);
        item.attempts += 1;
        item.lastError = itemErr?.message || 'Error desconocido';
        remainingQueue.push(item);
      }
    }
  } finally {
    setSyncQueue(remainingQueue);
    isSyncing = false;
  }

  return { synced: syncedCount, remaining: remainingQueue.length };
}

/**
 * Inicializa los observadores automáticos de sincronización:
 * - Se activa en cuanto el navegador recupera la conexión a internet ('online')
 * - Se activa periódicamente cada 25 segundos para drenar la cola
 */
export function initOfflineSyncListeners(onStatusChange?: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    syncPendingEntries().catch((e) => console.warn('[OfflineTimeSync] Online trigger error:', e));
  };

  const handleStatusChange = () => {
    if (onStatusChange) {
      onStatusChange(getPendingSyncCount());
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('bug_clockify_sync_status_changed', handleStatusChange);

  // Intervalo periódico de sincronización automática cada 25 segundos
  const intervalId = setInterval(() => {
    if (navigator.onLine && getPendingSyncCount() > 0) {
      syncPendingEntries().catch((e) => console.warn('[OfflineTimeSync] Interval sync error:', e));
    }
  }, 25000);

  // Ejecución inicial si ya hay elementos pendientes
  if (navigator.onLine && getPendingSyncCount() > 0) {
    setTimeout(() => {
      syncPendingEntries().catch((e) => console.warn('[OfflineTimeSync] Initial sync error:', e));
    }, 1000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('bug_clockify_sync_status_changed', handleStatusChange);
    clearInterval(intervalId);
  };
}
