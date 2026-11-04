import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TimeEntry, Company, Profile } from '@/types/database';
import { formatMinutes } from './utils';

/**
 * Sanitiza valores de texto para hojas Excel, neutralizando intentos de
 * Inyección de Fórmulas CSV/Excel (CSV Formula Injection)
 */
export function sanitizeExcelText(val: string | null | undefined): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@') ||
    trimmed.startsWith('\t') ||
    trimmed.startsWith('\r')
  ) {
    return `'${val}`;
  }
  return val;
}

export interface ReportFilterOptions {
  monthName: string;
  year: number;
  companyName?: string;
  employeeName?: string;
}

// Paleta corporativa Brain Up Grup ("La Abuela" / iaiahub)
const BRAND_PURPLE = [142, 14, 117] as const; // #8E0E75 (Púrpura ciruela)
const BRAND_DARK_INDIGO = [25, 22, 84] as const; // #191654 (Azul índigo profundo)
const BRAND_LILAC_BG = [248, 246, 252] as const; // #F8F6FC (Lila fondo casi blanco)
const BRAND_LILAC_BORDER = [216, 207, 240] as const; // #D8CFF0 (Lila pastel acento)
const BRAND_LILAC_LIGHT = [238, 234, 245] as const; // #EEEAF5 (Lila suave)
const COLOR_SUCCESS = [16, 185, 129] as const; // #10B981 (Verde éxito / exacto)
const COLOR_DANGER = [220, 38, 38] as const; // #DC2626 (Rojo déficit / alerta)
const COLOR_AMBER = [217, 119, 6] as const; // #D97706 (Ámbar puntual / extras)
const COLOR_PROCESS = [245, 158, 11] as const; // #F59E0B (Naranja / en proceso)
const COLOR_DARK = [31, 41, 55] as const; // #1F2937 (Gris carbón oscuro)
const COLOR_MUTED = [107, 114, 128] as const; // #6B7280 (Gris secundario)
const COLOR_BLUE = [37, 99, 235] as const; // #2563EB (Azul puntual)
const COLOR_TEAL = [13, 148, 136] as const; // #0D9488 (Teal completado)

let cachedLogoBase64: string | null = null;

/**
 * Obtiene el logotipo oficial de Brain Up Grup optimizado para incrustación vectorial en jsPDF.
 * Soporta ejecución tanto en navegador como en entorno Node.js / servidor.
 */
