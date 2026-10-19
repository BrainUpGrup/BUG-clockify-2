/**
 * Utilidades para exportación de eventos y tareas a Google Calendar e iCalendar (.ics)
 * Cumple con la directriz de interoperabilidad y conexión del ecosistema Brain Up TaskFlow
 */

export type TaskFlowItemType = 'task' | 'meeting';
export type TaskPriority = 'alta' | 'media' | 'baja';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type ColorStrip = 'pink' | 'orange' | 'yellow' | 'mint' | 'purple' | 'blue' | 'gray' | 'white';

export interface TaskList {
  id: string;
  name: string;
  color: string; // Hex o RGB ej. "#8E0E75"
  createdAt?: string;
}

export const DEFAULT_TASK_LISTS: TaskList[] = [
  { id: 'list-general', name: 'General & Operativa', color: '#8E0E75' },
  { id: 'list-creatividades', name: 'Creatividades & Diseño', color: '#F57C00' },
  { id: 'list-reuniones', name: 'Reuniones & Citas', color: '#D50000' },
  { id: 'list-web', name: 'Desarrollo Web & SEO', color: '#4285F4' },
  { id: 'list-cuotas', name: 'Gestión Cuotas & Clientes', color: '#0B8043' },
];

export interface TaskFlowItem {
  id: string;
  type: TaskFlowItemType; // 'task' | 'meeting'
  title: string;
  description?: string;
  companyId?: string;
  companyName: string;
  status: TaskStatus;
  priority?: TaskPriority; // Opcional (prioridad retirada de la interfaz por solicitud)
  colorStrip?: ColorStrip; // Tira predeterminada opcional
  customColor?: string; // Color personalizado HEX / RGB elegido por el usuario (ej. "#8E0E75")
  listId?: string; // ID de la lista de tareas a la que pertenece
  rescheduleMode?: 'manual' | 'auto'; // Modo de desplazamiento (manual en cualquier momento o automático si vence)
  autoReschedule?: boolean; // Si no se completa en el día, se desplaza automáticamente
  rescheduleDays?: number; // Días a desplazar si no se completa (por defecto 1 = día siguiente)
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm ej. "10:00"
  endTime?: string; // HH:mm ej. "11:30"
  location?: string; // ej. "Google Meet", "Oficina Brain Up", etc.
  meetingUrl?: string; // URL opcional de videollamada
  estimatedHours?: number;
  createdBy: string;
  createdByName?: string;
  isShared: boolean; // true = compartida con el equipo
  assignees: string[]; // Lista de nombres de compañeros asignados
  createdAt: string;
}

export interface GoogleCalendarColor {
  id: string;
  name: string;
  hex: string;
}

/**
 * Paleta exacta oficial de Google Calendar adjuntada en el requerimiento (2 filas de 11 colores)
 * Restringe la selección exclusivamente a esta gama para máxima armonía visual y consistencia.
 */
export const GOOGLE_CALENDAR_COLORS: GoogleCalendarColor[] = [
  // Fila 1 (11 colores)
  { id: 'tomato', name: 'Tomate', hex: '#D50000' },
  { id: 'flamingo', name: 'Flamingo', hex: '#E67C73' },
  { id: 'tangerine', name: 'Mandarina', hex: '#F4511E' },
  { id: 'pumpkin', name: 'Calabaza', hex: '#EF6C00' },
  { id: 'mango', name: 'Mango', hex: '#F57C00' },
  { id: 'banana', name: 'Plátano', hex: '#F6BF26' },
  { id: 'sunflower', name: 'Girasol', hex: '#E4C441' },
  { id: 'citron', name: 'Cidra', hex: '#D4E157' },
  { id: 'avocado', name: 'Aguacate', hex: '#7CB342' },
  { id: 'basil', name: 'Albahaca', hex: '#0B8043' },
  { id: 'sage', name: 'Salvia', hex: '#33B679' },

  // Fila 2 (11 colores)
  { id: 'eucalyptus', name: 'Eucalipto', hex: '#009688' },
  { id: 'peacock', name: 'Pavo Real', hex: '#039BE5' },
  { id: 'cobalt', name: 'Cobalto', hex: '#4285F4' },
  { id: 'blueberry', name: 'Arándano', hex: '#3F51B5' },
  { id: 'lavender', name: 'Lavanda', hex: '#7986CB' },
  { id: 'wisteria', name: 'Glicinia', hex: '#B39DDB' },
  { id: 'amethyst', name: 'Amatista', hex: '#9C27B0' },
  { id: 'grape', name: 'Ciruela Brain Up', hex: '#8E0E75' },
  { id: 'cocoa', name: 'Cacao', hex: '#8D6E63' },
  { id: 'graphite', name: 'Grafito', hex: '#616161' },
  { id: 'birch', name: 'Abedul', hex: '#C7B299' },
];

