import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimeEntry, Company, Profile } from '@/types/database';
import { formatMinutes } from './utils';

export interface ReportFilterOptions {
  monthName: string;
  year: number;
  companyName?: string;
  employeeName?: string;
}

// Paleta corporativa Brain Up Grup ("La Abuela")
const BRAND_PURPLE = [142, 14, 117] as const; // #8E0E75 (Púrpura ciruela)
const BRAND_DARK_INDIGO = [25, 22, 84] as const; // #191654 (Azul índigo profundo)
const BRAND_LILAC_BG = [248, 246, 252] as const; // #F8F6FC (Lila casi blanco)
const BRAND_LILAC_BORDER = [216, 207, 240] as const; // #D8CFF0 (Lila pastel acento)
const BRAND_LILAC_LIGHT = [238, 234, 245] as const; // #EEEAF5
const COLOR_SUCCESS = [16, 185, 129] as const; // #10B981 (Verde éxito / exacta)
const COLOR_WARNING = [217, 119, 6] as const; // #D97706 (Ámbar horas faltantes)
const COLOR_DARK = [35, 35, 35] as const; // #232323 (Gris carbón)
const COLOR_MUTED = [105, 105, 105] as const; // #696969

let cachedLogoBase64: string | null = null;

/**
 * Obtiene el logotipo oficial de "La Abuela" optimizado para incrustación vectorial en jsPDF
 */
export async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  if (typeof window === 'undefined') return null;

  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = '/logo.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    // 256x256 píxeles garantiza una resolución retina de 320 DPI para el recuadro de 20x20mm
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 256, 256);
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

/**
 * Dibuja la cabecera corporativa de Brain Up Grup en formato VERTICAL (Portrait A4)
 * Con el logotipo oficial de "La Abuela" en la esquina superior derecha y la información
 * distribuida de manera ejecutiva sin solapamientos.
 */
function drawCorporateHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  logoBase64: string | null = null,
  pageWidth: number = 210
) {
  // Franja superior delgada de acento púrpura ciruela (#8E0E75)
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Bloque principal índigo profundo (#191654)
  const headerH = 25.5; // De y=2.5 a y=28
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.rect(0, 2.5, pageWidth, headerH, 'F');

  // Línea inferior de acento ciruela
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 2.5 + headerH - 0.8, pageWidth, 0.8, 'F');

  // LOGO DE LA ABUELA ARRIBA A LA DERECHA
  // Tarjeta contenedora de 22x21.5mm situada a 14mm del margen derecho (x = 210 - 14 - 22 = 174mm)
  const logoBoxX = 174;
  const logoBoxY = 4.5;
  const logoBoxW = 22;
  const logoBoxH = 21.5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 2, 2, 'FD');

  if (logoBase64) {
    try {
      // Logotipo de La Abuela nítido y centrado
      doc.addImage(logoBase64, 'PNG', logoBoxX + 1.25, logoBoxY + 1, 19.5, 19.5);
    } catch {
      drawLogoFallback(doc, logoBoxX, logoBoxY, logoBoxW, logoBoxH);
    }
  } else {
    drawLogoFallback(doc, logoBoxX, logoBoxY, logoBoxW, logoBoxH);
  }

  // INFORMACIÓN CORPORATIVA DISTRIBUIDA (ancho asignado de 154mm, sin solapamientos)
  const maxContentW = 154;

  // 1. Identificador de sistema / Eyebrow superior
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_LILAC_BORDER);
  doc.text('BRAIN UP GRUP  •  CONTROL HORARIO Y CUOTAS OFICIAL', 14, 8);

  // 2. Titular principal (con división multilínea protegida ante nombres largos)
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), maxContentW);
  doc.text(titleLines, 14, 14.5);

  // 3. Fila de metadatos (Período y fecha de emisión)
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(216, 207, 240);
  doc.text(subtitle, 14, 24);

  const nowStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(6.8);
  doc.setTextColor(190, 180, 225);
  doc.text(`Emitido: ${nowStr}`, 170, 24, { align: 'right' });
}

function drawLogoFallback(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('BUG', x + w / 2, y + 10, { align: 'center' });
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Brain Up', x + w / 2, y + 15, { align: 'center' });
}

/**
 * Dibuja el pie de página institucional en formato VERTICAL (Portrait A4)
 */
