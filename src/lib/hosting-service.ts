import { HostingService, HostingMetrics, HostingAlert, NotificationStages, ServiceType } from '@/types/hosting';
import { INITIAL_HOSTING_SERVICES } from '@/lib/hosting-seed-data';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY_HOSTING = 'bug_hosting_services_cache';

/**
 * Calcula los días restantes hasta la fecha de expiración respecto a la fecha actual.
 * Devuelve un número entero: negativo si ya caducó, positivo si aún quedan días.
 */
export function calculateDaysRemaining(expirationDateStr: string): number {
  if (!expirationDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expirationDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina el nivel de urgencia y la clave de notificación según los días restantes.
 */
export function getAlertUrgency(daysRemaining: number): {
  urgency: HostingAlert['urgency'];
  stageKey: HostingAlert['stageKey'];
} {
  if (daysRemaining < 0) {
    return { urgency: 'expired', stageKey: null };
  }
  if (daysRemaining <= 7) {
    return { urgency: 'critical_7', stageKey: '7' };
  }
  if (daysRemaining <= 15) {
    return { urgency: 'warning_15', stageKey: '15' };
  }
  if (daysRemaining <= 30) {
    return { urgency: 'notice_30', stageKey: '30' };
  }
  if (daysRemaining <= 60) {
    return { urgency: 'pre_60', stageKey: '60' };
  }
  if (daysRemaining <= 90) {
    return { urgency: 'pre_90', stageKey: '90' };
  }
  return { urgency: 'future', stageKey: null };
}

/**
 * Obtiene la lista completa de servicios desde Supabase o caché local (con fallback a la semilla Cdmon)
 */
export async function getHostingServices(): Promise<HostingService[]> {
  // 1. Intentar cargar desde Supabase si la tabla existe
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hosting_services')
      .select('*')
      .order('expiration_date', { ascending: true });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_HOSTING, JSON.stringify(data));
      }
      return data as HostingService[];
    }
  } catch (err) {
    console.warn('Supabase hosting_services no disponible, recurriendo a almacenamiento local:', err);
  }

  // 2. Fallback a almacenamiento local o semilla inicial de 153 servicios
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HOSTING);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Inicializar por primera vez con los 153 servicios oficiales de Cdmon
      localStorage.setItem(STORAGE_KEY_HOSTING, JSON.stringify(INITIAL_HOSTING_SERVICES));
      return INITIAL_HOSTING_SERVICES;
    } catch (e) {
      console.warn('Error leyendo localStorage de hosting:', e);
    }
  }

  return INITIAL_HOSTING_SERVICES;
}

/**
 * Guarda o actualiza un servicio en Supabase y localmente
 */
export async function saveHostingService(service: HostingService): Promise<HostingService> {
  const updatedService: HostingService = {
    ...service,
    updated_at: new Date().toISOString(),
  };

  // Intentar guardar en Supabase
  try {
    const supabase = createClient();
    await supabase.from('hosting_services').upsert(updatedService);
  } catch (err) {
    console.warn('No se pudo guardar en Supabase, guardando en local:', err);
  }

  // Guardar en localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HOSTING);
      const list: HostingService[] = stored ? JSON.parse(stored) : [...INITIAL_HOSTING_SERVICES];
      const idx = list.findIndex((s) => s.id === updatedService.id);
      if (idx >= 0) {
        list[idx] = updatedService;
      } else {
        list.unshift(updatedService);
      }
      localStorage.setItem(STORAGE_KEY_HOSTING, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('bug_hosting_updated'));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  return updatedService;
}

/**
 * Elimina un servicio por ID
 */
export async function deleteHostingService(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('hosting_services').delete().eq('id', id);
  } catch (err) {
    console.warn('Error al borrar de Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HOSTING);
      if (stored) {
        const list: HostingService[] = JSON.parse(stored);
        const filtered = list.filter((s) => s.id !== id);
        localStorage.setItem(STORAGE_KEY_HOSTING, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('bug_hosting_updated'));
      }
    } catch (e) {
      console.warn('Error eliminando de localStorage:', e);
    }
  }

  return true;
}