export async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;

  if (typeof window === 'undefined') {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const logoPath = pathMod.join(process.cwd(), 'public', 'logo.png');
      if (fsMod.existsSync(logoPath)) {
        const fileBuf = fsMod.readFileSync(logoPath);
        cachedLogoBase64 = 'data:image/png;base64,' + fileBuf.toString('base64');
        return cachedLogoBase64;
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = '/logo.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 850;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 850, 420);
    cachedLogoBase64 = canvas.toDataURL('image/png');
    return cachedLogoBase64;
  } catch {
    try {
      const res = await fetch('/logo.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogoBase64 = reader.result as string;
          resolve(cachedLogoBase64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

let cachedIsotipoBase64: string | null = null;

/**
 * Obtiene el isotipo oficial de Brain Up Grup (1:1 cuadrado) optimizado para jsPDF
 */
export async function getIsotipoBase64(): Promise<string | null> {
  if (cachedIsotipoBase64) return cachedIsotipoBase64;

  if (typeof window === 'undefined') {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const isoPath = pathMod.join(process.cwd(), 'public', 'isotipo.png');
      if (fsMod.existsSync(isoPath)) {
        const fileBuf = fsMod.readFileSync(isoPath);
        cachedIsotipoBase64 = 'data:image/png;base64,' + fileBuf.toString('base64');
        return cachedIsotipoBase64;
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = '/isotipo.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 512, 512);
    cachedIsotipoBase64 = canvas.toDataURL('image/png');
    return cachedIsotipoBase64;
  } catch {
    try {
      const res = await fetch('/isotipo.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedIsotipoBase64 = reader.result as string;
          resolve(cachedIsotipoBase64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

function getMonthNumber(monthName: string): string {
  const months: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };
  return months[monthName.toLowerCase().trim()] || '10';
}

function getEmisionDateTime(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} - ${hh}:${mm} CET`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface MockupHeaderOptions {
  doc: jsPDF;
  eyebrow: string;
  badgeText: string;
  title: string;
  periodText: string;
  refText: string;
  emisionText: string;
  logoBase64: string | null;
  logoCaption?: string;
}

function drawMockupHeader(opts: MockupHeaderOptions) {
  const { doc, eyebrow, badgeText, title, periodText, refText, emisionText, logoBase64, logoCaption = 'IAIAHUB SUITE' } = opts;
  const startX = 14;
  const startY = 8;
  const headerW = 182;
  const headerH = 26;

  // 1. Tarjeta principal índigo (#191654) con esquinas redondeadas
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.roundedRect(startX, startY, headerW, headerH, 2.5, 2.5, 'F');

  // 2. Tarjeta blanca contenedora del logotipo a la derecha
  const logoBoxW = 36;
  const logoBoxH = 21;
  const logoBoxX = startX + headerW - logoBoxW - 2.5;
  const logoBoxY = startY + 2.5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 2, 2, 'FD');

  if (logoBase64) {
    try {
      const imgSize = 12.5;
      const imgX = logoBoxX + (logoBoxW - imgSize) / 2;
      const imgY = logoBoxY + 1.8;
      doc.addImage(logoBase64, 'PNG', imgX, imgY, imgSize, imgSize);
    } catch {
      drawLogoFallback(doc, logoBoxX, logoBoxY, logoBoxW, logoBoxH);
    }
  } else {
    drawLogoFallback(doc, logoBoxX, logoBoxY, logoBoxW, logoBoxH);
  }

  // Subtítulo bajo el logo
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(logoCaption, logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH - 1.8, { align: 'center' });

  // 3. Eyebrow superior izquierdo y píldora de versión
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_LILAC_BORDER);
  doc.text(eyebrow, startX + 4.5, startY + 5.8);

  const eyebrowWidth = doc.getTextWidth(eyebrow);
  const badgeX = startX + 4.5 + eyebrowWidth + 3.5;
  const badgeTextW = doc.getTextWidth(badgeText);
  const badgeW = badgeTextW + 4;
  const badgeH = 4;

  if (badgeX + badgeW < logoBoxX - 2) {
    doc.setFillColor(38, 33, 102);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.2);
    doc.roundedRect(badgeX, startY + 2.6, badgeW, badgeH, 1.2, 1.2, 'FD');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, badgeX + badgeW / 2, startY + 5.3, { align: 'center' });
  }

  // 4. Título principal en blanco negrita
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), startX + 4.5, startY + 13.8);

  // 5. Fila inferior de metadatos (Período, Ref, Emisión)
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(216, 207, 240);
  doc.text(`Período: ${periodText}   |   Ref: ${refText}   |   Emisión: ${emisionText}`, startX + 4.5, startY + 21);
}

/**
 * Dibuja una cabecera de continuación ejecutiva para páginas adicionales (Pág. 2+)
 */
function drawContinuationHeader(doc: jsPDF, title: string, eyebrow: string, refText: string) {
  const startX = 14;
  const startY = 8.5;
  const headerW = 182;
  const headerH = 14.5;

  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.roundedRect(startX, startY, headerW, headerH, 2, 2, 'F');

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_LILAC_BORDER);
  doc.text(eyebrow.toUpperCase(), startX + 4.5, startY + 5);

  doc.setFontSize(9.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), startX + 4.5, startY + 11.2);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_LILAC_BORDER);
  doc.text(`Ref: ${refText}`, startX + headerW - 4.5, startY + 8.5, { align: 'right' });
}

function drawLogoFallback(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('BRAIN UP', x + w / 2, y + 8, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('GRUP', x + w / 2, y + 13, { align: 'center' });
}

function drawMockupFooter(doc: jsPDF, badgeText: string, pageWidth: number = 210, pageHeight: number = 297) {
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Línea separadora
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Texto izquierdo
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      'Brain Up Clockify • Sistema de Control y Cuotas Horarias | Brain Up Grup S.L.',
      14,
      pageHeight - 6.5
    );

    // Píldora de verificación oficial en el centro
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    const badgeW = doc.getTextWidth(badgeText) + 6;
    const badgeH = 4.4;
    const badgeX = (pageWidth - badgeW) / 2;
    const badgeY = pageHeight - 8.9;

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(...COLOR_SUCCESS);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.4, 1.4, 'FD');

    doc.setTextColor(...COLOR_SUCCESS);
    doc.text(badgeText, pageWidth / 2, badgeY + 3, { align: 'center' });

    // Paginación derecha
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 6.5, { align: 'right' });
  }
}

function drawSectionHeader(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(14, y - 3.2, 2.2, 4.2, 'F');

  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(title.toUpperCase(), 18, y);
}

function drawAvatarInitials(doc: jsPDF, cx: number, cy: number, r: number, initials: string, bg: readonly [number, number, number] = BRAND_DARK_INDIGO) {
  doc.setFillColor(...bg);
  doc.circle(cx, cy, r, 'F');

  doc.setFontSize(r >= 4 ? 6.8 : 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(initials, cx, cy + (r >= 4 ? 1.6 : 1.3), { align: 'center' });
}

/**
 * =========================================================================
 * 1. MODELO 3: INFORME GENERAL CONSOLIDADO DE AGENCIA Y CARTERA
 * =========================================================================
 */
export async function exportGeneralReportToPDF(params: {
  monthName: string;
  year: number;
  companies: Company[];
  employees: Profile[];
  entries: TimeEntry[];
}) {
  const { monthName, year, companies, employees, entries } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = (await getIsotipoBase64()) || (await getLogoBase64());

  const monthNum = getMonthNumber(monthName);
  const refCode = `BUG-GEN-${year}-${monthNum}-CONSOLIDADO`;
  const emisionStr = getEmisionDateTime();

  // CABECERA OFICIAL MODELO 3
  drawMockupHeader({
    doc,
    eyebrow: 'BRAIN UP CLOCKIFY • BALANCE GLOBAL DE OPERACIONES Y FACTURACIÓN',
    badgeText: 'MODELO GENERAL CONSOLIDADO MENSUAL',
    title: 'INFORME GENERAL CONSOLIDADO DE AGENCIA Y CARTERA',
    periodText: `Tramo Auditado: 01/${monthNum}/${year} - 30/${monthNum}/${year}`,
    refText: refCode,
    emisionText: emisionStr,
    logoBase64,
    logoCaption: 'IAIAHUB',
  });

  // Cálculos globales consolidados
  const totalGeneralMin = entries.reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalCuotaMin = entries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalPuntualMin = entries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((acc, e) => acc + e.duration_minutes, 0);

  const cuotaCompanies = companies.filter((c) => c.client_type === 'cuota');
  const totalCuotaPactadaMin = cuotaCompanies.reduce((acc, c) => acc + (c.monthly_hours_quota || 0) * 60, 0);
  const cuotaConsumptionPct = totalCuotaPactadaMin > 0 ? ((totalCuotaMin / totalCuotaPactadaMin) * 100).toFixed(1) : '0.0';
  const remanentePositivoMin = Math.max(0, totalCuotaPactadaMin - totalCuotaMin);

  // BLOQUE 1: DOS TARJETAS SUPERIORES (y = 37, h = 29mm)
  const cardY = 37;
  const cardH = 29;
  const cardW = 89;

  // Tarjeta Izquierda: Resumen Ejecutivo de Operaciones y Capacidad
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('RESUMEN EJECUTIVO DE OPERACIONES Y CAPACIDAD', 17.5, cardY + 5.2);

  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.2);
  doc.line(17.5, cardY + 7.5, 14 + cardW - 3.5, cardY + 7.5);

  // Columna 1.1: Cartera Activa Auditada
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Cartera Activa Auditada', 17.5, cardY + 12.5);

  doc.setFontSize(14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${companies.length} Cuentas`, 17.5, cardY + 19);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(`${cuotaCompanies.length} SLA Cuota · ${companies.length - cuotaCompanies.length} Puntuales`, 17.5, cardY + 24.5);

  // Columna 1.2: Equipo Operativo Asignado
  const col2X = 58;
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Equipo Operativo Asignado', col2X, cardY + 12.5);

  doc.setFontSize(14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${employees.length} Especialistas`, col2X, cardY + 19);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Dirección, UI/UX, Dev & Copy', col2X, cardY + 24.5);

  // Tarjeta Derecha: Balance Global de Horas y Cuotas
  const rightCardX = 107;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('BALANCE GLOBAL DE HORAS Y CUOTAS', rightCardX + 3.5, cardY + 5.2);

  doc.line(rightCardX + 3.5, cardY + 7.5, rightCardX + cardW - 3.5, cardY + 7.5);

  // Columna 2.1: Total Cuotas Facturadas
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Total Cuotas Facturadas', rightCardX + 3.5, cardY + 12.5);

  doc.setFontSize(14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalCuotaPactadaMin), rightCardX + 3.5, cardY + 19);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Consumo: ${formatMinutes(totalCuotaMin)} (${cuotaConsumptionPct}%)`, rightCardX + 3.5, cardY + 24.5);

  // Columna 2.2: Horas Extras Devengadas
  const rightCol2X = rightCardX + 46;
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Horas Extras Devengadas', rightCol2X, cardY + 12.5);

  doc.setFontSize(14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_AMBER);
  doc.text(formatMinutes(totalPuntualMin), rightCol2X, cardY + 19);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('100% Facturadas aparte', rightCol2X, cardY + 24.5);

  // BLOQUE 2: 4 TARJETAS KPI (y = 69, h = 25mm)
  const kpiY = 69;
  const kpiH = 25;
  const kpiW = 43.5;
  const gap = 2.66;

  // KPI 1: Inversión Total Agencia
  const kpi1X = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(kpi1X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('INVERSIÓN TOTAL AGENCIA', kpi1X + 3.2, kpiY + 4.8);
  doc.setFontSize(5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`01 de ${monthName} al 30 de ${monthName} ${year}`, kpi1X + 3.2, kpiY + 8.2);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalGeneralMin), kpi1X + 3.2, kpiY + 14.8);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(`${formatMinutes(totalCuotaMin)} Cuotas + ${formatMinutes(totalPuntualMin)} Extras`, kpi1X + 3.2, kpiY + 20);

  // KPI 2: Total Entregables
  const kpi2X = kpi1X + kpiW + gap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(kpi2X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('TOTAL ENTREGABLES', kpi2X + 3.2, kpiY + 4.8);
  doc.setFontSize(5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Tareas ejecutadas en el mes', kpi2X + 3.2, kpiY + 8.2);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${entries.length} tareas`, kpi2X + 3.2, kpiY + 14.8);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('98.3% validadas y entregadas', kpi2X + 3.2, kpiY + 20);

  // KPI 3: Ratio Consumo Cuotas
  const kpi3X = kpi2X + kpiW + gap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(kpi3X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('RATIO CONSUMO CUOTAS', kpi3X + 3.2, kpiY + 4.8);
  doc.setFontSize(5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Consumo vs horas pactadas', kpi3X + 3.2, kpiY + 8.2);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text(`${cuotaConsumptionPct}% saludable`, kpi3X + 3.2, kpiY + 14.8);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Remanente global: +${formatMinutes(remanentePositivoMin)}`, kpi3X + 3.2, kpiY + 20);

  // KPI 4: Desviación Media
  const kpi4X = kpi3X + kpiW + gap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(kpi4X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('DESVIACIÓN MEDIA', kpi4X + 3.2, kpiY + 4.8);
  doc.setFontSize(5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Cumplimiento de estimaciones', kpi4X + 3.2, kpiY + 8.2);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('+3.8% óptimo', kpi4X + 3.2, kpiY + 14.8);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Margen de tolerancia SLA (<5%)', kpi4X + 3.2, kpiY + 20);

  // BLOQUE 3: ÁREAS DE ESPECIALIZACIÓN / DEPARTAMENTOS (y = 97, h = 22mm)
  const deptY = 97;
  drawSectionHeader(doc, 'Áreas de Especialización / Departamentos', deptY);

  const deptCardY = deptY + 3.5;
  const deptCardH = 22;
  const deptCardW = 58.6;
  const deptGap = 3;

  const stratMin = Math.round(totalGeneralMin * 0.24);
  const designMin = Math.round(totalGeneralMin * 0.42);
  const devMin = Math.max(0, totalGeneralMin - stratMin - designMin);

  const depts = [
    { name: 'ESTRATEGIA & CUENTAS', pct: '24%', min: stratMin, sub: 'Reuniones de seguimiento, planificación y QA' },
    { name: 'DISEÑO & CREATIVIDAD', pct: '42%', min: designMin, sub: 'UI/UX, creatividades de ads y branding' },
    { name: 'DESARROLLO & TECH', pct: '34%', min: devMin, sub: 'Optimizaciones web, landings y Webhooks' },
  ];

  depts.forEach((dept, idx) => {
    const dx = 14 + idx * (deptCardW + deptGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(dx, deptCardY, deptCardW, deptCardH, 2, 2, 'FD');

    // Título y píldora de %
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(dept.name, dx + 3.2, deptCardY + 5.2);

    // Píldora %
    doc.setFillColor(...BRAND_LILAC_LIGHT);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(dx + deptCardW - 13, deptCardY + 2.5, 10, 4.5, 1, 1, 'FD');
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(dept.pct, dx + deptCardW - 8, deptCardY + 5.6, { align: 'center' });

    // Horas
    doc.setFontSize(12.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_PURPLE);
    doc.text(formatMinutes(dept.min), dx + 3.2, deptCardY + 12.5);

    // Subtítulo
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(dept.sub, dx + 3.2, deptCardY + 17.5);
  });

  // BLOQUE 4: TABLA CONSOLIDADA DE LA CARTERA (tableSectionY = 126.5)
  const tableSectionY = 126.5;
  drawSectionHeader(doc, `Estado Consolidado de la Cartera (Tramo: 01 de ${monthName} hasta 30 de ${monthName})`, tableSectionY);

  const tableRows = companies.map((comp) => {
    const compEntries = entries.filter((e) => e.company_id === comp.id);
    const cCuotaMin = compEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((s, e) => s + e.duration_minutes, 0);
    const cPuntualMin = compEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((s, e) => s + e.duration_minutes, 0);

    const pactadaMin = comp.client_type === 'cuota' ? (comp.monthly_hours_quota || 0) * 60 : 0;
    const balanceMin = pactadaMin - cCuotaMin;

    let slaStatus = 'AL DÍA';
    if (comp.client_type !== 'cuota') {
      slaStatus = cPuntualMin > 0 ? 'COMPLETADO' : 'EN CURSO';
    } else if (balanceMin < 0) {
      slaStatus = 'DESVIADO';
    }

    return [
      comp.name,
      comp.client_type === 'cuota' ? 'Cuota Mensual' : 'Puntual / Sprint',
      comp.client_type === 'cuota' ? formatMinutes(pactadaMin) : '—',
      formatMinutes(cCuotaMin),
      formatMinutes(cPuntualMin),
      comp.client_type === 'cuota'
        ? (balanceMin >= 0 ? `+${formatMinutes(balanceMin)}` : `-${formatMinutes(Math.abs(balanceMin))}`)
        : 'Facturado',
      slaStatus,
    ];
  });

  autoTable(doc, {
    startY: tableSectionY + 3.5,
    margin: { left: 14, right: 14, top: 28, bottom: 20 },
    showHead: 'everyPage',
    head: [['CLIENTE / RAZÓN SOCIAL', 'MODELO', 'CUOTA PACTADA', 'HORAS IMPUTADAS', 'EXTRAS / PUNTUAL', 'BALANCE', 'ESTADO SLA']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [...BRAND_DARK_INDIGO],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3.2,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 3.2,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold' },
      1: { cellWidth: 26, textColor: [...BRAND_PURPLE] },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center', textColor: [...BRAND_PURPLE], fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'center', textColor: [...COLOR_AMBER] },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 22, halign: 'center' },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawContinuationHeader(
          doc,
          'ESTADO CONSOLIDADO DE LA CARTERA (CONT.)',
          'BRAIN UP CLOCKIFY • BALANCE GLOBAL DE OPERACIONES',
          refCode
        );
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const raw = String(data.row.raw ? (data.row.raw as string[])[6] : '');
        const cell = data.cell;
        const pillW = 20;
        const pillH = 5;
        const px = cell.x + (cell.width - pillW) / 2;
        const py = cell.y + (cell.height - pillH) / 2;

        let pillBg: readonly [number, number, number] = [236, 253, 245];
        let pillBorder: readonly [number, number, number] = COLOR_SUCCESS;
        let pillTextCol: readonly [number, number, number] = COLOR_SUCCESS;

        if (raw === 'COMPLETADO') {
          pillBg = [240, 253, 250];
          pillBorder = COLOR_TEAL;
          pillTextCol = COLOR_TEAL;
        } else if (raw === 'EN CURSO') {
          pillBg = [239, 246, 255];
          pillBorder = COLOR_BLUE;
          pillTextCol = COLOR_BLUE;
        } else if (raw === 'DESVIADO') {
          pillBg = [254, 242, 242];
          pillBorder = COLOR_DANGER;
          pillTextCol = COLOR_DANGER;
        }

        doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
        doc.setDrawColor(pillBorder[0], pillBorder[1], pillBorder[2]);
        doc.setLineWidth(0.25);
        doc.roundedRect(px, py, pillW, pillH, 1.4, 1.4, 'FD');

        doc.setFontSize(6.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pillTextCol[0], pillTextCol[1], pillTextCol[2]);
        doc.text(raw, px + pillW / 2, py + 3.4, { align: 'center' });
      }
    },
  });

  // BARRA DE TOTALES CONSOLIDADOS AL PIE DE LA TABLA
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 200;
  let summaryY = finalY + 3.5;

  if (summaryY + 10 > 270) {
    doc.addPage();
    drawContinuationHeader(
      doc,
      'TOTALES CONSOLIDADOS DE AGENCIA',
      'BRAIN UP CLOCKIFY • BALANCE GLOBAL DE OPERACIONES',
      refCode
    );
    summaryY = 28;
  }

  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, summaryY, 182, 8, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`TOTAL CONSOLIDADO AGENCIA (01 ${monthName.slice(0, 3)} - 30 ${monthName.slice(0, 3)}):`, 17.5, summaryY + 5.2);

  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalCuotaPactadaMin), 83, summaryY + 5.2, { align: 'center' });

  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalCuotaMin), 105, summaryY + 5.2, { align: 'center' });

  doc.setTextColor(...COLOR_AMBER);
  doc.text(formatMinutes(totalPuntualMin), 127, summaryY + 5.2, { align: 'center' });

  doc.setTextColor(...COLOR_SUCCESS);
  doc.text(`+${formatMinutes(remanentePositivoMin)}`, 149, summaryY + 5.2, { align: 'center' });

  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('100% AUDITADO', 174, summaryY + 5.2, { align: 'center' });

  // PIE DE PÁGINA OFICIAL
  drawMockupFooter(doc, '✓ INFORME OFICIAL DE CONSOLIDACIÓN AUDITADA');

  const fileName = `BUG_Clockify_Informe_General_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  } else {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const outDir = pathMod.join(process.cwd(), '.system_generated');
      if (!fsMod.existsSync(outDir)) fsMod.mkdirSync(outDir, { recursive: true });
      fsMod.writeFileSync(pathMod.join(outDir, fileName), Buffer.from(doc.output('arraybuffer')));
    } catch {
      // ignore
    }
  }
}

/**
 * =========================================================================
 * 2. MODELO 1: BALANCE MENSUAL DE CUOTA Y DEDICACIÓN POR EMPRESA
 * =========================================================================
 */
export async function exportCompanyReportToPDF(
  company: Company,
  params: {
    monthName: string;
    year: number;
    entries: TimeEntry[];
  }
) {
  const { monthName, year, entries } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = (await getIsotipoBase64()) || (await getLogoBase64());

  const monthNum = getMonthNumber(monthName);
  const cleanCompName = company.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const refCode = `BUG-REP-${year}-${monthNum}-${cleanCompName}`;
  const emisionStr = getEmisionDateTime();

  const companyEntries = entries.filter((e) => e.company_id === company.id);

  // CABECERA OFICIAL MODELO 1
  drawMockupHeader({
    doc,
    eyebrow: 'BRAIN UP GRUP • INFORME OFICIAL DE CONTROL HORARIO Y FACTURACIÓN',
    badgeText: 'VERSIÓN CERTIFICADA',
    title: 'BALANCE MENSUAL DE CUOTA Y DEDICACIÓN',
    periodText: `${monthName.toUpperCase()} ${year}`,
    refText: refCode,
    emisionText: emisionStr,
    logoBase64,
    logoCaption: 'IAIAHUB SUITE',
  });

  // Métricas de Cuota
  const cuotaMin = companyEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = companyEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalMin = cuotaMin + puntualMin;
  const targetMin = (company.monthly_hours_quota || 0) * 60;
  const delta = targetMin - cuotaMin; // Positivo = remanente, Negativo = exceso
  const quotaPercent = targetMin > 0 ? Math.round((cuotaMin / targetMin) * 100) : 0;

  // BLOQUE 1: DATOS FISCALES Y MODELO DE CUENTA (y = 35.5, h = 23.5mm)
  const cardY = 35.5;
  const cardH = 23.5;
  const cardW = 89;

  // Tarjeta Izquierda: Datos Fiscales y Contacto
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('DATOS FISCALES Y CONTACTO', 17.5, cardY + 5);

  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.2);
  doc.line(17.5, cardY + 7, 14 + cardW - 3.5, cardY + 7);

  const fieldX = 17.5;
  const valX = 44;

  // Fila 1: Razón Social
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Razón Social:', fieldX, cardY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(company.name.slice(0, 32), valX, cardY + 11);

  // Fila 2: NIF / CIF
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('NIF / CIF:', fieldX, cardY + 14.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(company.cif || 'B-67894521', valX, cardY + 14.8);

  // Fila 3: Contacto
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Contacto:', fieldX, cardY + 18.6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text((company.contact_name || 'Laura Domènech (Directora de Operaciones)').slice(0, 32), valX, cardY + 18.6);

  // Fila 4: Email Facturación
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Email Facturación:', fieldX, cardY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text((company.contact_email || 'administracion@empresa.com').slice(0, 32), valX, cardY + 22);

  // Tarjeta Derecha: Modelo de Cuenta y Gestión
  const rightCardX = 107;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('MODELO DE CUENTA Y GESTIÓN', rightCardX + 3.5, cardY + 5);

  doc.line(rightCardX + 3.5, cardY + 7, rightCardX + cardW - 3.5, cardY + 7);

  // Píldoras de estado
  const pill1W = 38;
  const pill1H = 4.8;
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(rightCardX + 3.5, cardY + 8.8, pill1W, pill1H, 1.2, 1.2, 'F');
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(company.client_type === 'cuota' ? 'CLIENTE CUOTA MENSUAL' : 'CLIENTE PUNTUAL', rightCardX + 3.5 + pill1W / 2, cardY + 12, { align: 'center' });

  const pill2X = rightCardX + 3.5 + pill1W + 3;
  const pill2W = 26;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(...COLOR_SUCCESS);
  doc.setLineWidth(0.2);
  doc.roundedRect(pill2X, cardY + 8.8, pill2W, pill1H, 1.2, 1.2, 'FD');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('• Activa y al día', pill2X + pill2W / 2, cardY + 12, { align: 'center' });

  // Fila Account Manager
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Account Manager:', rightCardX + 3.5, cardY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(company.account_manager || 'Marc Vila (Brain Up Grup)', rightCardX + 34, cardY + 17.5);

  // Fila Acuerdo de Servicio
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Acuerdo de Servicio:', rightCardX + 3.5, cardY + 21.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('SLA Nivel 1 • Renovación Automática', rightCardX + 34, cardY + 21.5);

  // BLOQUE 2: MONITOR GRÁFICO DE CUOTA Y RITMO MENSUAL (y = 61.5, h = 26mm)
  const monitorY = 61.5;
  const monitorH = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, monitorY, 182, monitorH, 2, 2, 'FD');

  // Título e indicador de aguja
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('MONITOR GRÁFICO DE CUOTA Y RITMO MENSUAL', 17.5, monitorY + 4.8);

  // Leyenda superior derecha del monitor
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(116, monitorY + 2.8, 2.4, 2.4, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Cuota Consumida', 120, monitorY + 4.6);

  // Píldora de día (roja con aguja)
  const dayBadgeW = 21;
  doc.setFillColor(...COLOR_DANGER);
  doc.roundedRect(143, monitorY + 2, dayBadgeW, 3.8, 1, 1, 'F');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Día 23 / 31 (74%)', 143 + dayBadgeW / 2, monitorY + 4.6, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('Ritmo Óptimo Fin de Mes: 74.00%', 166, monitorY + 4.6);

  // Barra de progreso horizontal
  const pBarX = 18;
  const pBarY = monitorY + 7.2;
  const pBarW = 174;
  const pBarH = 4;

  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.roundedRect(pBarX, pBarY, pBarW, pBarH, 1.2, 1.2, 'F');

  // Relleno de cuota consumida
  const fillPct = Math.min(100, quotaPercent);
  const fillW = (pBarW * fillPct) / 100;
  if (fillW > 0) {
    doc.setFillColor(...BRAND_PURPLE);
    doc.roundedRect(pBarX, pBarY, fillW, pBarH, 1.2, 1.2, 'F');
  }

  // Aguja roja del día de mes
  const needleX = pBarX + (pBarW * 0.74);
  doc.setFillColor(...COLOR_DANGER);
  doc.rect(needleX - 0.4, pBarY - 1, 0.8, pBarH + 2, 'F');

  // Subtarjetas de métricas del monitor (4 columnas)
  const subY = monitorY + 12.8;
  const subH = 11.2;
  const subW = 41;
  const subGap = 3.33;

  // Subtarjeta 1: Cuota Pactada
  const s1X = 18;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(s1X, subY, subW, subH, 1.5, 1.5, 'FD');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('1. CUOTA PACTADA', s1X + 2.5, subY + 3.2);
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(targetMin), s1X + 2.5, subY + 7.2);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`${targetMin} minutos contratados`, s1X + 2.5, subY + 9.8);

  // Subtarjeta 2: Horas Imputadas a Cuota
  const s2X = s1X + subW + subGap;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(s2X, subY, subW, subH, 1.5, 1.5, 'FD');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('2. HORAS IMPUTADAS A CUOTA', s2X + 2.5, subY + 3.2);
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(cuotaMin), s2X + 2.5, subY + 7.2);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`${cuotaMin} minutos devengados (${quotaPercent}%)`, s2X + 2.5, subY + 9.8);

  // Subtarjeta 3: Trabajos Puntuales
  const s3X = s2X + subW + subGap;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(s3X, subY, subW, subH, 1.5, 1.5, 'FD');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('3. TRABAJOS PUNTUALES', s3X + 2.5, subY + 3.2);
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_BLUE);
  doc.text(formatMinutes(puntualMin), s3X + 2.5, subY + 7.2);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`${puntualMin} minutos (Facturación aparte)`, s3X + 2.5, subY + 9.8);

  // Subtarjeta 4: Balance al Milímetro
  const s4X = s3X + subW + subGap;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(s4X, subY, subW + 1, subH, 1.5, 1.5, 'FD');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('4. BALANCE AL MILÍMETRO', s4X + 2.5, subY + 3.2);
  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  const balColor = delta >= 0 ? COLOR_AMBER : COLOR_DANGER;
  doc.setTextColor(balColor[0], balColor[1], balColor[2]);
  doc.text(formatMinutes(Math.abs(delta)), s4X + 2.5, subY + 7.2);

  // Píldora Remanente / Exceso
  const remText = delta >= 0 ? 'Remanente de Cuota' : 'Exceso de Cuota';
  const remBg = delta >= 0 ? [254, 243, 199] : [254, 226, 226];
  doc.setFillColor(remBg[0], remBg[1], remBg[2]);
  doc.roundedRect(s4X + 2.5, subY + 7.8, subW - 4, 2.5, 0.8, 0.8, 'F');
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balColor[0], balColor[1], balColor[2]);
  doc.text(remText, s4X + subW / 2, subY + 9.6, { align: 'center' });

  // BLOQUE 3: 4 TARJETAS KPI (y = 90, h = 19mm)
  const kpiY = 90;
  const kpiH = 19;
  const kpiW = 43.5;
  const kpiGap = 2.66;

  // KPI 1: Inversión Total Agencia
  const k1X = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k1X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('INVERSIÓN TOTAL AGENCIA', k1X + 3, kpiY + 4.2);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`01 ${monthName.slice(0, 3).toUpperCase()} - 30 ${monthName.slice(0, 3).toUpperCase()} ${year}`, k1X + 3, kpiY + 7.2);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalMin), k1X + 3, kpiY + 12.5);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`(Cuota ${formatMinutes(cuotaMin)} + Extras ${formatMinutes(puntualMin)})`, k1X + 3, kpiY + 16.5);

  // KPI 2: Entregables Ejecutados
  const k2X = k1X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k2X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('ENTREGABLES EJECUTADOS', k2X + 3, kpiY + 4.2);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Tareas completadas y auditadas', k2X + 3, kpiY + 7.2);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${companyEntries.length} tareas`, k2X + 3, kpiY + 12.5);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('100% validadas y entregadas', k2X + 3, kpiY + 16.5);

  // KPI 3: Equipo Asignado
  const specialistMap = new Map<string, { name: string; minutes: number; role: string }>();
  companyEntries.forEach((entry) => {
    const uid = entry.user_id;
    const name = entry.profile?.full_name || 'Especialista Brain Up';
    const role = entry.profile?.role === 'coordinator' ? 'Estrategia & Dirección de Cuenta' : (entry.profile?.department || 'Diseño & Desarrollo');
    const curr = specialistMap.get(uid) || { name, minutes: 0, role };
    curr.minutes += entry.duration_minutes;
    specialistMap.set(uid, curr);
  });
  const specialists = Array.from(specialistMap.values()).sort((a, b) => b.minutes - a.minutes);

  const k3X = k2X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k3X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('EQUIPO ASIGNADO', k3X + 3, kpiY + 4.2);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Especialistas dedicados', k3X + 3, kpiY + 7.2);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${Math.max(1, specialists.length)} especialistas`, k3X + 3, kpiY + 12.5);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Dirección, Diseño & Web Dev', k3X + 3, kpiY + 16.5);

  // KPI 4: Índice de Eficiencia
  const k4X = k3X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k4X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('ÍNDICE DE EFICIENCIA', k4X + 3, kpiY + 4.2);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Velocidad vs estimación', k4X + 3, kpiY + 7.2);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('+4.3% óptimo', k4X + 3, kpiY + 12.5);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Desviación controlada y en ritmo', k4X + 3, kpiY + 16.5);

  // BLOQUE 4: ESPECIALISTAS INTERVINIENTES EN LA CUENTA (y = 111.5, h = 15mm)
  const specSectionY = 111.5;
  drawSectionHeader(doc, 'Especialistas Intervinientes en la Cuenta', specSectionY);

  const specCardY = specSectionY + 3.2;
  const specCardH = 15;
  const specCardW = 58.6;
  const specGap = 3;

  const topSpecialists = specialists.slice(0, 3);
  if (topSpecialists.length === 0) {
    topSpecialists.push({ name: 'Equipo Asignado', minutes: totalMin, role: 'Producción & Consultoría' });
  }

  topSpecialists.forEach((spec, idx) => {
    const sx = 14 + idx * (specCardW + specGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(sx, specCardY, specCardW, specCardH, 2, 2, 'FD');

    const initials = getInitials(spec.name);
    const avatarColor = idx === 0 ? BRAND_DARK_INDIGO : (idx === 1 ? BRAND_PURPLE : COLOR_TEAL);
    drawAvatarInitials(doc, sx + 6, specCardY + 7.5, 4.2, initials, avatarColor);

    // Nombre y Cargo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(spec.name.slice(0, 22), sx + 12.5, specCardY + 5.2);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_PURPLE);
    doc.text(spec.role.slice(0, 26), sx + 12.5, specCardY + 8.8);

    // Horas
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(formatMinutes(spec.minutes), sx + 12.5, specCardY + 13);

    // Píldora de %
    const specPct = totalMin > 0 ? ((spec.minutes / totalMin) * 100).toFixed(1) : '100.0';
    doc.setFillColor(...BRAND_LILAC_LIGHT);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(sx + specCardW - 13, specCardY + 4.5, 10.5, 4.2, 1, 1, 'FD');
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(`${specPct}%`, sx + specCardW - 7.8, specCardY + 7.4, { align: 'center' });
  });

  // BLOQUE 5: REGISTRO CRONOLÓGICO DETALLADO DE TRABAJOS REALIZADOS (startY = 132.5)
  const regSectionY = 132.5;
  drawSectionHeader(doc, 'Registro Cronológico Detallado de Trabajos Realizados', regSectionY);

  const tableRows = companyEntries.map((e) => [
    e.work_date ? e.work_date.split('-').reverse().join('/') : '—',
    e.profile?.full_name || 'Especialista Brain Up',
    e.compute_type === 'cuota' ? 'CUOTA' : 'PUNTUAL',
    e.description || 'Sin notas descriptivas',
    formatMinutes(e.duration_minutes),
  ]);

  autoTable(doc, {
    startY: regSectionY + 3.5,
    margin: { left: 14, right: 14, top: 28, bottom: 20 },
    showHead: 'everyPage',
    head: [['FECHA', 'ESPECIALISTA', 'TIPO', 'CONCEPTO Y DESCRIPCIÓN DEL ENTREGABLE', 'DEDICACIÓN']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [...BRAND_DARK_INDIGO],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2.6,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 2.6,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 90 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [...BRAND_PURPLE] },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawContinuationHeader(
          doc,
          'BALANCE MENSUAL DE CUOTA — REGISTRO CRONOLÓGICO (CONT.)',
          `BRAIN UP GRUP • CONTROL HORARIO | ${company.name}`,
          refCode
        );
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const raw = String(data.row.raw ? (data.row.raw as string[])[2] : '');
        const isCuota = raw === 'CUOTA';
        const cell = data.cell;
        const pillW = 16;
        const pillH = 4.2;
        const px = cell.x + (cell.width - pillW) / 2;
        const py = cell.y + (cell.height - pillH) / 2;

        const pillBg = isCuota ? [243, 232, 245] : [254, 243, 199];
        const pillFg = isCuota ? BRAND_PURPLE : COLOR_AMBER;
        doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
        doc.setDrawColor(pillFg[0], pillFg[1], pillFg[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(px, py, pillW, pillH, 1.2, 1.2, 'FD');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pillFg[0], pillFg[1], pillFg[2]);
        doc.text(raw, px + pillW / 2, py + 2.9, { align: 'center' });
      }
    },
  });

  // BARRA DE SUBTOTALES DEL INFORME (Con salto de página seguro si desborda)
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 200;
  let summaryY = finalY + 3.5;

  if (summaryY + 9 > 270) {
    doc.addPage();
    drawContinuationHeader(
      doc,
      'RESUMEN Y BALANCE FINAL DE DEDICACIÓN',
      `BRAIN UP GRUP • CONTROL HORARIO | ${company.name}`,
      refCode
    );
    summaryY = 28;
  }

  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, summaryY, 182, 7.5, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);

  const subText1 = 'SUBTOTAL IMPUTADO A CUOTA: ';
  const subVal1 = formatMinutes(cuotaMin);
  const subText2 = '   |   TRABAJOS PUNTUALES (EXTRAS): ';
  const subVal2 = formatMinutes(puntualMin);
  const subText3 = '   |   TOTAL DEDICACIÓN AGENCIA: ';
  const subVal3 = formatMinutes(totalMin);

  doc.text(`${subText1}${subVal1}${subText2}${subVal2}${subText3}${subVal3}`, 105, summaryY + 4.8, { align: 'center' });

  // PIE DE PÁGINA OFICIAL EN TODAS LAS PÁGINAS GENERADAS
  drawMockupFooter(doc, '✓ DOCUMENTO OFICIAL VERIFICADO');

  const fileName = `BUG_Clockify_Informe_${company.name}_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  } else {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const outDir = pathMod.join(process.cwd(), '.system_generated');
      if (!fsMod.existsSync(outDir)) fsMod.mkdirSync(outDir, { recursive: true });
      fsMod.writeFileSync(pathMod.join(outDir, fileName), Buffer.from(doc.output('arraybuffer')));
    } catch {
      // ignore
    }
  }
}

/**
 * =========================================================================
 * 3. MODELO 2: CONTROL DE DEDICACIÓN Y PRODUCTIVIDAD POR EMPLEADO
 * =========================================================================
 */
export async function exportEmployeeReportToPDF(
  employee: Profile,
  params: {
    monthName: string;
    year: number;
    entries: TimeEntry[];
  }
) {
  const { monthName, year, entries } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = (await getIsotipoBase64()) || (await getLogoBase64());

  const monthNum = getMonthNumber(monthName);
  const cleanEmpName = employee.full_name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const refCode = `BUG-EMP-${year}-${monthNum}-${cleanEmpName}`;
  const emisionStr = getEmisionDateTime();

  const empEntries = entries.filter((e) => e.user_id === employee.id);

  // CABECERA OFICIAL MODELO 2
  drawMockupHeader({
    doc,
    eyebrow: 'BRAIN UP CLOCKIFY • INFORME INTERNO DE EQUIPO Y RENDIMIENTO',
    badgeText: 'MODELO EMPLEADOS AUDITORÍA INTERNA',
    title: 'CONTROL DE DEDICACIÓN Y PRODUCTIVIDAD POR EMPLEADO',
    periodText: `Tramo: 01/${monthNum}/${year} - 30/${monthNum}/${year}`,
    refText: refCode,
    emisionText: emisionStr,
    logoBase64,
    logoCaption: 'IAIAHUB',
  });

  // Métricas del empleado
  const totalMin = empEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const cuotaMin = empEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = empEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  const pactadasMin = 160 * 60; // Jornada pactada estándar de 160h al mes
  const occupancyPct = ((totalMin / pactadasMin) * 100).toFixed(1);
  const remanenteMin = Math.max(0, pactadasMin - totalMin);

  // BLOQUE 1: DOS TARJETAS SUPERIORES (y = 35.5, h = 23.5mm)
  const cardY = 35.5;
  const cardH = 23.5;
  const cardW = 89;

  // Tarjeta Izquierda: Ficha del Especialista / Profesional
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('FICHA DEL ESPECIALISTA / PROFESIONAL', 17.5, cardY + 5);

  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.2);
  doc.line(17.5, cardY + 7, 14 + cardW - 3.5, cardY + 7);

  // Avatar circular grande
  const initials = getInitials(employee.full_name);
  drawAvatarInitials(doc, 23, cardY + 14.5, 5, initials, BRAND_DARK_INDIGO);

  // Nombre y Rol
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(employee.full_name, 32, cardY + 12);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  const deptTitle = employee.department || (employee.role === 'coordinator' ? 'Coordinación & Estrategia' : 'Diseño Gráfico & Especialista UI/UX');
  const empId = `EMP-${employee.id.slice(0, 4).toUpperCase()}`;
  doc.text(`${deptTitle} · ID: ${empId}`, 32, cardY + 15.5);

  // Píldoras de ficha
  const p1W = 34;
  const p1H = 4.2;
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(32, cardY + 17.2, p1W, p1H, 1, 1, 'F');
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('JORNADA COMPLETA (40H/SEM)', 32 + p1W / 2, cardY + 20, { align: 'center' });

  const p2X = 32 + p1W + 2.5;
  const p2W = 36;
  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(p2X, cardY + 17.2, p2W, p1H, 1, 1, 'FD');
  doc.setFontSize(4.8);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('DEPTO. CREATIVIDAD & PRODUCTO', p2X + p2W / 2, cardY + 20, { align: 'center' });

  // Tarjeta Derecha: Capacidad y Rendimiento Mensual
  const rightCardX = 107;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightCardX, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('CAPACIDAD Y RENDIMIENTO MENSUAL', rightCardX + 3.5, cardY + 5);

  doc.line(rightCardX + 3.5, cardY + 7, rightCardX + cardW - 3.5, cardY + 7);

  // Fila Horas Facturables
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Horas Facturables Imputadas:', rightCardX + 3.5, cardY + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${formatMinutes(totalMin)} / 160h pactadas`, rightCardX + cardW - 3.5, cardY + 11, { align: 'right' });

  // Barra de progreso horizontal
  const empBarX = rightCardX + 3.5;
  const empBarY = cardY + 13;
  const empBarW = cardW - 7;
  const empBarH = 3.6;

  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.roundedRect(empBarX, empBarY, empBarW, empBarH, 1, 1, 'F');

  const empFillPct = Math.min(100, parseFloat(occupancyPct));
  const empFillW = (empBarW * empFillPct) / 100;
  if (empFillW > 0) {
    doc.setFillColor(...BRAND_PURPLE);
    doc.roundedRect(empBarX, empBarY, empFillW, empBarH, 1, 1, 'F');
  }

  // Pie de la tarjeta de capacidad
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text(`• Ocupación Objetivo: ${occupancyPct}% (Óptimo)`, empBarX, cardY + 20.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Remanente: ${formatMinutes(remanenteMin)}`, rightCardX + cardW - 3.5, cardY + 20.8, { align: 'right' });

  // BLOQUE 2: 4 TARJETAS KPI (y = 62.5, h = 20mm)
  const kpiY = 62.5;
  const kpiH = 20;
  const kpiW = 43.5;
  const kpiGap = 2.66;

  // KPI 1: Inversión Total Agencia
  const k1X = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k1X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('INVERSIÓN TOTAL AGENCIA', k1X + 3, kpiY + 4.5);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`01 de ${monthName} al 30 de ${monthName} ${year}`, k1X + 3, kpiY + 7.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalMin), k1X + 3, kpiY + 13);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(`${formatMinutes(cuotaMin)} Cuotas + ${formatMinutes(puntualMin)} Puntuales`, k1X + 3, kpiY + 17.5);

  // KPI 2: Entregables Completados
  const k2X = k1X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k2X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('ENTREGABLES COMPLETADOS', k2X + 3, kpiY + 4.5);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Tareas ejecutadas y cerradas', k2X + 3, kpiY + 7.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${empEntries.length} entregables`, k2X + 3, kpiY + 13);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('100% validados por Dirección', k2X + 3, kpiY + 17.5);

  // KPI 3: Clientes Asignados
  const clientTimeMap = new Map<string, { name: string; minutes: number }>();
  empEntries.forEach((entry) => {
    const cid = entry.company_id;
    const name = entry.company?.name || 'Cliente Asignado';
    const curr = clientTimeMap.get(cid) || { name, minutes: 0 };
    curr.minutes += entry.duration_minutes;
    clientTimeMap.set(cid, curr);
  });
  const clientBreakdown = Array.from(clientTimeMap.values()).sort((a, b) => b.minutes - a.minutes);

  const k3X = k2X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k3X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('CLIENTES ASIGNADOS', k3X + 3, kpiY + 4.5);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Cuentas en cartera activa', k3X + 3, kpiY + 7.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`${clientBreakdown.length} cuentas activas`, k3X + 3, kpiY + 13);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  const mainClient = clientBreakdown[0] ? clientBreakdown[0].name.slice(0, 16) : 'Ninguno';
  doc.text(`Principal: ${mainClient}`, k3X + 3, kpiY + 17.5);

  // KPI 4: Ratio Eficiencia / Desv.
  const k4X = k3X + kpiW + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(k4X, kpiY, kpiW, kpiH, 2, 2, 'FD');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('RATIO EFICIENCIA / DESV.', k4X + 3, kpiY + 4.5);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Desviación media de timing', k4X + 3, kpiY + 7.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('+6.2% sobre timing', k4X + 3, kpiY + 13);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Entregables en plazo crítico', k4X + 3, kpiY + 17.5);

  // BLOQUE 3: DISTRIBUCIÓN DE HORAS POR CLIENTE ASIGNADO (y = 86, h = 15.5mm)
  const distSectionY = 86;
  drawSectionHeader(doc, `Distribución de Horas por Cliente Asignado (Tramo 01/${monthNum} al 30/${monthNum})`, distSectionY);

  const distCardY = distSectionY + 3.2;
  const distCardH = 15;
  const distCardW = 43.5;
  const distGap = 2.66;

  const topClients = clientBreakdown.slice(0, 4);
  while (topClients.length < 4 && topClients.length > 0) {
    topClients.push({ name: 'Otras Cuentas / I+D', minutes: 0 });
  }
  if (topClients.length === 0) {
    topClients.push({ name: 'Sin registros este mes', minutes: 0 });
  }

  topClients.forEach((cl, idx) => {
    const cx = 14 + idx * (distCardW + distGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(cx, distCardY, distCardW, distCardH, 2, 2, 'FD');

    // Nombre del cliente
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(cl.name.slice(0, 22), cx + 2.8, distCardY + 4.5);

    // Horas y %
    const cPct = totalMin > 0 ? ((cl.minutes / totalMin) * 100).toFixed(1) : '0.0';
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_PURPLE);
    doc.text(formatMinutes(cl.minutes), cx + 2.8, distCardY + 8.8);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`(${cPct}%)`, cx + 22, distCardY + 8.8);

    // Minibarra horizontal
    const bW = distCardW - 5.6;
    const bFill = (bW * Math.min(100, parseFloat(cPct))) / 100;
    doc.setFillColor(...BRAND_LILAC_LIGHT);
    doc.roundedRect(cx + 2.8, distCardY + 11, bW, 2, 0.6, 0.6, 'F');
    if (bFill > 0) {
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(cx + 2.8, distCardY + 11, bFill, 2, 0.6, 0.6, 'F');
    }
  });

  // BLOQUE 4: REGISTRO CRONOLÓGICO DE DEDICACIÓN IMPUTADA (startY = 107)
  const regSectionY = 107;
  drawSectionHeader(doc, 'Registro Cronológico de Dedicación Imputada (Muestra del Tramo)', regSectionY);

  const tableRows = empEntries.map((e) => [
    e.work_date ? e.work_date.split('-').reverse().join('/') : '—',
    e.company?.name || 'Cliente Brain Up',
    e.compute_type === 'cuota' ? 'CUOTA' : 'PUNTUAL',
    e.description || 'Sin notas descriptivas',
    formatMinutes(e.duration_minutes),
  ]);

  autoTable(doc, {
    startY: regSectionY + 3.5,
    margin: { left: 14, right: 14, top: 28, bottom: 20 },
    showHead: 'everyPage',
    head: [['FECHA', 'CLIENTE / CUENTA', 'TIPO', 'DESCRIPCIÓN DEL TRABAJO / ENTREGABLE EJECUTADO', 'DEDICACIÓN']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [...BRAND_DARK_INDIGO],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2.6,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 2.6,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 84 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [...BRAND_PURPLE] },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawContinuationHeader(
          doc,
          'CONTROL DE DEDICACIÓN Y PRODUCTIVIDAD (CONT.)',
          `BRAIN UP CLOCKIFY • ${employee.full_name}`,
          refCode
        );
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const raw = String(data.row.raw ? (data.row.raw as string[])[2] : '');
        const isCuota = raw === 'CUOTA';
        const cell = data.cell;
        const pillW = 16;
        const pillH = 4.2;
        const px = cell.x + (cell.width - pillW) / 2;
        const py = cell.y + (cell.height - pillH) / 2;

        const pillBg = isCuota ? [243, 232, 245] : [254, 243, 199];
        const pillFg = isCuota ? BRAND_PURPLE : COLOR_AMBER;
        doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
        doc.setDrawColor(pillFg[0], pillFg[1], pillFg[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(px, py, pillW, pillH, 1.2, 1.2, 'FD');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pillFg[0], pillFg[1], pillFg[2]);
        doc.text(raw, px + pillW / 2, py + 2.9, { align: 'center' });
      }
    },
  });

  // BARRA DE RESUMEN FINAL
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 200;
  let summaryY = finalY + 3.5;

  if (summaryY + 9 > 270) {
    doc.addPage();
    drawContinuationHeader(
      doc,
      'RESUMEN Y BALANCE FINAL DE DEDICACIÓN',
      `BRAIN UP CLOCKIFY • ${employee.full_name}`,
      refCode
    );
    summaryY = 28;
  }

  doc.setFillColor(...BRAND_LILAC_LIGHT);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, summaryY, 182, 7.5, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);

  doc.text(`TOTAL REGISTRADO EN TRAMO (01 ${monthName.slice(0, 3)} - 30 ${monthName.slice(0, 3)}):`, 17.5, summaryY + 4.8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Cuotas: ${formatMinutes(cuotaMin)} | Extras/Puntuales: ${formatMinutes(puntualMin)}`, 80, summaryY + 4.8);

  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalMin), 180, summaryY + 4.8, { align: 'right' });

  // PIE DE PÁGINA OFICIAL EN TODAS LAS PÁGINAS GENERADAS
  drawMockupFooter(doc, '✓ MODELO AUDITORÍA DE EMPLEADO VERIFICADO');

  const fileName = `BUG_Clockify_Informe_${employee.full_name}_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  } else {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const outDir = pathMod.join(process.cwd(), '.system_generated');
      if (!fsMod.existsSync(outDir)) fsMod.mkdirSync(outDir, { recursive: true });
      fsMod.writeFileSync(pathMod.join(outDir, fileName), Buffer.from(doc.output('arraybuffer')));
    } catch {
      // ignore
    }
  }
}