export const DEFAULT_CALENDAR_COLOR = '#8E0E75';
export const POPULAR_STRIP_COLORS = GOOGLE_CALENDAR_COLORS;

export const COLOR_STRIP_CONFIG: Record<ColorStrip, {
  label: string;
  bg: string;
  text: string;
  border: string;
  hover: string;
  dot: string;
  hex: string;
}> = {
  pink: {
    label: 'Flamingo / Rosa',
    bg: 'bg-[#E67C73]/35',
    text: 'text-[#5B130E]',
    border: 'border-[#E67C73] border-l-4',
    hover: 'hover:bg-[#E67C73]/45',
    dot: 'bg-[#E67C73]',
    hex: '#E67C73',
  },
  orange: {
    label: 'Mango / Naranja',
    bg: 'bg-[#F57C00]/35',
    text: 'text-[#632900]',
    border: 'border-[#F57C00] border-l-4',
    hover: 'hover:bg-[#F57C00]/45',
    dot: 'bg-[#F57C00]',
    hex: '#F57C00',
  },
  yellow: {
    label: 'Plátano / Amarillo',
    bg: 'bg-[#F6BF26]/40',
    text: 'text-[#573C00]',
    border: 'border-[#F6BF26] border-l-4',
    hover: 'hover:bg-[#F6BF26]/50',
    dot: 'bg-[#F6BF26]',
    hex: '#F6BF26',
  },
  mint: {
    label: 'Salvia / Menta',
    bg: 'bg-[#33B679]/35',
    text: 'text-[#0B3D25]',
    border: 'border-[#33B679] border-l-4',
    hover: 'hover:bg-[#33B679]/45',
    dot: 'bg-[#33B679]',
    hex: '#33B679',
  },
  purple: {
    label: 'Ciruela / Púrpura',
    bg: 'bg-[#8E0E75]/32',
    text: 'text-[#3E0331]',
    border: 'border-[#8E0E75] border-l-4',
    hover: 'hover:bg-[#8E0E75]/42',
    dot: 'bg-[#8E0E75]',
    hex: '#8E0E75',
  },
  blue: {
    label: 'Cobalto / Azul',
    bg: 'bg-[#4285F4]/35',
    text: 'text-[#0A2960]',
    border: 'border-[#4285F4] border-l-4',
    hover: 'hover:bg-[#4285F4]/45',
    dot: 'bg-[#4285F4]',
    hex: '#4285F4',
  },
  gray: {
    label: 'Grafito / Gris',
    bg: 'bg-[#616161]/30',
    text: 'text-[#1A1A1A]',
    border: 'border-[#616161] border-l-4',
    hover: 'hover:bg-[#616161]/40',
    dot: 'bg-[#616161]',
    hex: '#616161',
  },
  white: {
    label: 'Abedul / Neutro',
    bg: 'bg-[#C7B299]/35',
    text: 'text-[#2D1C17]',
    border: 'border-[#C7B299] border-l-4',
    hover: 'hover:bg-[#C7B299]/45',
    dot: 'bg-[#C7B299]',
    hex: '#C7B299',
  },
};

