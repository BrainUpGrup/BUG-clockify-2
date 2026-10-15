import { Profile } from '@/types/database';

export interface HubApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'operaciones' | 'gestion' | 'creatividad' | 'administracion';
  badge: string;
  iconName: 'Clock' | 'CheckSquare' | 'Image' | 'Users' | 'Receipt' | 'BookOpen' | 'Share2';
  route: string;
  isReady: boolean; // Si la app está totalmente implementada y operativa en el hub
  version: string;
}

/**
 * Catálogo Oficial de 7 Herramientas del HUB de Brain Up
 */
export const BRAIN_UP_HUB_APPS: HubApp[] = [
  {
    id: 'clockify',
    name: 'Brain Up Clockify',
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
    name: 'Brain Up TaskFlow',
    tagline: 'Gestión de Proyectos & Tareas Ágiles',
    description: 'Tableros interactivos Kanban para organizar flujos de trabajo, asignar tareas al equipo y supervisar entregables en tiempo real.',
    category: 'operaciones',
    badge: 'App de Prueba Hub',
    iconName: 'CheckSquare',
    route: '/apps/taskflow',
    isReady: true,
    version: '1.0.0',
  },
  {
    id: 'media_hub',
    name: 'Brain Up Media Hub',
    tagline: 'Biblioteca de Activos & Creatividades',
    description: 'Repositorio centralizado de manuales de marca, logotipos en alta resolución, banners y creatividades oficiales para clientes.',
    category: 'creatividad',
    badge: 'Suite Brain Up',
    iconName: 'Image',
    route: '/apps/taskflow?tool=media_hub',
    isReady: true,
    version: '1.2.0',
  },
  {
    id: 'crm',
    name: 'Brain Up CRM',
    tagline: 'Directorio de Clientes & Contactos VIP',
    description: 'Gestión de interlocutores clave, historial de relaciones corporativas y fichas fiscales de cada cuenta de la agencia.',
    category: 'gestion',
    badge: 'Suite Brain Up',
    iconName: 'Users',
    route: '/apps/taskflow?tool=crm',
    isReady: true,
    version: '1.1.0',
  },
  {
    id: 'billing',
    name: 'Brain Up Facturación',
    tagline: 'Presupuestos & Control de Facturación',
    description: 'Seguimiento financiero de horas de cuota facturadas, trabajos puntuales extra y estado de cobros comerciales.',
    category: 'administracion',
    badge: 'Suite Brain Up',
    iconName: 'Receipt',
    route: '/apps/taskflow?tool=billing',
    isReady: true,
    version: '1.0.4',
  },
  {
    id: 'knowledge',
    name: 'Brain Up Wiki & SOPs',
    tagline: 'Procedimientos Operativos & Guías Internas',
    description: 'Base de conocimiento corporativa, metodologías de trabajo aprobadas y documentación de procesos para el equipo.',
    category: 'gestion',
    badge: 'Suite Brain Up',
    iconName: 'BookOpen',
    route: '/apps/taskflow?tool=knowledge',
    isReady: true,
    version: '1.3.1',
  },
  {
    id: 'social',
    name: 'Brain Up Social Planner',
    tagline: 'Calendario Editorial & Contenidos',
    description: 'Programación de publicaciones, parrilla mensual de redes sociales y aprobación de copys para campañas publicitarias.',
    category: 'creatividad',
    badge: 'Suite Brain Up',
    iconName: 'Share2',
    route: '/apps/taskflow?tool=social',
    isReady: true,
    version: '1.0.8',
  },
];

const STORAGE_KEY_PERMISSIONS = 'bug_hub_user_permissions';

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
 * Guarda los permisos de aplicaciones para un usuario específico
 */
export function saveUserAppPermissions(userId: string, appIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPermissionsMap();
    current[userId] = appIds;
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving permissions to localStorage:', e);
  }
}

/**
 * Obtiene las aplicaciones permitidas para un usuario determinado
 * - Admin y Coordinador tienen acceso a todas las 7 herramientas por defecto.
 * - Trabajadores/Empleados tienen por defecto Clockify + TaskFlow a menos que el coordinador lo personalice.
 */
export function getAuthorizedAppsForUser(user: Profile | null): HubApp[] {
  if (!user) return [];

  // Super Admin y Coordinadores tienen acceso total por gobernanza técnica
  if (user.role === 'admin' || user.role === 'coordinator') {
    return BRAIN_UP_HUB_APPS;
  }

  // Empleados: Comprobar la matriz de permisos configurada por la coordinadora
  const permissionsMap = getStoredPermissionsMap();
  const allowedIds = permissionsMap[user.id];

  // Si no se han configurado aún permisos personalizados para este empleado, por defecto ve Clockify y TaskFlow
  if (!allowedIds || !Array.isArray(allowedIds)) {
    return BRAIN_UP_HUB_APPS.filter((app) => app.id === 'clockify' || app.id === 'taskflow');
  }

  return BRAIN_UP_HUB_APPS.filter((app) => allowedIds.includes(app.id));
}

/**
 * Comprueba si un usuario tiene permiso para acceder a una herramienta concreta
 */
export function canUserAccessHubApp(user: Profile | null, appId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'coordinator') return true;

  const permissionsMap = getStoredPermissionsMap();
  const allowedIds = permissionsMap[user.id];

  if (!allowedIds || !Array.isArray(allowedIds)) {
    return appId === 'clockify' || appId === 'taskflow';
  }

  return allowedIds.includes(appId);
}
