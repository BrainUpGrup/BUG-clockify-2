import { Profile } from '@/types/database';

export interface HubApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'operaciones' | 'gestion' | 'creatividad' | 'administracion';
  badge: string;
  iconName: 'Clock' | 'CheckSquare' | 'Image' | 'Users' | 'Receipt' | 'BookOpen' | 'Share2' | 'MessageSquare' | 'Video' | 'Server' | 'FolderCheck';
  route: string;
  isReady: boolean; // Si la app está totalmente implementada y operativa en el hub
  version: string;
}

/**
 * Catálogo Oficial de Herramientas del HUB de Brain Up
 */
export const BRAIN_UP_HUB_APPS: HubApp[] = [
  {
    id: 'clockify',
    name: 'Brain Time',
    tagline: 'Control Horario & Cuotas de Clientes',
    description: 'Imputación precisa de tiempo por cliente, balance de cuotas mensuales al milímetro y generación de informes ejecutivos en PDF.',
    category: 'operaciones',
    badge: 'Operativa',
    iconName: 'Clock',
    route: '/dashboard/employee',
    isReady: true,
    version: '2.5.0',
  },
  {
    id: 'taskflow',
    name: 'Brain Schedule',
    tagline: 'Gestión de Proyectos, Calendario L-V & Post-its',
    description: 'Calendario laboral de 5 días con panel de notificaciones integrado, mural de post-its con alarmas y auto-desplazamiento.',
    category: 'operaciones',
    badge: 'Operativa',
    iconName: 'CheckSquare',
    route: '/apps/taskflow',
    isReady: true,
    version: '2.5.7',
  },
  {
    id: 'hosting',
    name: 'Hosting Control',
    tagline: 'Gestión de Servidores, Dominios & Renovaciones',
    description: 'Control centralizado de hostings y dominios de clientes, importación/exportación CSV, alertas escalonadas de vencimiento (7, 15, 30, 60, 90 días) y avisos de renovación.',
    category: 'operaciones',
    badge: 'Operativa',
    iconName: 'Server',
    route: '/apps/hosting',
    isReady: true,
    version: '1.0.0',
  },
  {
    id: 'chat',
    name: 'Brain Chat',
    tagline: 'Comunicación por Clientes & Tareas Anti-Ruido',
    description: 'Plataforma de comunicación interna estilo Slack con canales por cliente, grupos internos y panel de resumen con tareas pendientes de revisar.',
    category: 'operaciones',
    badge: 'Módulo Slack',
    iconName: 'MessageSquare',
    route: '/apps/chat',
    isReady: true,
    version: '1.0.0',
  },
  {
    id: 'archivos',
    name: 'Brain Storage',
    tagline: 'Área Trabajador, Validación & Portal Cliente',
    description: 'Intercambio de entregables con validación de coordinación, avisos de corrección, apartado diferenciado de validados y área cliente aislada para briefings.',
    category: 'operaciones',
    badge: 'Simulador Activo',
    iconName: 'FolderCheck',
    route: '/apps/archivos',
    isReady: true,
    version: '1.0.0-sim',
  },
  {
    id: 'subtitulos',
    name: 'Brain Subtitles',
    tagline: 'Pausado · Modo Mantenimiento',
    description: 'Arquitectura completa integrada (Whisper large-v3 + Claude + ffmpeg). Pausada temporalmente para optimizar costes de API hasta contar con proyectos de subtitulado recurrente. Para consultas, utiliza el Chat.',
    category: 'creatividad',
    badge: 'Mantenimiento',
    iconName: 'Video',
    route: '/apps/subtitulos',
    isReady: false,
    version: '1.1.0',
  },
];

const STORAGE_KEY_PERMISSIONS = 'bug_hub_user_permissions';
const STORAGE_KEY_FAVORITES = 'bug_hub_favorite_apps';

/**
 * Aplicaciones básicas por defecto para trabajadores que aún no tienen permisos personalizados configurados
 * Por defecto: Clockify + TaskFlow + Hosting + Chat + Archivos + Subtítulos
 */
export const DEFAULT_EMPLOYEE_APPS: string[] = ['clockify', 'taskflow', 'hosting', 'chat', 'archivos', 'subtitulos'];
export const DEFAULT_FAVORITE_APPS: string[] = ['clockify', 'taskflow', 'chat'];

/**
 * Obtiene el mapa de permisos guardado en caché local (hidratado desde Supabase)
 */
export function getStoredPermissionsMap(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERMISSIONS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading permissions from localStorage:', e);
    return {};
  }
}

/**
 * Guarda los permisos de aplicaciones en caché local y notifica a la app
 */
export function saveUserAppPermissions(userId: string, appIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPermissionsMap();
    current[userId] = appIds;
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(current));

    // Despachar evento para sincronización en tiempo real sin recargar página
    window.dispatchEvent(
      new CustomEvent('bug_permissions_updated', {
        detail: { userId, appIds },
      })
    );
  } catch (e) {
    console.error('Error saving permissions to localStorage:', e);
  }
}

/**
 * Obtiene las favoritas cacheadas en el navegador
 */
