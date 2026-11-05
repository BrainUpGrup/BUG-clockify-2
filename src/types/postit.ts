/**
 * Tipos y constantes para el sistema de Post-its y Recordatorios Interconectados de Brain Up
 */

export type PostItColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

export interface PostItReminder {
  id: string;
  label: string; // ej. "20 días antes", "15 días antes", "1 día antes", "1 hora antes"
  offsetMinutes: number; // Minutos de antelación respecto a targetDate + targetTime
  isTriggered?: boolean;
}

export interface PostItItem {
  id: string;
  title: string;
  content: string;
  color: PostItColor;
  targetDate: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm (ej. "09:00")
  reminders: PostItReminder[];
  createdAt: string;
  isPinned?: boolean;
  isCompleted?: boolean;
  // Propiedades para la Pizarra / Tabla Libre Modular
  posX?: number; // Coordenada X en píxeles
  posY?: number; // Coordenada Y en píxeles
  width?: number; // Ancho en píxeles (redimensionable)
  height?: number; // Alto en píxeles (redimensionable)
  zIndex?: number; // Nivel de elevación / apilamiento
  sizePreset?: 'small' | 'medium' | 'large'; // Tamaño rápido
}

export const POSTIT_COLORS: Record<PostItColor, {
  name: string;
  bg: string;
  border: string;
  text: string;
  header: string;
  pin: string;
  badge: string;
  hex: string;
  borderHex: string;
  textHex: string;
}> = {
  yellow: {
    name: 'Amarillo Canario',
    bg: 'bg-[#FEF08A]',
    border: 'border-[#FACC15]',
    text: 'text-[#713F12]',
    header: 'bg-[#FDE047]',
    pin: 'bg-[#CA8A04]',
    badge: 'bg-[#FEF9C3] text-[#713F12] border border-[#FACC15]',
    hex: '#FEF08A',
    borderHex: '#FACC15',
    textHex: '#713F12',
  },
  green: {
    name: 'Menta Fresca',
    bg: 'bg-[#BBF7D0]',
    border: 'border-[#4ADE80]',
    text: 'text-[#14532D]',
    header: 'bg-[#86EFAC]',
    pin: 'bg-[#16A34A]',
    badge: 'bg-[#DCFCE7] text-[#14532D] border border-[#4ADE80]',
    hex: '#BBF7D0',
    borderHex: '#4ADE80',
    textHex: '#14532D',
  },
  blue: {
    name: 'Azul Celeste',
    bg: 'bg-[#BAE6FD]',
    border: 'border-[#38BDF8]',
    text: 'text-[#0369A1]',
    header: 'bg-[#7DD3FC]',
    pin: 'bg-[#0284C7]',
    badge: 'bg-[#E0F2FE] text-[#0369A1] border border-[#38BDF8]',
    hex: '#BAE6FD',
    borderHex: '#38BDF8',
    textHex: '#0369A1',
  },
  pink: {
    name: 'Rosa Palo',
    bg: 'bg-[#FBCFE8]',
    border: 'border-[#F472B6]',
    text: 'text-[#831843]',
    header: 'bg-[#F9A8D4]',
    pin: 'bg-[#DB2777]',
    badge: 'bg-[#FCE7F3] text-[#831843] border border-[#F472B6]',
    hex: '#FBCFE8',
    borderHex: '#F472B6',
    textHex: '#831843',
  },
  orange: {
    name: 'Melocotón / Naranja',
    bg: 'bg-[#FED7AA]',
    border: 'border-[#FB923C]',
    text: 'text-[#7C2D12]',
    header: 'bg-[#FDBA74]',
    pin: 'bg-[#EA580C]',
    badge: 'bg-[#FFEDD5] text-[#7C2D12] border border-[#FB923C]',
    hex: '#FED7AA',
    borderHex: '#FB923C',
    textHex: '#7C2D12',
  },
  purple: {
    name: 'Lavanda Brain Up',
    bg: 'bg-[#E9D5FF]',
    border: 'border-[#C084FC]',
    text: 'text-[#581C87]',
    header: 'bg-[#D8B4FE]',
    pin: 'bg-[#8E0E75]',
    badge: 'bg-[#F3E8FF] text-[#581C87] border border-[#C084FC]',
    hex: '#E9D5FF',
    borderHex: '#C084FC',
    textHex: '#581C87',
  },
};

// Recordatorios predefinidos recomendados
export const PRESET_REMINDERS: { label: string; offsetMinutes: number }[] = [
  { label: '20 días antes', offsetMinutes: 20 * 24 * 60 },
  { label: '15 días antes', offsetMinutes: 15 * 24 * 60 },
  { label: '7 días antes (1 sem)', offsetMinutes: 7 * 24 * 60 },
  { label: '3 días antes', offsetMinutes: 3 * 24 * 60 },
  { label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
  { label: '1 hora antes', offsetMinutes: 60 },
  { label: 'En el momento exacto', offsetMinutes: 0 },
];