function drawCorporateFooter(doc: jsPDF, pageWidth: number = 210, pageHeight: number = 297) {
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      'BUG Clockify - Sistema de Control y Cuotas Horarias | Brain Up Grup',
      14,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
}

/**
 * =========================================================================
 * 1. INFORME GENERAL DE LA AGENCIA EN FORMATO VERTICAL (PORTRAIT)
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
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = 182; // 210 - 28

  const logoBase64 = await getLogoBase64();

  drawCorporateHeader(
    doc,
    'Informe Estadístico General de la Agencia',
    `Período analizado: ${monthName} ${year} | Total registros: ${entries.length} tareas`,
    logoBase64,
    pageWidth
  );

  // Totales globales
  const totalGeneralMinutes = entries.reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalCuotaMinutes = entries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalPuntualMinutes = entries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((acc, e) => acc + e.duration_minutes, 0);

  // Salud de Cuotas Clientes
  const cuotaClients = companies.filter((c) => c.client_type === 'cuota');
  let faltanCount = 0;
  let sobranCount = 0;
  let exactoCount = 0;
  cuotaClients.forEach((c) => {
    const targetM = (c.monthly_hours_quota || 0) * 60;
    const currentM = entries
      .filter((e) => e.company_id === c.id && e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    if (currentM < targetM) faltanCount++;
    else if (currentM > targetM) sobranCount++;
    else exactoCount++;
  });

  // 1. Grid 2x2 de Tarjetas KPI con franjas de acento laterales (182mm)
  const cardW = 88;
  const cardH = 16;
  const row1Y = 33;
  const row2Y = 52;

  // KPI 1: Horas Totales Generales
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, row1Y, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14, row1Y, 3, cardH, 1, 1, 'F');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TOTAL HORAS DE AGENCIA', 20, row1Y + 4.5);
  doc.setFontSize(12.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalGeneralMinutes), 20, row1Y + 11.5);
  doc.setFontSize(7.2);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`(${(totalGeneralMinutes / 60).toFixed(1)} hrs en ${entries.length} reg.)`, 54, row1Y + 11.5);

  // KPI 2: Horas en Cuotas
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + cardW + 6, row1Y, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.roundedRect(14 + cardW + 6, row1Y, 3, cardH, 1, 1, 'F');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('HORAS COMPUTADAS A CUOTA', 14 + cardW + 12, row1Y + 4.5);
  doc.setFontSize(12.5);
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalCuotaMinutes), 14 + cardW + 12, row1Y + 11.5);
  doc.setFontSize(7.2);
  doc.setTextColor(...COLOR_MUTED);
  const cuotaPercent = totalGeneralMinutes > 0 ? ((totalCuotaMinutes / totalGeneralMinutes) * 100).toFixed(0) : '0';
  doc.text(`(${cuotaPercent}% del volumen)`, 14 + cardW + 46, row1Y + 11.5);

  // KPI 3: Horas Puntuales / Extras
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14, row2Y, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14, row2Y, 3, cardH, 1, 1, 'F');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TRABAJOS PUNTUALES / EXTRAS', 20, row2Y + 4.5);
  doc.setFontSize(12.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalPuntualMinutes), 20, row2Y + 11.5);
  doc.setFontSize(7.2);
  doc.setTextColor(...COLOR_MUTED);
  const puntualPercent = totalGeneralMinutes > 0 ? ((totalPuntualMinutes / totalGeneralMinutes) * 100).toFixed(0) : '0';
  doc.text(`(${puntualPercent}% del volumen)`, 54, row2Y + 11.5);

  // KPI 4: Salud de Cuotas Clientes
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + cardW + 6, row2Y, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(...COLOR_SUCCESS);
  doc.roundedRect(14 + cardW + 6, row2Y, 3, cardH, 1, 1, 'F');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('ESTADO DE CUOTAS CLIENTES', 14 + cardW + 12, row2Y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text(
    `${faltanCount} Faltan  |  ${sobranCount} Sobran  |  ${exactoCount} Clavadas`,
    14 + cardW + 12,
    row2Y + 11.5
  );

  // 2. SECCIÓN: GRÁFICO VECTORIAL NATIVO DE CUOTAS
  let currentY = 73;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('SEGUIMIENTO DE CUOTAS AL MILÍMETRO (CLIENTES CUOTA)', 14, currentY);

  // Leyenda limpia en su propia línea
  currentY += 4.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // 1. Cuota consumida
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(14, currentY, 4, 2.5, 'F');
  doc.setTextColor(...COLOR_DARK);
  doc.text('Cuota Consumida', 20, currentY + 2.2);

  // 2. Horas faltantes
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.rect(56, currentY, 4, 2.5, 'FD');
  doc.text('Horas Faltantes', 62, currentY + 2.2);

  // 3. Horas sobrantes
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.rect(98, currentY, 4, 2.5, 'F');
  doc.text('Horas Sobrantes (Exceso)', 104, currentY + 2.2);

  // 4. Marca Meta 100%
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.6);
  doc.line(152, currentY, 152, currentY + 2.5);
  doc.text('Meta Pactada (100%)', 155, currentY + 2.2);

  currentY += 5.5;

  // Renderizar tarjetas visuales de cada cliente cuota
  cuotaClients.forEach((company) => {
    const targetMin = (company.monthly_hours_quota || 0) * 60;
    const cuotaMin = entries
      .filter((e) => e.company_id === company.id && e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = entries
      .filter((e) => e.company_id === company.id && e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalGeneral = cuotaMin + puntualMin;
    const delta = cuotaMin - targetMin;

    const cardBoxH = 17.5;

    // Control de salto de página si excede el pie
    if (currentY + cardBoxH > pageHeight - 16) {
      doc.addPage();
      drawCorporateHeader(
        doc,
        'Informe Estadístico General de la Agencia',
        `Período analizado: ${monthName} ${year} | Continuación Cuotas`,
        logoBase64,
        pageWidth
      );
      currentY = 34;
    }

    // Tarjeta
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, currentY, contentWidth, cardBoxH, 1.5, 1.5, 'FD');

    // Franja lateral según estado
    if (delta < 0) {
      doc.setFillColor(245, 158, 11);
    } else if (delta > 0) {
      doc.setFillColor(...BRAND_PURPLE);
    } else {
      doc.setFillColor(...COLOR_SUCCESS);
    }
    doc.roundedRect(14, currentY, 2.5, cardBoxH, 1, 1, 'F');

    // Fila 1: Nombre de la empresa
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text(company.name, 19, currentY + 4.5);

    // Badge alineado a la derecha
    const badgeW = 46;
    const badgeH = 5;
    const badgeX = 14 + contentWidth - badgeW - 4;
    const badgeY = currentY + 2;

    if (delta < 0) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Faltan: ${formatMinutes(Math.abs(delta))}`, badgeX + badgeW / 2, badgeY + 3.6, { align: 'center' });
    } else if (delta > 0) {
      doc.setFillColor(243, 232, 255);
      doc.setDrawColor(...BRAND_PURPLE);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');
      doc.setTextColor(...BRAND_PURPLE);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Sobran: +${formatMinutes(delta)}`, badgeX + badgeW / 2, badgeY + 3.6, { align: 'center' });
    } else {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(...COLOR_SUCCESS);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Cuota al milímetro', badgeX + badgeW / 2, badgeY + 3.6, { align: 'center' });
    }

    // Fila 2: Subtítulo con métricas
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    const detailText = `Pactada: ${company.monthly_hours_quota}h  |  Consumida: ${formatMinutes(cuotaMin)}  |  Puntual extra: ${formatMinutes(puntualMin)}  |  Total: ${formatMinutes(totalGeneral)}`;
    doc.text(detailText, 19, currentY + 8.5);

    // Fila 3: Barra de Progreso Visual Horizontal
    const barWidth = contentWidth - 10;
    const barHeight = 3.6;
    const barX = 19;
    const barY = currentY + 11;
    const maxVal = Math.max(targetMin, cuotaMin) * 1.15 || 60;

    // Fondo grisáceo lila
    doc.setFillColor(...BRAND_LILAC_LIGHT);
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

    const targetPx = (targetMin / maxVal) * barWidth;
    const cuotaPx = (cuotaMin / maxVal) * barWidth;

    if (delta <= 0) {
      // Consumido
      if (cuotaPx > 0) {
        doc.setFillColor(...BRAND_PURPLE);
        doc.roundedRect(barX, barY, Math.max(cuotaPx, 1), barHeight, 1, 1, 'F');
      }
      // Faltante en amarillo suave
      if (targetPx > cuotaPx) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(barX + cuotaPx, barY, targetPx - cuotaPx, barHeight, 0.5, 0.5, 'F');
      }
    } else {
      // Consumido hasta meta
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(barX, barY, targetPx, barHeight, 1, 1, 'F');
      // Exceso en índigo
      doc.setFillColor(...BRAND_DARK_INDIGO);
      doc.roundedRect(barX + targetPx, barY, cuotaPx - targetPx, barHeight, 1, 1, 'F');
    }

    // Marca de meta (100%)
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);
    doc.line(barX + targetPx, barY - 0.8, barX + targetPx, barY + barHeight + 0.8);

    currentY += cardBoxH + 3;
  });

  // 3. TABLA RESUMEN DE DEDICACIÓN Y BALANCE POR EMPRESA
  if (currentY + 45 > pageHeight - 16) {
    doc.addPage();
    drawCorporateHeader(
      doc,
      'Informe Estadístico General de la Agencia',
      `Período analizado: ${monthName} ${year} | Balance por Empresa`,
      logoBase64,
      pageWidth
    );
    currentY = 34;
  } else {
    currentY += 4;
  }

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text('RESUMEN DE DEDICACIÓN Y BALANCE POR EMPRESA', 14, currentY);

  const tableBody = companies.map((company) => {
    const compEntries = entries.filter((e) => e.company_id === company.id);
    const cuotaMin = compEntries
      .filter((e) => e.compute_type === 'cuota')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const puntualMin = compEntries
      .filter((e) => e.compute_type === 'puntual')
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalMin = cuotaMin + puntualMin;

    let balanceStr = 'N/A (Puntual)';
    if (company.client_type === 'cuota') {
      const targetMin = (company.monthly_hours_quota || 0) * 60;
      const diff = cuotaMin - targetMin;
      if (diff < 0) balanceStr = `Faltan ${formatMinutes(Math.abs(diff))}`;
      else if (diff > 0) balanceStr = `Sobran ${formatMinutes(diff)}`;
      else balanceStr = 'Al milímetro';
    }

    return [
      company.name,
      company.client_type === 'cuota' ? `Cuota (${company.monthly_hours_quota}h)` : 'Puntual',
      company.client_type === 'cuota' ? formatMinutes(cuotaMin) : '-',
      formatMinutes(puntualMin),
      formatMinutes(totalMin),
      balanceStr,
    ];
  });

  autoTable(doc, {
    startY: currentY + 3.5,
    head: [['Empresa / Cliente', 'Tipo', 'Horas Cuota', 'Horas Puntuales', 'Horas Totales', 'Balance de Cuota']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw);
        if (val.startsWith('Faltan')) {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val.startsWith('Sobran')) {
          data.cell.styles.textColor = [...BRAND_PURPLE];
        } else if (val.includes('milímetro')) {
          data.cell.styles.textColor = [6, 95, 70];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawCorporateFooter(doc, pageWidth, pageHeight);

  const filename = `BUG_Clockify_Informe_General_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

/**
 * =========================================================================
 * 2. INFORME POR EMPRESA / CLIENTE CON INFORMACIÓN DETALLADA (PORTRAIT)
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
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = 182;

  const logoBase64 = await getLogoBase64();

  const companyEntries = entries.filter((e) => e.company_id === company.id);

  drawCorporateHeader(
    doc,
    `Informe Oficial de Cliente: ${company.name}`,
    `Período: ${monthName} ${year} | Clasificación: ${company.client_type === 'cuota' ? 'Cliente Cuota Mensual' : 'Cliente Facturación Puntual'}`,
    logoBase64,
    pageWidth
  );

  const cuotaMin = companyEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = companyEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalGeneralMin = cuotaMin + puntualMin;
  const targetMin = (company.monthly_hours_quota || 0) * 60;
  const delta = cuotaMin - targetMin;

  // 1. FICHA DETALLADA DEL CLIENTE (INFORMACIÓN EXHAUSTIVA)
  const clientCardY = 33;
  const clientCardH = 30;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, clientCardY, contentWidth, clientCardH, 2, 2, 'FD');

  // Franja lateral ciruela
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14, clientCardY, 3, clientCardH, 1, 1, 'F');

  // Encabezado de la Ficha
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('DATOS OFICIALES Y CONDICIONES DEL CLIENTE', 20, clientCardY + 5);

  // Columna Izquierda de Información Detallada
  const col1X = 20;
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_DARK);

  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', col1X, clientCardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name, col1X + 24, clientCardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('NIF / CIF:', col1X, clientCardY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(company.cif || 'B-65489123', col1X + 24, clientCardY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Contacto:', col1X, clientCardY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(company.contact_name || 'Dirección de Marketing', col1X + 24, clientCardY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', col1X, clientCardY + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(company.contact_email || 'contacto@empresa.com', col1X + 24, clientCardY + 26);

  // Columna Derecha de Información Detallada
  const col2X = 106;
  doc.setFont('helvetica', 'bold');
  doc.text('Modelo Comercial:', col2X, clientCardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    company.client_type === 'cuota' ? 'Contrato de Cuota Fija Mensual' : 'Servicios Puntuales On-Demand',
    col2X + 28,
    clientCardY + 11
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Cuota Pactada:', col2X, clientCardY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(
    company.client_type === 'cuota' ? `${company.monthly_hours_quota} horas / mes` : 'Sin cuota fija (por tarea)',
    col2X + 28,
    clientCardY + 16
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Account Manager:', col2X, clientCardY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(company.account_manager || 'Alejandro Ramos (Brain Up)', col2X + 28, clientCardY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado Cuenta:', col2X, clientCardY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('Activa y en Producción', col2X + 28, clientCardY + 26);

  // 2. PANEL DE BALANCE DE CUOTA
  let nextSectionY = clientCardY + clientCardH + 4;

  if (company.client_type === 'cuota') {
    const bannerH = 14;

    if (delta < 0) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.35);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(14, nextSectionY, 3, bannerH, 1, 1, 'F');

      doc.setTextColor(180, 83, 9);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`DICTAMEN: HORAS FALTANTES PARA COMPLETAR CUOTA (${formatMinutes(Math.abs(delta))})`, 20, nextSectionY + 5.5);

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Para completar la cuota pactada de ${company.monthly_hours_quota}h faltan ${formatMinutes(Math.abs(delta))} de imputación este período.`,
        20,
        nextSectionY + 10.5
      );
    } else if (delta > 0) {
      doc.setFillColor(243, 232, 255);
      doc.setDrawColor(...BRAND_PURPLE);
      doc.setLineWidth(0.35);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(14, nextSectionY, 3, bannerH, 1, 1, 'F');

      doc.setTextColor(...BRAND_PURPLE);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`DICTAMEN: HORAS SOBRANTES REGISTRADAS (+${formatMinutes(delta)})`, 20, nextSectionY + 5.5);

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Se ha superado la cuota pactada de ${company.monthly_hours_quota}h en ${formatMinutes(delta)} adicionales durante este período.`,
        20,
        nextSectionY + 10.5
      );
    } else {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(...COLOR_SUCCESS);
      doc.setLineWidth(0.35);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');
      doc.setFillColor(...COLOR_SUCCESS);
      doc.roundedRect(14, nextSectionY, 3, bannerH, 1, 1, 'F');

      doc.setTextColor(6, 95, 70);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DICTAMEN: CUOTA CUMPLIDA AL MILÍMETRO (100%)', 20, nextSectionY + 5.5);

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Se han cubierto con exactitud matemática las ${company.monthly_hours_quota}h 00m pactadas para el mes.`,
        20,
        nextSectionY + 10.5
      );
    }

    // Gráfico de barra de cuota
    nextSectionY += bannerH + 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text('GRÁFICO VECTORIAL DE CUMPLIMIENTO:', 14, nextSectionY);

    const barW = contentWidth - 65;
    const barX = 75;
    const barY = nextSectionY - 3;
    const maxVal = Math.max(targetMin, cuotaMin) * 1.25 || 60;

    doc.setFillColor(...BRAND_LILAC_LIGHT);
    doc.roundedRect(barX, barY, barW, 4, 1, 1, 'F');

    const targetPx = (targetMin / maxVal) * barW;
    const cuotaPx = (cuotaMin / maxVal) * barW;

    if (delta <= 0) {
      if (cuotaPx > 0) {
        doc.setFillColor(...BRAND_PURPLE);
        doc.roundedRect(barX, barY, Math.max(cuotaPx, 1), 4, 1, 1, 'F');
      }
      if (targetPx > cuotaPx) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(barX + cuotaPx, barY, targetPx - cuotaPx, 4, 0.5, 0.5, 'F');
      }
    } else {
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(barX, barY, targetPx, 4, 1, 1, 'F');
      doc.setFillColor(...BRAND_DARK_INDIGO);
      doc.roundedRect(barX + targetPx, barY, cuotaPx - targetPx, 4, 1, 1, 'F');
    }

    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);
    doc.line(barX + targetPx, barY - 1, barX + targetPx, barY + 5);

    nextSectionY += 6;
  } else {
    // Cliente puntual
    const bannerH = 12;
    doc.setFillColor(...BRAND_LILAC_BG);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');
    doc.setFillColor(...BRAND_DARK_INDIGO);
    doc.roundedRect(14, nextSectionY, 3, bannerH, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text('MODALIDAD PUNTUAL / ON-DEMAND', 20, nextSectionY + 4.5);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `Todas las horas registradas (${formatMinutes(totalGeneralMin)}) computan bajo tarifa de trabajos puntuales acordada por proyecto.`,
      20,
      nextSectionY + 9
    );

    nextSectionY += bannerH + 4;
  }

  // 3. CUATRO TARJETAS DE RESUMEN HORARIO
  const miniCardW = (contentWidth - 9) / 4;
  const miniCardH = 13.5;

  const metricCards = company.client_type === 'cuota'
    ? [
        { label: 'CUOTA PACTADA', val: `${company.monthly_hours_quota}h 00m`, color: COLOR_DARK },
        { label: 'HORAS EN CUOTA', val: formatMinutes(cuotaMin), color: BRAND_PURPLE },
        { label: 'TRABAJOS PUNTUALES', val: formatMinutes(puntualMin), color: BRAND_DARK_INDIGO },
        { label: 'TOTAL GENERAL', val: formatMinutes(totalGeneralMin), color: BRAND_PURPLE },
      ]
    : [
        { label: 'HORAS TOTALES', val: formatMinutes(totalGeneralMin), color: BRAND_PURPLE },
        { label: 'TOTAL TAREAS', val: `${companyEntries.length} tareas`, color: COLOR_DARK },
        { label: 'TARIFA ACORDADA', val: 'Estándar Agencia', color: BRAND_DARK_INDIGO },
        { label: 'ESTADO', val: 'Completado', color: COLOR_SUCCESS },
      ];

  metricCards.forEach((c, idx) => {
    const mX = 14 + idx * (miniCardW + 3);
    doc.setFillColor(...BRAND_LILAC_BG);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(mX, nextSectionY, miniCardW, miniCardH, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(c.label, mX + 3.5, nextSectionY + 4.2);

    doc.setFontSize(9.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, mX + 3.5, nextSectionY + 10.2);
  });

  nextSectionY += miniCardH + 5;

  // 4. TABLA DETALLADA DE TAREAS EN FORMATO VERTICAL
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`REGISTRO CRONOLÓGICO DE TAREAS (${companyEntries.length} registros)`, 14, nextSectionY);

  const tableRows = companyEntries.map((entry, idx) => [
    (idx + 1).toString(),
    entry.work_date,
    entry.profile?.full_name || 'Desconocido',
    entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual / Extra',
    entry.description || 'Sin notas descriptivas',
    formatMinutes(entry.duration_minutes),
  ]);

  autoTable(doc, {
    startY: nextSectionY + 3,
    head: [['#', 'Fecha', 'Profesional', 'Tipo', 'Descripción de la Tarea', 'Duración']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 36 },
      3: { cellWidth: 26, fontStyle: 'bold' },
      4: { cellWidth: 68 },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  drawCorporateFooter(doc, pageWidth, pageHeight);

  const filename = `BUG_Clockify_Informe_${company.name}_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

/**
 * =========================================================================
 * 3. INFORME POR EMPLEADO EN FORMATO VERTICAL (PORTRAIT)
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
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = 182;

  const logoBase64 = await getLogoBase64();

  const empEntries = entries.filter((e) => e.user_id === employee.id);

  drawCorporateHeader(
    doc,
    `Informe Individual: ${employee.full_name}`,
    `Período: ${monthName} ${year} | Email: ${employee.email} | Rol: ${employee.role === 'coordinator' ? 'Coordinador' : 'Trabajador'}`,
    logoBase64,
    pageWidth
  );

  const totalMin = empEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const cuotaMin = empEntries
    .filter((e) => e.compute_type === 'cuota')
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const puntualMin = empEntries
    .filter((e) => e.compute_type === 'puntual')
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  // 1. FICHA DEL PROFESIONAL
  const cardY = 33;
  const cardH = 22;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, cardY, contentWidth, cardH, 2, 2, 'FD');

  // Franja lateral ciruela
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14, cardY, 3, cardH, 1, 1, 'F');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('PERFIL PROFESIONAL DEL TRABAJADOR', 20, cardY + 5);

  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', 20, cardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.full_name, 38, cardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 20, cardY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.email, 38, cardY + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Departamento:', 106, cardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.department || 'Creatividad & Operaciones', 132, cardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Rol en Agencia:', 106, cardY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.role === 'coordinator' ? 'Coordinador (Supervisión)' : 'Trabajador', 132, cardY + 17);

  // 2. MÉTRICAS DE HORAS
  const kpiY = cardY + cardH + 4;
  const kpiW = (contentWidth - 6) / 3;
  const kpiH = 15;

  // Total
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14, kpiY, 3, kpiH, 1, 1, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TOTAL HORAS REGISTRADAS', 20, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalMin), 20, kpiY + 11.5);

  // Cuotas
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + kpiW + 3, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.roundedRect(14 + kpiW + 3, kpiY, 3, kpiH, 1, 1, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('DEDICACIÓN A CUOTAS', 14 + kpiW + 9, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(cuotaMin), 14 + kpiW + 9, kpiY + 11.5);

  // Puntual
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + (kpiW + 3) * 2, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFillColor(...BRAND_PURPLE);
  doc.roundedRect(14 + (kpiW + 3) * 2, kpiY, 3, kpiH, 1, 1, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TRABAJOS PUNTUALES', 14 + (kpiW + 3) * 2 + 9, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(puntualMin), 14 + (kpiW + 3) * 2 + 9, kpiY + 11.5);

  // 3. TABLA DE TAREAS
  const tableStartY = kpiY + kpiH + 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(`ACTIVIDADES REALIZADAS (${empEntries.length} tareas)`, 14, tableStartY);

  const tableRows = empEntries.map((entry, idx) => [
    (idx + 1).toString(),
    entry.work_date,
    entry.company?.name || 'General',
    entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual',
    entry.description || 'Sin notas descriptivas',
    formatMinutes(entry.duration_minutes),
  ]);

  autoTable(doc, {
    startY: tableStartY + 3,
    head: [['#', 'Fecha', 'Empresa / Cliente', 'Tipo', 'Descripción de la Tarea', 'Duración']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 24, fontStyle: 'bold' },
      4: { cellWidth: 66 },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  drawCorporateFooter(doc, pageWidth, pageHeight);

  const filename = `BUG_Clockify_Informe_${employee.full_name}_${monthName}_${year}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

/**
 * =========================================================================
 * 4. PLANTILLAS EXCEL CON SENTIDO HUMANO
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
    'Descripción de la Tarea': e.description || 'Sin notas',
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
    'Descripción de la Tarea': e.description || 'Sin descripción',
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
    'Descripción de la Tarea': e.description || 'Sin notas',
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
    'Descripción': entry.description || 'Sin descripción',
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
  const logoBase64 = await getLogoBase64();

  drawCorporateHeader(
    doc,
    'Informe de Control Horario',
    `Período: ${filters.monthName} ${filters.year} | Filtro: ${filters.companyName || 'Todas'}`,
    logoBase64,
    210
  );

  const tableRows = entries.map((entry, index) => [
    (index + 1).toString(),
    entry.work_date,
    entry.profile?.full_name || 'N/A',
    entry.company?.name || 'N/A',
    entry.compute_type === 'cuota' ? 'Cuota' : 'Puntual',
    entry.description || 'Sin notas',
    formatMinutes(entry.duration_minutes),
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Fecha', 'Empleado', 'Empresa / Cliente', 'Tipo', 'Descripción', 'Duración']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [...BRAND_LILAC_BG],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
      4: { cellWidth: 22, fontStyle: 'bold' },
      5: { cellWidth: 42 },
      6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
  });

  drawCorporateFooter(doc, 210, 297);

  const fileName = `BUG_Clockify_Informe_${filters.monthName}_${filters.year}.pdf`.replace(/\s+/g, '_');
  doc.save(fileName);
}