export function getStoredFavoriteApps(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_FAVORITE_APPS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (raw === null) return [...DEFAULT_FAVORITE_APPS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [...DEFAULT_FAVORITE_APPS];
  } catch {
    return [...DEFAULT_FAVORITE_APPS];
  }
}

/**
 * Guarda las favoritas en caché local y notifica al Hub y Navbar
 */
export function saveLocalFavoriteApps(appIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(appIds));
    window.dispatchEvent(new CustomEvent('bug_hub_favorites_updated', { detail: { appIds } }));
  } catch (e) {
    console.warn('Error saving favorite apps to localStorage:', e);
  }
}

/**
 * Sincroniza desde Supabase (vía `/api/data/hub-preferences`) los permisos efectivos
 * y las aplicaciones favoritas del usuario autenticado.
 */
export async function syncHubPreferencesFromServer(
  userId?: string | null
): Promise<{ allowed_apps: string[]; favorite_apps: string[]; tableReady?: boolean } | null> {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const res = await fetch('/api/data/hub-preferences', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success) return null;

    if (Array.isArray(json.allowed_apps) && json.allowed_apps.length > 0) {
      saveUserAppPermissions(userId, json.allowed_apps);
    }
    if (Array.isArray(json.favorite_apps)) {
      saveLocalFavoriteApps(json.favorite_apps);
    }

    return {
      allowed_apps: Array.isArray(json.allowed_apps) ? json.allowed_apps : [...DEFAULT_EMPLOYEE_APPS],
      favorite_apps: Array.isArray(json.favorite_apps) ? json.favorite_apps : [...DEFAULT_FAVORITE_APPS],
      tableReady: json.tableReady,
    };
  } catch {
    return null;
  }
}

/**
 * Carga la matriz completa de permisos desde Supabase (exclusivo Coordinación / Admin).
 */
export async function fetchAllHubPermissionsMap(): Promise<{
  permissionsMap: Record<string, string[]>;
  tableReady: boolean;
}> {
  const localMap = getStoredPermissionsMap();
  if (typeof window === 'undefined') {
    return { permissionsMap: localMap, tableReady: false };
  }

  try {
    const res = await fetch('/api/data/hub-preferences?scope=all', { cache: 'no-store' });
    if (!res.ok) return { permissionsMap: localMap, tableReady: false };
    const json = await res.json();
    if (json?.success && json.permissionsMap && typeof json.permissionsMap === 'object') {
      const merged = json.tableReady ? (json.permissionsMap as Record<string, string[]>) : { ...localMap, ...json.permissionsMap };
      try {
        localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(merged));
      } catch {}
      return { permissionsMap: merged, tableReady: Boolean(json.tableReady) };
    }
  } catch {
    // Fallback a caché local
  }

  return { permissionsMap: localMap, tableReady: false };
}

/**
 * Persiste los permisos de aplicaciones de un trabajador en Supabase (vía `/api/data/hub-preferences`)
 * y actualiza la caché local al instante.
 */
export async function saveUserAppPermissionsRemote(
  userId: string,
  appIds: string[]
): Promise<{ success: boolean; tableReady?: boolean; error?: string }> {
  saveUserAppPermissions(userId, appIds);

  try {
    const res = await fetch('/api/data/hub-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, allowed_apps: appIds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: json?.error || 'Error guardando permisos en el servidor.' };
    }
    return { success: true, tableReady: json?.tableReady };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sin conexión con el servidor.' };
  }
}

/**
 * Persiste las aplicaciones favoritas del propio usuario en Supabase y caché local.
 */
export async function saveUserFavoriteAppsRemote(appIds: string[]): Promise<boolean> {
  saveLocalFavoriteApps(appIds);
  try {
    const res = await fetch('/api/data/hub-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite_apps: appIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene las aplicaciones permitidas para un usuario determinado
 * - Admin y Coordinador tienen acceso total por gobernanza técnica.
 * - Empleados ven exactamente las herramientas asignadas en la matriz por la coordinadora (por defecto 2: Clockify + TaskFlow).
 */
export function getAuthorizedAppsForUser(user: Profile | null): HubApp[] {
  if (!user) return [];

  // Super Admin y Coordinadores tienen acceso total por gobernanza técnica
  if (user.role === 'admin' || user.role === 'coordinator') {
    return BRAIN_UP_HUB_APPS;
  }

  // Empleados: Comprobar la matriz de permisos configurada por la coordinadora
  const permissionsMap = getStoredPermissionsMap();
  const allowedIds = permissionsMap[user.id] && Array.isArray(permissionsMap[user.id])
    ? permissionsMap[user.id]
    : DEFAULT_EMPLOYEE_APPS;

  return BRAIN_UP_HUB_APPS.filter((app) => allowedIds.includes(app.id));
}

/**
 * Comprueba si un usuario tiene permiso para acceder a una herramienta concreta
 */
export function canUserAccessHubApp(user: Profile | null, appId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'coordinator') return true;

  const permissionsMap = getStoredPermissionsMap();
  const allowedIds = permissionsMap[user.id] && Array.isArray(permissionsMap[user.id])
    ? permissionsMap[user.id]
    : DEFAULT_EMPLOYEE_APPS;

  return allowedIds.includes(appId);
}