export function getItemColorStrip(item: TaskFlowItem): ColorStrip {
  if (item.colorStrip) return item.colorStrip;
  if (item.type === 'meeting') return 'purple';
  if (item.priority === 'alta') return 'pink';
  if (item.priority === 'media') return 'orange';
  if (item.status === 'done') return 'mint';
  
  // Determinístico según nombre de empresa o cliente
  const name = item.companyName || item.title;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors: ColorStrip[] = ['pink', 'orange', 'yellow', 'mint', 'purple', 'blue', 'gray'];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Evalúa si un color hex es claro para aplicar contraste óptimo en textos o iconos
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 160;
}

/**
 * Genera estilos CSS enriquecidos y llamativos para tiras de calendario tipo Google Calendar
 * Opacidad 35% y banda izquierda sólida de 4px para que el color sea claramente visible
 */
export function getCustomColorStyles(hexColor: string): {
  style: React.CSSProperties;
  dotColor: string;
  textColor: string;
} {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return {
      style: {
        backgroundColor: 'rgba(142, 14, 117, 0.32)',
        borderColor: 'rgba(142, 14, 117, 0.85)',
        borderLeftWidth: '4px',
        borderLeftColor: '#8E0E75',
        color: '#3E0331',
        fontWeight: 600,
      },
      dotColor: hexColor || '#8E0E75',
      textColor: '#3E0331',
    };
  }

  // Opacidad llamativa (0.35) para que no se vea pálida ni invisible
  const bg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  // Borde nítido a juego
  const border = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
  
  // Texto con contraste oscuro de alta legibilidad matizado con el color
  const textR = Math.max(0, Math.floor(rgb.r * 0.32));
  const textG = Math.max(0, Math.floor(rgb.g * 0.32));
  const textB = Math.max(0, Math.floor(rgb.b * 0.32));
  const text = `rgb(${textR}, ${textG}, ${textB})`;

  return {
    style: {
      backgroundColor: bg,
      borderColor: border,
      borderLeftWidth: '4px',
      borderLeftColor: hexColor,
      color: text,
      fontWeight: 600,
    },
    dotColor: hexColor,
    textColor: text,
  };
}

/**
 * Formatea fechas para formato Google Calendar / iCalendar (YYYYMMDDTHHmmSS)
 */
function formatDateTimeForCalendar(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return cleanDate;
  }
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime.padStart(6, '0')}`;
}

/**
 * Obtiene el día siguiente en formato YYYYMMDD para eventos de día completo
 */
function getNextDayClean(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  } catch {
    return dateStr.replace(/-/g, '');
  }
}

/**
 * Construye la URL de exportación directa a Google Calendar
 * Abre directamente la plantilla de evento con todos los campos pre-cumplimentados
 */
export function getGoogleCalendarUrl(item: TaskFlowItem): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  const title = encodeURIComponent(
    `[${item.type === 'meeting' ? 'REUNIÓN' : 'TAREA'}] ${item.title}`
  );
  
  let datesParam = '';
  if (item.startTime && item.endTime) {
    const start = formatDateTimeForCalendar(item.date, item.startTime);
    const end = formatDateTimeForCalendar(item.date, item.endTime);
    datesParam = `${start}/${end}`;
  } else if (item.startTime) {
    const start = formatDateTimeForCalendar(item.date, item.startTime);
    // Asumir 1 hora de duración si no hay hora fin
    const [h, m] = item.startTime.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const end = formatDateTimeForCalendar(item.date, `${endH}:${m || '00'}`);
    datesParam = `${start}/${end}`;
  } else {
    // Evento de todo el día
    const start = item.date.replace(/-/g, '');
    const end = getNextDayClean(item.date);
    datesParam = `${start}/${end}`;
  }

  const detailsArray = [
    `🏢 Empresa / Cliente: ${item.companyName}`,
    item.priority ? `⚡ Prioridad: ${item.priority.toUpperCase()}` : '',
    `📌 Estado: ${item.status.toUpperCase()}`,
    item.assignees?.length ? `👥 Responsables: ${item.assignees.join(', ')}` : '',
    item.description ? `📝 Detalles: ${item.description}` : '',
    item.meetingUrl ? `🔗 Enlace de Reunión: ${item.meetingUrl}` : '',
    `⚡ Gestionado vía Brain Up TaskFlow & Clockify Hub`
  ].filter(Boolean);

  const details = encodeURIComponent(detailsArray.join('\n'));
  const location = encodeURIComponent(item.location || item.meetingUrl || 'Brain Up Grup');

  return `${baseUrl}&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Genera el contenido de un evento individual en formato RFC 5545 iCalendar
 */