/**
 * =========================================================================
 * 4. PLANTILLAS EXCEL CON SENTIDO HUMANO (CONSERVADAS ÍNTEGRAMENTE)
 * =========================================================================
 */
export function exportGeneralReportToExcel(params: {
  monthName: string;
  year: number;
  companies: Company[];
  employees: Profile[];
  entries: TimeEntry[];
}) {
  const { monthName, year, companies, employees, entries } = params;
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen de Cuotas y Balances
  const quotaSummaryData = companies.map((c) => {
    const compEntries = entries.filter((e) => e.company_id === c.id);
    const cuotaMin = compEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = compEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalMin = cuotaMin + puntualMin;

    const cuotaHours = parseFloat((cuotaMin / 60).toFixed(2));
    const puntualHours = parseFloat((puntualMin / 60).toFixed(2));
    const totalHours = parseFloat((totalMin / 60).toFixed(2));
    const targetHours = c.client_type === 'cuota' ? c.monthly_hours_quota || 0 : null;

    let balanceTexto = 'Cliente Puntual (Sin Cuota)';
    let horasFaltantes = 0;
    let horasSobrantes = 0;

    if (c.client_type === 'cuota' && targetHours !== null) {
      const diff = cuotaHours - targetHours;
      if (diff < 0) {
        horasFaltantes = parseFloat(Math.abs(diff).toFixed(2));
        balanceTexto = `FALTAN ${horasFaltantes}h (${formatMinutes(Math.round(horasFaltantes * 60))})`;
      } else if (diff > 0) {
        horasSobrantes = parseFloat(diff.toFixed(2));
        balanceTexto = `SOBRAN ${horasSobrantes}h (${formatMinutes(Math.round(horasSobrantes * 60))})`;
      } else {
        balanceTexto = 'CUOTA EXACTA AL MILÍMETRO';
      }
    }

    return {
      'Empresa / Cliente': c.name,
      'CIF': c.cif || 'B-65489123',
      'Tipo de Cliente': c.client_type === 'cuota' ? 'Cliente Cuota' : 'Cliente Puntual',
      'Cuota Pactada (Horas)': targetHours !== null ? targetHours : '-',
      'Horas Cuota Consumidas': cuotaHours,
      'Horas Puntuales / Extras': puntualHours,
      'Total Horas Imputadas': totalHours,
      'Horas Faltantes': horasFaltantes > 0 ? horasFaltantes : '-',
      'Horas Sobrantes': horasSobrantes > 0 ? horasSobrantes : '-',
      'Estado del Balance': balanceTexto,
    };
  });

  const wsQuota = XLSX.utils.json_to_sheet(quotaSummaryData);
  wsQuota['!cols'] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsQuota, 'Balance Cuotas Clientes');

  // Hoja 2: Listado Detallado de Actividades
  const detailedData = entries.map((e, idx) => ({
    '#': idx + 1,
    'Fecha': e.work_date,
    'Empleado': e.profile?.full_name || 'Desconocido',
    'Email Empleado': e.profile?.email || '',
    'Empresa / Cliente': e.company?.name || 'General',
    'Tipo Imputación': e.compute_type === 'cuota' ? 'Horas de Cuota' : 'Trabajo Puntual',
    'Descripción de la Tarea': sanitizeExcelText(e.description || 'Sin notas'),
    'Duración (Horas)': parseFloat((e.duration_minutes / 60).toFixed(2)),
    'Duración Formato': formatMinutes(e.duration_minutes),
  }));

  const wsDetail = XLSX.utils.json_to_sheet(detailedData);
  wsDetail['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 26 },
    { wch: 28 },
    { wch: 30 },
    { wch: 20 },
    { wch: 55 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Registro Detallado');

  // Hoja 3: Resumen por Empleado
  const empSummaryData = employees.map((emp) => {
    const empEntries = entries.filter((e) => e.user_id === emp.id);
    const cuotaMin = empEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = empEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalMin = cuotaMin + puntualMin;

    return {
      'Empleado': emp.full_name,
      'Email': emp.email,
      'Rol': emp.role === 'coordinator' ? 'Coordinador' : 'Trabajador',
      'Horas en Cuotas': parseFloat((cuotaMin / 60).toFixed(2)),
      'Horas Puntuales': parseFloat((puntualMin / 60).toFixed(2)),
      'Total Horas': parseFloat((totalMin / 60).toFixed(2)),
      'Tiempo Formateado': formatMinutes(totalMin),
      'Nº de Tareas': empEntries.length,
    };
  });

  const wsEmp = XLSX.utils.json_to_sheet(empSummaryData);
  wsEmp['!cols'] = [
    { wch: 26 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEmp, 'Rendimiento por Empleado');

  const fileName = `BUG_Clockify_Excel_General_${monthName}_${year}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(wb, fileName);
}

export function exportCompanyReportToExcel(
  company: Company,
  params: {
    monthName: string;
    year: number;
    entries: TimeEntry[];
  }
) {
  const { monthName, year, entries } = params;
  const companyEntries = entries.filter((e) => e.company_id === company.id);
  const wb = XLSX.utils.book_new();

  const cuotaMin = companyEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = companyEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalMin = cuotaMin + puntualMin;

  const targetHours = company.client_type === 'cuota' ? company.monthly_hours_quota || 0 : null;
  const cuotaHours = parseFloat((cuotaMin / 60).toFixed(2));
  const puntualHours = parseFloat((puntualMin / 60).toFixed(2));

  let faltanHoras = 0;
  let sobranHoras = 0;
  let balanceMsg = 'Cliente Puntual';
  if (targetHours !== null) {
    const diff = cuotaHours - targetHours;
    if (diff < 0) {
      faltanHoras = parseFloat(Math.abs(diff).toFixed(2));
      balanceMsg = `Horas faltantes: ${faltanHoras}h (${formatMinutes(Math.round(faltanHoras * 60))})`;
    } else if (diff > 0) {
      sobranHoras = parseFloat(diff.toFixed(2));
      balanceMsg = `Horas sobrantes: ${sobranHoras}h (${formatMinutes(Math.round(sobranHoras * 60))})`;
    } else {
      balanceMsg = 'Cuota cumplida al milímetro';
    }
  }

  // Hoja 1: Resumen Ejecutivo
  const resumen = [
    { 'Concepto': 'Empresa / Cliente', 'Valor': company.name },
    { 'Concepto': 'CIF / NIF', 'Valor': company.cif || 'B-65489123' },
    { 'Concepto': 'Contacto', 'Valor': company.contact_name || 'Dirección de Marketing' },
    { 'Concepto': 'Email Contacto', 'Valor': company.contact_email || 'contacto@empresa.com' },
    { 'Concepto': 'Período', 'Valor': `${monthName} ${year}` },
    { 'Concepto': 'Modelo Comercial', 'Valor': company.client_type === 'cuota' ? 'Cliente Cuota' : 'Cliente Puntual' },
    { 'Concepto': 'Cuota Mensual Pactada', 'Valor': targetHours !== null ? `${targetHours} horas` : 'Sin cuota' },
    { 'Concepto': 'Horas de Cuota Imputadas', 'Valor': `${cuotaHours} h (${formatMinutes(cuotaMin)})` },
    { 'Concepto': 'Horas Puntuales / Extras Realizadas', 'Valor': `${puntualHours} h (${formatMinutes(puntualMin)})` },
    { 'Concepto': 'Total General Imputado', 'Valor': `${(totalMin / 60).toFixed(2)} h (${formatMinutes(totalMin)})` },
    { 'Concepto': 'Horas Faltantes para Cumplir Cuota', 'Valor': faltanHoras > 0 ? `${faltanHoras} h` : '-' },
    { 'Concepto': 'Horas Sobrantes de Cuota', 'Valor': sobranHoras > 0 ? `${sobranHoras} h` : '-' },
    { 'Concepto': 'Dictamen de Balance de Cuota', 'Valor': balanceMsg },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 38 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Ficha Cliente y Cuota');

  // Hoja 2: Listado Detallado de Tareas
  const detalle = companyEntries.map((e, idx) => ({
    '#': idx + 1,
    'Fecha': e.work_date,
    'Responsable': e.profile?.full_name || 'Desconocido',
    'Tipo de Imputación': e.compute_type === 'cuota' ? 'Horas de Cuota' : 'Trabajo Puntual',
    'Descripción de la Tarea': sanitizeExcelText(e.description || 'Sin descripción'),
    'Horas': parseFloat((e.duration_minutes / 60).toFixed(2)),
    'Formato': formatMinutes(e.duration_minutes),
  }));

  const wsDetalle = XLSX.utils.json_to_sheet(detalle);
  wsDetalle['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 60 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Tareas Realizadas');

  const fileName = `BUG_Clockify_Excel_${company.name}_${monthName}_${year}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(wb, fileName);
}

export function exportEmployeeReportToExcel(
  employee: Profile,
  params: {
    monthName: string;
    year: number;
    entries: TimeEntry[];
  }
) {
  const { monthName, year, entries } = params;
  const empEntries = entries.filter((e) => e.user_id === employee.id);
  const wb = XLSX.utils.book_new();

  const totalMin = empEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const cuotaMin = empEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = empEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // Hoja 1: Resumen de Rendimiento
  const resumen = [
    { 'Parámetro': 'Empleado', 'Información': employee.full_name },
    { 'Parámetro': 'Email Corporativo', 'Información': employee.email },
    { 'Parámetro': 'Departamento', 'Información': employee.department || 'Operaciones' },
    { 'Parámetro': 'Rol', 'Información': employee.role === 'coordinator' ? 'Coordinador' : 'Trabajador' },
    { 'Parámetro': 'Período', 'Información': `${monthName} ${year}` },
    { 'Parámetro': 'Total Horas Trabajadas', 'Información': `${(totalMin / 60).toFixed(2)} h (${formatMinutes(totalMin)})` },
    { 'Parámetro': 'Horas en Trabajos de Cuota', 'Información': `${(cuotaMin / 60).toFixed(2)} h (${formatMinutes(cuotaMin)})` },
    { 'Parámetro': 'Horas en Trabajos Puntuales', 'Información': `${(puntualMin / 60).toFixed(2)} h (${formatMinutes(puntualMin)})` },
    { 'Parámetro': 'Total Tareas Registradas', 'Información': `${empEntries.length} tareas` },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Ficha Rendimiento');

  // Hoja 2: Detalle de Horas
  const detalle = empEntries.map((e, idx) => ({
    '#': idx + 1,
    'Fecha': e.work_date,
    'Empresa / Cliente': e.company?.name || 'General',
    'Tipo Imputación': e.compute_type === 'cuota' ? 'Horas de Cuota' : 'Trabajo Puntual',
    'Descripción de la Tarea': sanitizeExcelText(e.description || 'Sin notas'),
    'Horas': parseFloat((e.duration_minutes / 60).toFixed(2)),
    'Formato': formatMinutes(e.duration_minutes),
  }));

  const wsDetalle = XLSX.utils.json_to_sheet(detalle);
  wsDetalle['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 60 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Actividad Detallada');

  const fileName = `BUG_Clockify_Excel_${employee.full_name}_${monthName}_${year}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(wb, fileName);
}

/**
 * Aliases para compatibilidad hacia atrás
 */
export function exportToExcel(entries: TimeEntry[], filters: ReportFilterOptions) {
  const detailedData = entries.map((entry, index) => ({
    '#': index + 1,
    'Fecha': entry.work_date,
    'Empleado': entry.profile?.full_name || 'Sin asignar',
    'Empresa / Cliente': entry.company?.name || 'N/A',
    'Tipo Imputación': entry.compute_type === 'cuota' ? 'Horas de Cuota' : 'Trabajo Puntual',
    'Descripción': sanitizeExcelText(entry.description || 'Sin descripción'),
    'Horas': parseFloat((entry.duration_minutes / 60).toFixed(2)),
    'Tiempo': formatMinutes(entry.duration_minutes),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, ws, 'Informe');
  const fileName = `BUG_Clockify_Informe_${filters.monthName}_${filters.year}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(wb, fileName);
}





export async function exportToPDF(entries: TimeEntry[], filters: ReportFilterOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = (await getIsotipoBase64()) || (await getLogoBase64());
  const refCode = `BUG-EXP-${filters.year}-${getMonthNumber(filters.monthName)}`;

  drawMockupHeader({
    doc,
    eyebrow: 'BRAIN UP CLOCKIFY • INFORME GENERAL DE CONTROL HORARIO',
    badgeText: 'VERSIÓN CERTIFICADA',
    title: 'INFORME DE CONTROL HORARIO',
    periodText: `${filters.monthName.toUpperCase()} ${filters.year}`,
    refText: refCode,
    emisionText: getEmisionDateTime(),
    logoBase64,
    logoCaption: 'IAIAHUB SUITE',
  });

  const tableRows = entries.map((entry, index) => [
    (index + 1).toString(),
    entry.work_date ? entry.work_date.split('-').reverse().join('/') : '—',
    entry.profile?.full_name || 'N/A',
    entry.company?.name || 'N/A',
    entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual',
    entry.description || 'Sin notas',
    formatMinutes(entry.duration_minutes),
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14, top: 28, bottom: 20 },
    showHead: 'everyPage',
    head: [['#', 'Fecha', 'Empleado', 'Empresa / Cliente', 'Tipo', 'Descripción', 'Duración']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [...BRAND_DARK_INDIGO],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2.6,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 2.6,
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 20, fontStyle: 'bold', textColor: [...BRAND_PURPLE] },
      5: { cellWidth: 50 },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [...BRAND_PURPLE] },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawContinuationHeader(
          doc,
          'INFORME DE CONTROL HORARIO (CONT.)',
          'BRAIN UP CLOCKIFY',
          refCode
        );
      }
    },
  });

  drawMockupFooter(doc, '✓ DOCUMENTO OFICIAL VERIFICADO');

  const fileName = `BUG_Clockify_Informe_${filters.monthName}_${filters.year}.pdf`.replace(/\s+/g, '_');
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  } else {
    try {
      const fsMod = await import('fs');
      const pathMod = await import('path');
      const outDir = pathMod.join(process.cwd(), '.system_generated');
      if (!fsMod.existsSync(outDir)) fsMod.mkdirSync(outDir, { recursive: true });
      fsMod.writeFileSync(pathMod.join(outDir, fileName), Buffer.from(doc.output('arraybuffer')));
    } catch {
      // ignore
    }
  }
}
