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
}

export const POSTIT_COLORS: Record<PostItColor, {
  name: string;
  bg: string;
  border: string;
  text: string;
  header: string;
  pin: string;
  badge: string;
}> = {
  yellow: {
    name: 'Amarillo Clásico',
    bg: 'bg-[#FEF9C3]',
    border: 'border-[#FDE047]',
    text: 'text-[#713F12]',
    header: 'bg-[#FEF08A]',
    pin: 'bg-[#CA8A04]',
    badge: 'bg-yellow-200/80 text-yellow-900',
  },
  green: {
    name: 'Menta Pastel',
    bg: 'bg-[#DCFCE7]',
    border: 'border-[#86EFAC]',
    text: 'text-[#14532D]',
    header: 'bg-[#BBF7D0]',
    pin: 'bg-[#16A34A]',
    badge: 'bg-emerald-200/80 text-emerald-900',
  },
  blue: {
    name: 'Celeste Suave',
    bg: 'bg-[#E0F2FE]',
    border: 'border-[#7DD3FC]',
    text: 'text-[#075985]',
    header: 'bg-[#BAE6FD]',
    pin: 'bg-[#0284C7]',
    badge: 'bg-sky-200/80 text-sky-900',
  },
  pink: {
    name: 'Rosa Palo',
    bg: 'bg-[#FCE7F3]',
    border: 'border-[#F472B6]',
    text: 'text-[#831843]',
    header: 'bg-[#FBCFE8]',
    pin: 'bg-[#DB2777]',
    badge: 'bg-pink-200/80 text-pink-900',
  },
  orange: {
    name: 'Melocotón',
    bg: 'bg-[#FFEDD5]',
    border: 'border-[#FDBA74]',
    text: 'text-[#7C2D12]',
    header: 'bg-[#FED7AA]',
    pin: 'bg-[#EA580C]',
    badge: 'bg-orange-200/80 text-orange-900',
  },
  purple: {
    name: 'Lavanda Brain Up',
    bg: 'bg-[#F3E8FF]',
    border: 'border-[#D8B4FE]',
    text: 'text-[#581C87]',
    header: 'bg-[#E9D5FF]',
    pin: 'bg-[#8E0E75]',
    badge: 'bg-purple-200/80 text-purple-900',
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
