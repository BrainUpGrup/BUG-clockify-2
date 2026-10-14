import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea minutos a formato legible "Xh Ym" o "Ym"
 */
export function formatMinutes(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Convierte segundos a formato cronómetro "HH:MM:SS"
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Analiza texto libre de duración:
 * - "3" -> 3h (180 min)
 * - "330" -> 3h 30m (210 min) (regla de agencia: número superior a 8 en formato HMM/HHMM)
 * - "3,30" o "3.30" -> 3h 30m
 * - "2.5" o "2,5" -> 2h 30m (150 min)
 * - "45" -> 45m
 * - "2h 30m" -> 150 min
 * - "2:30" -> 150 min
 */
export function parseDurationToMinutes(input: string): number {
  if (!input) return 0;
  const clean = input.trim().toLowerCase();

  // Caso 1: "2:30" (HH:MM con dos puntos)
  if (clean.includes(":")) {
    const parts = clean.split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return Math.max(0, hours * 60 + minutes);
  }

  // Caso 2: Unidades explícitas 'h' o 'm': "2h 30m", "2h", "45m", "1.5h"
  const hourMatch = clean.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = clean.match(/(\d+)\s*m/);

  if (hourMatch || minMatch) {
    let total = 0;
    if (hourMatch) {
      total += parseFloat(hourMatch[1]) * 60;
    }
    if (minMatch) {
      total += parseInt(minMatch[1], 10);
    }
    return Math.round(Math.max(0, total));
  }

  // Caso 3: Formato decimal o con coma/punto (ej. "3,30", "3.30", "2.5", "2,5")
  if (clean.includes(",") || clean.includes(".")) {
    const normalized = clean.replace(',', '.');
    const parts = normalized.split(".");
    const whole = parseInt(parts[0], 10) || 0;
    const decStr = parts[1] || "";

    // Si tiene 2 dígitos decimales y es un valor de minutos plausible < 60 (ej. 3.30 o 3,15)
    // se interpreta como 3h 30m
    if (decStr.length === 2 && parseInt(decStr, 10) < 60) {
      return Math.round(whole * 60 + parseInt(decStr, 10));
    }

    // Decimal numérico estándar (ej. 2.5 = 2h 30m)
    const floatVal = parseFloat(normalized);
    if (!isNaN(floatVal)) {
      return Math.round(Math.max(0, floatVal * 60));
    }
  }

  // Caso 4: Shorthand de 3 o 4 dígitos (ej. "330" -> 3h 30m, "145" -> 1h 45m, "830" -> 8h 30m, "1030" -> 10h 30m)
  // Como un número como 330 supera con creces una jornada laboral de 8h, se descompone en Horas + Minutos
  if (/^\d{3,4}$/.test(clean)) {
    const minsStr = clean.slice(-2);
    const hoursStr = clean.slice(0, -2);
    const mins = parseInt(minsStr, 10);
    const hrs = parseInt(hoursStr, 10);

    if (mins < 60) {
      return Math.round(hrs * 60 + mins);
    }
  }

  // Caso 5: Número entero sin letras
  const intVal = parseInt(clean, 10);
  if (!isNaN(intVal)) {
    // Si es un número de dos dígitos entre 9 y 59 (ej. 15, 30, 45), se interpreta como minutos
    if (intVal > 8 && intVal <= 59) {
      return intVal;
    }
    // Si es <= 8 (o jornada laboral estándar 1..8): se interpreta como HORAS (ej. 3 -> 3h = 180m)
    return Math.round(Math.max(0, intVal * 60));
  }

  return 0;
}

/**
 * Formatea una fecha ISO o YYYY-MM-DD a formato amigable en español
 */
export function formatDateSpanish(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    
    // Comprobar si es hoy o ayer
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