/**
 * Renueva un servicio sumándole 1 año (u otro ciclo) a su fecha de expiración
 */
export async function renewHostingService(id: string, yearsToAdd = 1): Promise<HostingService | null> {
  const allServices = await getHostingServices();
  const current = allServices.find((s) => s.id === id);
  if (!current) return null;

  const currentExp = new Date(current.expiration_date);
  const baseDate = currentExp < new Date() ? new Date() : currentExp;
  baseDate.setFullYear(baseDate.getFullYear() + yearsToAdd);

  const newExpIso = baseDate.toISOString().split('T')[0];

  const updated: HostingService = {
    ...current,
    expiration_date: newExpIso,
    status: 'active',
    notification_stages: {
      '7': false,
      '15': false,
      '30': false,
      '60': false,
      '90': false,
    },
    updated_at: new Date().toISOString(),
  };

  return await saveHostingService(updated);
}

/**
 * Marca una etapa de notificación como avisada para un servicio
 */
export async function markNotificationSent(id: string, stage: '7' | '15' | '30' | '60' | '90'): Promise<void> {
  const allServices = await getHostingServices();
  const current = allServices.find((s) => s.id === id);
  if (!current) return;

  const currentStages = current.notification_stages || {
    '7': false,
    '15': false,
    '30': false,
    '60': false,
    '90': false,
  };

  const updated: HostingService = {
    ...current,
    last_notified_at: new Date().toISOString(),
    notification_stages: {
      ...currentStages,
      [stage]: true,
    },
    updated_at: new Date().toISOString(),
  };

  await saveHostingService(updated);
}

/**
 * Calcula las métricas ejecutivas de hosting
 */
export function computeHostingMetrics(services: HostingService[]): HostingMetrics {
  let expiredCount = 0;
  let critical7Days = 0;
  let warning15Days = 0;
  let notice30Days = 0;
  let notice60Days = 0;
  let notice90Days = 0;
  let autoRenewDisabled = 0;
  let totalHostings = 0;
  let totalDomains = 0;
  let totalEmails = 0;
  let totalSubhostings = 0;

  services.forEach((s) => {
    const days = calculateDaysRemaining(s.expiration_date);
    if (days < 0) expiredCount++;
    else if (days <= 7) critical7Days++;
    else if (days <= 15) warning15Days++;
    else if (days <= 30) notice30Days++;
    else if (days <= 60) notice60Days++;
    else if (days <= 90) notice90Days++;

    if (!s.auto_renew) autoRenewDisabled++;

    const lowerService = (s.service_type || '').toLowerCase();
    if (lowerService === 'subhosting') {
      totalSubhostings++;
    } else if (lowerService === 'hosting') {
      totalHostings++;
    } else if (lowerService === 'dominio') {
      totalDomains++;
    } else if (lowerService === 'correo') {
      totalEmails++;
    }
  });

  return {
    totalServices: services.length,
    expiredCount,
    critical7Days,
    warning15Days,
    notice30Days,
    notice60Days,
    notice90Days,
    autoRenewDisabled,
    totalHostings,
    totalDomains,
    totalEmails,
    totalSubhostings,
  };
}

/**
 * Genera la lista de alertas activas para el Centro de Notificaciones
 */
export function getHostingAlerts(services: HostingService[]): HostingAlert[] {
  const alerts: HostingAlert[] = [];

  services.forEach((service) => {
    const daysRemaining = calculateDaysRemaining(service.expiration_date);
    const { urgency, stageKey } = getAlertUrgency(daysRemaining);

    // Solo nos interesan servicios caducados o con vencimiento en <= 90 días
    if (daysRemaining <= 90) {
      const isNotified = stageKey && service.notification_stages
        ? Boolean(service.notification_stages[stageKey])
        : false;

      alerts.push({
        service,
        daysRemaining,
        urgency,
        stageKey,
        isNotified,
      });
    }
  });

  // Ordenar por días restantes (los más urgentes / negativos primero)
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return alerts;
}

