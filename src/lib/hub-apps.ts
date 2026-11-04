import { Profile } from '@/types/database';

export interface HubApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'operaciones' | 'gestion' | 'creatividad' | 'administracion';
  badge: string;
  iconName: 'Clock' | 'CheckSquare' | 'Image' | 'Users' | 'Receipt' | 'BookOpen' | 'Share2' | 'MessageSquare' | 'Video' | 'Server';
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
    name: 'Brain Up Tiempo',
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
    name: 'Brain Up Agenda',
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
    name: 'Brain Up Hosting',
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
    name: 'Brain Up Chat',
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
    id: 'subtitulos',
    name: 'Brain Up Subtitulado',
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

/**
 * Aplicaciones básicas por defecto para trabajadores que aún no tienen permisos personalizados configurados
 * Por defecto: Clockify + TaskFlow + Hosting + Chat + Subtítulos
 */
export const DEFAULT_EMPLOYEE_APPS: string[] = ['clockify', 'taskflow', 'hosting', 'chat', 'subtitulos'];

/**
 * Obtiene el mapa de permisos guardado en localStorage
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
 * Guarda los permisos de aplicaciones para un usuario específico y notifica a la app
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