function generateVEvent(item: TaskFlowItem): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const cleanSummary = (item.type === 'meeting' ? '[REUNIÓN] ' : '[TAREA] ') + item.title.replace(/[\r\n]+/g, ' ');
  
  let dtStartLine = '';
  let dtEndLine = '';

  if (item.startTime && item.endTime) {
    dtStartLine = `DTSTART:${formatDateTimeForCalendar(item.date, item.startTime)}`;
    dtEndLine = `DTEND:${formatDateTimeForCalendar(item.date, item.endTime)}`;
  } else if (item.startTime) {
    dtStartLine = `DTSTART:${formatDateTimeForCalendar(item.date, item.startTime)}`;
    const [h, m] = item.startTime.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    dtEndLine = `DTEND:${formatDateTimeForCalendar(item.date, `${endH}:${m || '00'}`)}`;
  } else {
    dtStartLine = `DTSTART;VALUE=DATE:${item.date.replace(/-/g, '')}`;
    dtEndLine = `DTEND;VALUE=DATE:${getNextDayClean(item.date)}`;
  }

  const description = [
    `Empresa / Cliente: ${item.companyName}`,
    item.priority ? `Prioridad: ${item.priority.toUpperCase()}` : '',
    `Estado: ${item.status.toUpperCase()}`,
    item.assignees?.length ? `Responsables: ${item.assignees.join(', ')}` : '',
    item.description ? `Detalles: ${item.description.replace(/[\r\n]+/g, ' ')}` : '',
    item.meetingUrl ? `Enlace: ${item.meetingUrl}` : '',
    `Brain Up TaskFlow & Hub`
  ].filter(Boolean).join('\\n');

  const location = (item.location || item.meetingUrl || 'Brain Up Grup').replace(/[\r\n]+/g, ' ');
  const priorityNum = item.priority === 'alta' ? '1' : item.priority === 'media' ? '5' : '9';

  return [
    'BEGIN:VEVENT',
    `UID:taskflow-${item.id}@brainupgrup.com`,
    `DTSTAMP:${now}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:CONFIRMED`,
    `PRIORITY:${priorityNum}`,
    'END:VEVENT'
  ].join('\r\n');
}

/**
 * Descarga un archivo .ics para un evento o tarea individual
 */
export function downloadSingleEventIcs(item: TaskFlowItem): void {
  const vEvent = generateVEvent(item);
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brain Up Grup//TaskFlow Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Brain Up TaskFlow',
    vEvent,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  a.download = `BrainUp_${item.type}_${safeTitle}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Descarga todos los eventos y tareas filtrados en un único archivo de calendario (.ics)
 */
export function downloadAllEventsIcs(items: TaskFlowItem[], filename: string = 'BrainUp_TaskFlow_Calendario.ics'): void {
  if (!items || items.length === 0) return;

  const vEvents = items.map(generateVEvent).join('\r\n');
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brain Up Grup//TaskFlow Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Brain Up TaskFlow Calendario',
    'X-WR-TIMEZONE:Europe/Madrid',
    vEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