/**
 * Exporta el catálogo completo a un archivo CSV con formato estándar compatible con Excel y Cdmon
 */
export function exportHostingToCSV(services: HostingService[]): string {
  const headers = [
    '"Nombre"',
    '"Servicio"',
    '"Ciclo de renovación"',
    '"Método de pago para renovación automática"',
    '"Tiempo restante"',
    '"Renovación automática"',
    '"Proveedor"',
    '"Cliente Asignado"',
    '"Coste Proveedor"',
    '"PVP Cliente"',
    '"Estado"',
    '"Hosting Padre"',
    '"Notas"'
  ];

  const lines = services.map((s) => {
    // Formato de fecha DD/MM/YYYY para compatibilidad con Cdmon y Excel en español
    let dateStr = s.expiration_date;
    if (s.expiration_date && s.expiration_date.includes('-')) {
      const parts = s.expiration_date.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const autoRenewStr = s.auto_renew ? 'Activada' : 'Desactivada';

    return [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.service_type || 'Hosting').replace(/"/g, '""')}"`,
      `"${(s.renewal_cycle || 'Anual').replace(/"/g, '""')}"`,
      `"${(s.payment_method || '-').replace(/"/g, '""')}"`,
      `"${dateStr}"`,
      `"${autoRenewStr}"`,
      `"${(s.provider || 'Cdmon').replace(/"/g, '""')}"`,
      `"${(s.client_name || '').replace(/"/g, '""')}"`,
      `"${s.price_cost ?? 0}"`,
      `"${s.price_client ?? 0}"`,
      `"${s.status || 'active'}"`,
      `"${(s.parent_id || '').replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  return [headers.join(';'), ...lines].join('\r\n');
}

/**
 * Parsea un texto CSV (acepta delimitador ';' o ',') e importa los servicios
 */
export function parseHostingCSV(csvText: string): HostingService[] {
  if (!csvText || !csvText.trim()) return [];

  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) return [];

  // Detectar delimitador (punto y coma ';' habitual en España y Cdmon, o coma ',')
  const headerLine = rawLines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const cleanHeader = (h: string) => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase();
  const headers = headerLine.split(delimiter).map(cleanHeader);

  const idxNombre = headers.findIndex((h) => h.includes('nombre') || h.includes('dominio') || h.includes('servicio'));
  const idxServicio = headers.findIndex((h) => h.includes('servicio') && !h.includes('nombre'));
  const idxCiclo = headers.findIndex((h) => h.includes('ciclo') || h.includes('periodo'));
  const idxPago = headers.findIndex((h) => h.includes('método') || h.includes('metodo') || h.includes('pago'));
  const idxFecha = headers.findIndex((h) => h.includes('tiempo restante') || h.includes('expir') || h.includes('vencimiento') || h.includes('fecha'));
  const idxAuto = headers.findIndex((h) => h.includes('renovación automática') || h.includes('renovacion automatica') || h.includes('auto'));
  const idxProveedor = headers.findIndex((h) => h.includes('proveedor'));
  const idxCliente = headers.findIndex((h) => h.includes('cliente'));
  const idxParent = headers.findIndex((h) => h.includes('padre') || h.includes('parent'));

  const parsedServices: HostingService[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line.trim()) continue;

    // Parser simple respetando comillas
    const cols: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        cols.push(currentCell.trim().replace(/^["']|["']$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cols.push(currentCell.trim().replace(/^["']|["']$/g, ''));

    const rawName = idxNombre >= 0 && cols[idxNombre] ? cols[idxNombre] : `servicio-${i}`;
    const rawServicio = idxServicio >= 0 && cols[idxServicio] ? cols[idxServicio] : (rawName.includes('.') ? 'Dominio' : 'Hosting');
    const rawCiclo = idxCiclo >= 0 && cols[idxCiclo] ? cols[idxCiclo] : 'Anual';
    const rawPago = idxPago >= 0 && cols[idxPago] ? cols[idxPago] : '-';
    const rawFecha = idxFecha >= 0 && cols[idxFecha] ? cols[idxFecha] : '';
    const rawAuto = idxAuto >= 0 && cols[idxAuto] ? cols[idxAuto] : 'Desactivada';
    const rawProveedor = idxProveedor >= 0 && cols[idxProveedor] ? cols[idxProveedor] : 'Cdmon';
    const rawCliente = idxCliente >= 0 && cols[idxCliente] ? cols[idxCliente] : '';
    const rawParent = idxParent >= 0 && cols[idxParent] ? cols[idxParent] : null;

    // Normalizar a los 4 tipos oficiales: Hosting, Dominio, Correo o Subhosting
    let normalizedService: ServiceType = 'Hosting';
    const sLower = rawServicio.toLowerCase();
    if (sLower.includes('sub')) {
      normalizedService = 'Subhosting';
    } else if (sLower.includes('corr') || sLower.includes('mail')) {
      normalizedService = 'Correo';
    } else if (sLower.includes('dom')) {
      normalizedService = 'Dominio';
    } else {
      normalizedService = 'Hosting';
    }

    // Convertir fecha a ISO YYYY-MM-DD
    let isoDate = new Date().toISOString().split('T')[0];
    if (rawFecha.includes('/')) {
      const parts = rawFecha.split('/');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (rawFecha.includes('-')) {
      isoDate = rawFecha;
    }

    const domainCore = rawName.split('.')[0] || rawName;
    const clientName = rawCliente || domainCore.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    parsedServices.push({
      id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      name: rawName,
      service_type: normalizedService,
      renewal_cycle: rawCiclo,
      payment_method: rawPago,
      expiration_date: isoDate,
      auto_renew: rawAuto.toLowerCase().includes('activada') || rawAuto.toLowerCase() === 'true',
      provider: rawProveedor,
      parent_id: rawParent,
      client_name: clientName,
      status: 'active',
      notes: '',
      notification_stages: {
        '7': false,
        '15': false,
        '30': false,
        '60': false,
        '90': false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return parsedServices;
}

/**
 * Genera una plantilla ejecutiva de correo para avisar al cliente
 */
export function generateClientNotificationEmail(service: HostingService, daysRemaining: number): {
  subject: string;
  body: string;
} {
  const client = service.client_name || 'Estimado/a cliente';
  const serviceName = service.name;
  const serviceType = service.service_type || 'Hosting & Dominio';
  const expDateFormatted = service.expiration_date.split('-').reverse().join('/');

  let subject = `Aviso de renovación de ${serviceType}: ${serviceName} - Brain Up Grup`;
  if (daysRemaining <= 7) {
    subject = `URGENTE: Próxima expiración en ${daysRemaining} días (${serviceName}) - Brain Up Grup`;
  }

  const body = `Hola ${client},

Nos ponemos en contacto desde Brain Up Grup para informarte sobre el estado de tu servicio de ${serviceType}:

- Dominio / Servicio: ${serviceName}
- Fecha de vencimiento: ${expDateFormatted} (${daysRemaining > 0 ? `quedan ${daysRemaining} días` : 'servicio vencido'})
- Ciclo de renovación: ${service.renewal_cycle || 'Anual'}
- Estado actual: Pendiente de confirmación para renovación

Para garantizar la continuidad de tu página web, cuentas de correo corporativas y posicionamiento, precisamos tu confirmación para proceder con la renovación correspondiente del periodo.

Quedamos a tu completa disposición para tramitarlo de inmediato.

Atentamente,
Equipo de Operaciones & Sistemas
Brain Up Grup
soporte@brainupgrup.com | www.brainupgrup.com`;

  return { subject, body };
}

