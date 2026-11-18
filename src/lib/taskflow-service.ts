import { TaskFlowItem, TaskList, DEFAULT_TASK_LISTS } from '@/lib/calendar-export';
import { SEED_TASKFLOW_ITEMS, STORAGE_KEY_ITEMS_V2 } from '@/lib/taskflow-data';
import { PostItItem } from '@/types/postit';

export const STORAGE_KEY_LISTS_V1 = 'bug_taskflow_lists_v1';
export const STORAGE_KEY_POSTITS_V1 = 'bug_taskflow_postits_v1';

async function fetchTaskflowResource(resource: 'items' | 'lists' | 'postits'): Promise<any[] | null> {
  const res = await fetch(`/api/data/taskflow?resource=${resource}`, { cache: 'no-store' });
  const json = await res.json();
  if (res.ok && json?.success && Array.isArray(json.rows)) {
    return json.rows;
  }
  return null;
}

async function upsertTaskflowResource(resource: 'items' | 'lists' | 'postits', records: any[]): Promise<void> {
  if (records.length === 0) return;
  const res = await fetch('/api/data/taskflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, records }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`Aviso guardando ${resource} en /api/data/taskflow:`, err?.error || res.status);
  }
}

async function deleteTaskflowResource(resource: 'items' | 'lists' | 'postits', id: string): Promise<void> {
  const res = await fetch(
    `/api/data/taskflow?resource=${resource}&id=${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`Aviso borrando ${resource} en /api/data/taskflow:`, err?.error || res.status);
  }
}

// ==============================================================================
// 1. TRANSFORMADORES: TAREAS (TaskFlowItem <-> Supabase taskflow_items)
// ==============================================================================

function toSupabaseItemPayload(item: TaskFlowItem) {
  return {
    id: item.id,
    type: item.type || 'task',
    title: item.title,
    description: item.description || null,
    company_id: item.companyId && item.companyId.trim() !== '' ? item.companyId.trim() : null,
    company_name: item.companyName || 'Brain Up Interno',
    status: item.status || 'todo',
    priority: item.priority || 'media',
    color_strip: item.colorStrip || 'purple',
    custom_color: item.customColor || null,
    list_id: item.listId || null,
    reschedule_mode: item.rescheduleMode || 'manual',
    auto_reschedule: Boolean(item.autoReschedule),
    reschedule_days: item.rescheduleDays ?? 1,
    date: item.date,
    start_time: item.startTime || null,
    end_time: item.endTime || null,
    location: item.location || null,
    meeting_url: item.meetingUrl || null,
    estimated_hours: item.estimatedHours ? Number(item.estimatedHours) : 0,
    created_by: item.createdBy || 'Equipo Brain Up',
    created_by_name: item.createdByName || null,
    is_shared: item.isShared !== undefined ? Boolean(item.isShared) : true,
    assignees: Array.isArray(item.assignees) ? item.assignees : ['Todos'],
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromSupabaseItem(row: any): TaskFlowItem {
  return {
    id: row.id,
    type: row.type || 'task',
    title: row.title,
    description: row.description || undefined,
    companyId: row.company_id || undefined,
    companyName: row.company_name || 'Brain Up Interno',
    status: row.status || 'todo',
    priority: row.priority || undefined,
    colorStrip: row.color_strip || undefined,
    customColor: row.custom_color || undefined,
    listId: row.list_id || undefined,
    rescheduleMode: row.reschedule_mode || 'manual',
    autoReschedule: Boolean(row.auto_reschedule),
    rescheduleDays: row.reschedule_days ?? 1,
    date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    location: row.location || undefined,
    meetingUrl: row.meeting_url || undefined,
    estimatedHours: row.estimated_hours ? Number(row.estimated_hours) : undefined,
    createdBy: row.created_by || 'Equipo Brain Up',
    createdByName: row.created_by_name || undefined,
    isShared: row.is_shared !== undefined ? Boolean(row.is_shared) : true,
    assignees: Array.isArray(row.assignees) ? row.assignees : ['Todos'],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Carga tareas y reuniones desde Supabase (con sincronización inicial y fallback a local)
 */
export async function getTaskFlowItemsFromDb(): Promise<TaskFlowItem[]> {
  try {
    const data = await fetchTaskflowResource('items');
    if (data) {
      if (data.length > 0) {
        const parsed = data.map(fromSupabaseItem);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(parsed));
        }
        return parsed;
      } else {
        console.info('Poblando tareas iniciales en tabla taskflow_items...');
        await upsertTaskflowResource('items', SEED_TASKFLOW_ITEMS.map(toSupabaseItemPayload));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(SEED_TASKFLOW_ITEMS));
        }
        return SEED_TASKFLOW_ITEMS;
      }
    }
  } catch (err) {
    console.warn('Aviso al cargar tareas de servidor, usando local:', err);
  }

  // Fallback a localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS_V2);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch { }
  }

  return SEED_TASKFLOW_ITEMS;
}

/**
 * Guarda o actualiza una tarea en Supabase y en localStorage
 */
export async function saveTaskFlowItemToDb(item: TaskFlowItem, allItems?: TaskFlowItem[]): Promise<TaskFlowItem> {
  const payload = toSupabaseItemPayload(item);

  try {
    await upsertTaskflowResource('items', [payload]);
  } catch (err) {
    console.warn('Error conectando con servidor para tarea:', err);
  }

  if (typeof window !== 'undefined' && allItems) {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(allItems));
      window.dispatchEvent(new CustomEvent('bug_taskflow_updated'));
    } catch (e) {
      console.error(e);
    }
  }

  return item;
}

/**
 * Guarda una lista completa de tareas en Supabase (por bloques) y en localStorage
 */
export async function batchSaveTaskFlowItemsToDb(items: TaskFlowItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    await upsertTaskflowResource('items', items.map(toSupabaseItemPayload));
  } catch (err) {
    console.warn('Error en batchSaveTaskFlowItemsToDb:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('bug_taskflow_updated'));
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Elimina una tarea por ID en Supabase y localmente
 */
export async function deleteTaskFlowItemFromDb(id: string, remainingItems?: TaskFlowItem[]): Promise<void> {
  try {
    await deleteTaskflowResource('items', id);
  } catch (err) {
    console.warn('Error al borrar tarea de servidor:', err);
  }

  if (typeof window !== 'undefined' && remainingItems) {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(remainingItems));
      window.dispatchEvent(new CustomEvent('bug_taskflow_updated'));
    } catch (e) {
      console.error(e);
    }
  }
}

// ==============================================================================
// 2. TRANSFORMADORES: LISTAS (TaskList <-> Supabase taskflow_lists)
// ==============================================================================

export async function getTaskListsFromDb(): Promise<TaskList[]> {
  try {
    const data = await fetchTaskflowResource('lists');
    if (data) {
      if (data.length > 0) {
        const parsed: TaskList[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
          createdAt: d.created_at,
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_LISTS_V1, JSON.stringify(parsed));
        }
        return parsed;
      } else {
        const payloads = DEFAULT_TASK_LISTS.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        }));
        await upsertTaskflowResource('lists', payloads);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_LISTS_V1, JSON.stringify(DEFAULT_TASK_LISTS));
        }
        return DEFAULT_TASK_LISTS;
      }
    }
  } catch (err) {
    console.warn('Aviso al cargar listas de servidor:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LISTS_V1);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch { }
  }

  return DEFAULT_TASK_LISTS;
}

export async function saveTaskListToDb(list: TaskList, allLists?: TaskList[]): Promise<void> {
  try {
    await upsertTaskflowResource('lists', [{
      id: list.id,
      name: list.name,
      color: list.color,
    }]);
  } catch (err) {
    console.warn('Error guardando lista en servidor:', err);
  }

  if (typeof window !== 'undefined' && allLists) {
    try {
      localStorage.setItem(STORAGE_KEY_LISTS_V1, JSON.stringify(allLists));
    } catch { }
  }
}

// ==============================================================================
// 3. TRANSFORMADORES: POST-ITS (PostItItem <-> Supabase taskflow_postits)
// ==============================================================================

function toSupabasePostItPayload(p: PostItItem) {
  return {
    id: p.id,
    title: p.title,
    content: p.content || '',
    color: p.color || 'yellow',
    target_date: p.targetDate,
    target_time: p.targetTime || '09:00',
    reminders: Array.isArray(p.reminders) ? p.reminders : [],
    is_pinned: Boolean(p.isPinned),
    is_completed: Boolean(p.isCompleted),
    pos_x: p.posX ?? 0,
    pos_y: p.posY ?? 0,
    width: p.width ?? 260,
    height: p.height ?? 220,
    z_index: p.zIndex ?? 1,
    size_preset: p.sizePreset || 'medium',
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromSupabasePostIt(row: any): PostItItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    color: row.color || 'yellow',
    targetDate: typeof row.target_date === 'string' ? row.target_date.split('T')[0] : row.target_date,
    targetTime: row.target_time || '09:00',
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
    createdAt: row.created_at || new Date().toISOString(),
    isPinned: Boolean(row.is_pinned),
    isCompleted: Boolean(row.is_completed),
    posX: row.pos_x !== null ? Number(row.pos_x) : undefined,
    posY: row.pos_y !== null ? Number(row.pos_y) : undefined,
    width: row.width !== null ? Number(row.width) : undefined,
    height: row.height !== null ? Number(row.height) : undefined,
    zIndex: row.z_index !== null ? Number(row.z_index) : undefined,
    sizePreset: row.size_preset || 'medium',
  };
}

/**
 * Carga post-its desde Supabase (con sincronización y fallback)
 */
export async function getPostItsFromDb(seedFallback: PostItItem[]): Promise<PostItItem[]> {
  try {
    const data = await fetchTaskflowResource('postits');
    if (data) {
      if (data.length > 0) {
        const parsed = data.map(fromSupabasePostIt);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_POSTITS_V1, JSON.stringify(parsed));
        }
        return parsed;
      } else if (seedFallback.length > 0) {
        await upsertTaskflowResource('postits', seedFallback.map(toSupabasePostItPayload));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_POSTITS_V1, JSON.stringify(seedFallback));
        }
        return seedFallback;
      }
    }
  } catch (err) {
    console.warn('Aviso cargando post-its de servidor:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTITS_V1);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch { }
  }

  return seedFallback;
}

/**
 * Guarda o actualiza un post-it en Supabase y localmente
 */
export async function savePostItToDb(postIt: PostItItem, allPostIts?: PostItItem[]): Promise<void> {
  const payload = toSupabasePostItPayload(postIt);

  try {
    await upsertTaskflowResource('postits', [payload]);
  } catch (err) {
    console.warn('Error al guardar post-it en servidor:', err);
  }

  if (typeof window !== 'undefined' && allPostIts) {
    try {
      localStorage.setItem(STORAGE_KEY_POSTITS_V1, JSON.stringify(allPostIts));
      window.dispatchEvent(new CustomEvent('bug_postits_updated'));
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Guarda un lote de post-its en Supabase (ej. auto-alinear o reposicionamiento)
 */
export async function batchSavePostItsToDb(postIts: PostItItem[]): Promise<void> {
  if (!postIts || postIts.length === 0) return;

  try {
    await upsertTaskflowResource('postits', postIts.map(toSupabasePostItPayload));
  } catch (err) {
    console.warn('Error en batchSavePostItsToDb:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_POSTITS_V1, JSON.stringify(postIts));
      window.dispatchEvent(new CustomEvent('bug_postits_updated'));
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Elimina un post-it por ID en Supabase y localmente
 */
export async function deletePostItFromDb(id: string, remainingPostIts?: PostItItem[]): Promise<void> {
  try {
    await deleteTaskflowResource('postits', id);
  } catch (err) {
    console.warn('Error al borrar post-it en servidor:', err);
  }

  if (typeof window !== 'undefined' && remainingPostIts) {
    try {
      localStorage.setItem(STORAGE_KEY_POSTITS_V1, JSON.stringify(remainingPostIts));
      window.dispatchEvent(new CustomEvent('bug_postits_updated'));
    } catch (e) {
      console.error(e);
    }
  }
}

