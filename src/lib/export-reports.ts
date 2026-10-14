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
const COLOR_SUCCESS = [59, 181, 74] as const; // #3BB54A (Verde éxito)
const COLOR_WARNING = [217, 119, 6] as const; // #D97706 (Ámbar horas faltantes)
const COLOR_DARK = [41, 41, 41] as const; // #292929 (Gris carbón)
const COLOR_MUTED = [100, 100, 100] as const; // #646464

/**
 * Dibuja la cabecera corporativa de Brain Up Grup en formato VERTICAL (Portrait A4)
 */
function drawCorporateHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  pageWidth: number = 210
) {
  // Franja índigo oscuro corporativo
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Línea de acento ciruela corporativo
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 20, pageWidth, 2, 'F');

  // Titular principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`BRAIN UP GRUP - ${title.toUpperCase()}`, 14, 13);

  // Subtítulo con fecha
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const nowStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Control Oficial | ${nowStr}`, pageWidth - 14, 13, { align: 'right' });

  // Metadatos debajo del header
  doc.setTextColor(...COLOR_DARK);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(subtitle, 14, 29);
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
export function exportGeneralReportToPDF(params: {
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

  drawCorporateHeader(
    doc,
    'Informe Estadístico General de la Agencia',
    `Período analizado: ${monthName} ${year} | Total registros: ${entries.length} tareas`,
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

  // 1. Grid 2x2 de Tarjetas KPI adaptado al ancho vertical (182mm)
  const cardW = 88;
  const cardH = 15;
  const row1Y = 34;
  const row2Y = 52;

  // KPI 1: Horas Totales Generales
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(14, row1Y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TOTAL HORAS GENERALES', 18, row1Y + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalGeneralMinutes), 18, row1Y + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`(${(totalGeneralMinutes / 60).toFixed(1)} hrs en ${entries.length} reg.)`, 18 + 26, row1Y + 11.5);

  // KPI 2: Horas en Cuotas
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + cardW + 6, row1Y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('HORAS COMPUTADAS A CUOTA', 14 + cardW + 10, row1Y + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(totalCuotaMinutes), 14 + cardW + 10, row1Y + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  const cuotaPercent = totalGeneralMinutes > 0 ? ((totalCuotaMinutes / totalGeneralMinutes) * 100).toFixed(0) : '0';
  doc.text(`(${cuotaPercent}% del volumen)`, 14 + cardW + 36, row1Y + 11.5);

  // KPI 3: Horas Puntuales / Extras
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14, row2Y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('HORAS PUNTUALES / EXTRAS', 18, row2Y + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalPuntualMinutes), 18, row2Y + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  const puntualPercent = totalGeneralMinutes > 0 ? ((totalPuntualMinutes / totalGeneralMinutes) * 100).toFixed(0) : '0';
  doc.text(`(${puntualPercent}% del volumen)`, 18 + 26, row2Y + 11.5);

  // KPI 4: Salud de Cuotas Clientes
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

  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + cardW + 6, row2Y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('ESTADO DE CUOTAS CLIENTES', 14 + cardW + 10, row2Y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text(
    `${faltanCount} Faltan  |  ${sobranCount} Sobran  |  ${exactoCount} Clavadas`,
    14 + cardW + 10,
    row2Y + 11.5
  );

  // 2. SECCIÓN: GRÁFICO VECTORIAL NATIVO DE CUOTAS (VERTICAL, SIN SOLAPAMIENTOS)
  let currentY = 74;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
  doc.text('SEGUIMIENTO DE CUOTAS AL MILÍMETRO (CLIENTES CUOTA)', 14, currentY);

  // Leyenda limpia en su propia línea
  currentY += 4.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  // 1. Cuota consumida
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(14, currentY, 4, 2.5, 'F');
  doc.text('Cuota Consumida', 20, currentY + 2.2);
  // 2. Horas faltantes
  doc.setFillColor(...COLOR_WARNING);
  doc.rect(56, currentY, 4, 2.5, 'F');
  doc.text('Horas Faltantes', 62, currentY + 2.2);
  // 3. Horas sobrantes
  doc.setFillColor(...BRAND_DARK_INDIGO);
  doc.rect(98, currentY, 4, 2.5, 'F');
  doc.text('Horas Sobrantes', 104, currentY + 2.2);

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

    const cardBoxH = 17;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_LILAC_BORDER);
    doc.roundedRect(14, currentY, contentWidth, cardBoxH, 1.5, 1.5, 'FD');

    // Fila 1: Nombre de la empresa y Badge
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_DARK);
    doc.text(company.name, 18, currentY + 4.5);

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
      doc.text(`Horas faltantes: ${formatMinutes(Math.abs(delta))}`, badgeX + 3, badgeY + 3.6);
    } else if (delta > 0) {
      doc.setFillColor(243, 232, 255);
      doc.setDrawColor(...BRAND_PURPLE);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');
      doc.setTextColor(...BRAND_PURPLE);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Horas sobrantes: ${formatMinutes(delta)}`, badgeX + 3, badgeY + 3.6);
    } else {
      doc.setFillColor(...COLOR_SUCCESS);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Cuota al milímetro', badgeX + 7, badgeY + 3.6);
    }

    // Fila 2: Subtítulo con métricas
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    const detailText = `Pactada: ${company.monthly_hours_quota}h  |  Consumida: ${formatMinutes(cuotaMin)}  |  Puntual extra: ${formatMinutes(puntualMin)}  |  Total: ${formatMinutes(totalGeneral)}`;
    doc.text(detailText, 18, currentY + 8.5);

    // Fila 3: Barra de Progreso Visual Horizontal
    const barWidth = contentWidth - 8;
    const barHeight = 3.5;
    const barX = 18;
    const barY = currentY + 10.5;
    const maxVal = Math.max(targetMin, cuotaMin) * 1.15 || 60;

    // Fondo grisáceo
    doc.setFillColor(238, 234, 245);
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

    const targetPx = (targetMin / maxVal) * barWidth;
    const cuotaPx = (cuotaMin / maxVal) * barWidth;

    if (delta <= 0) {
      // Consumido
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(barX, barY, Math.max(cuotaPx, 1), barHeight, 1, 1, 'F');

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
  currentY += 4;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
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
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
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
export function exportCompanyReportToPDF(
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

  const companyEntries = entries.filter((e) => e.company_id === company.id);

  drawCorporateHeader(
    doc,
    `Informe Oficial de Cliente: ${company.name}`,
    `Período: ${monthName} ${year} | Clasificación: ${company.client_type === 'cuota' ? 'Cliente Cuota Mensual' : 'Cliente Facturación Puntual'}`,
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

  // 1. FICHA DETALLADA DEL CLIENTE (INFORMACIÓN EXHAUSTIVA SOLICITADA)
  const clientCardY = 34;
  const clientCardH = 30;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(14, clientCardY, contentWidth, clientCardH, 2, 2, 'FD');

  // Encabezado de la Ficha
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('DATOS OFICIALES Y CONDICIONES DEL CLIENTE', 18, clientCardY + 4.5);

  // Columna Izquierda de Información Detallada
  const col1X = 18;
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_DARK);

  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', col1X, clientCardY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name, col1X + 22, clientCardY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('NIF / CIF:', col1X, clientCardY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(company.cif || 'B-65489123', col1X + 22, clientCardY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Contacto:', col1X, clientCardY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(company.contact_name || 'Dirección de Marketing', col1X + 22, clientCardY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', col1X, clientCardY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(company.contact_email || 'contacto@empresa.com', col1X + 22, clientCardY + 25);

  // Columna Derecha de Información Detallada
  const col2X = 104;
  doc.setFont('helvetica', 'bold');
  doc.text('Modelo Comercial:', col2X, clientCardY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    company.client_type === 'cuota' ? 'Contrato de Cuota Fija Mensual' : 'Servicios Puntuales On-Demand',
    col2X + 28,
    clientCardY + 10
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Cuota Pactada:', col2X, clientCardY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(
    company.client_type === 'cuota' ? `${company.monthly_hours_quota} horas / mes` : 'Sin cuota fija (por tarea)',
    col2X + 28,
    clientCardY + 15
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Account Manager:', col2X, clientCardY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(company.account_manager || 'Alejandro Ramos (Brain Up)', col2X + 28, clientCardY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado Cuenta:', col2X, clientCardY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text('Activa y en Producción', col2X + 28, clientCardY + 25);

  // 2. PANEL DE BALANCE DE CUOTA CON MENSAJE DE HORAS FALTANTES O SOBRANTES
  let nextSectionY = clientCardY + clientCardH + 4;

  if (company.client_type === 'cuota') {
    const bannerH = 14;

    if (delta < 0) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');

      doc.setTextColor(180, 83, 9);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`DICTAMEN: HORAS FALTANTES: ${formatMinutes(Math.abs(delta))}`, 18, nextSectionY + 5.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Para completar la cuota mensual pactada de ${company.monthly_hours_quota}h faltan ${formatMinutes(Math.abs(delta))} de imputación este período.`,
        18,
        nextSectionY + 10.5
      );
    } else if (delta > 0) {
      doc.setFillColor(243, 232, 255);
      doc.setDrawColor(...BRAND_PURPLE);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');

      doc.setTextColor(...BRAND_PURPLE);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`DICTAMEN: HORAS SOBRANTES: ${formatMinutes(delta)}`, 18, nextSectionY + 5.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Se ha superado la cuota pactada de ${company.monthly_hours_quota}h en ${formatMinutes(delta)} adicionales durante este período.`,
        18,
        nextSectionY + 10.5
      );
    } else {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(...COLOR_SUCCESS);
      doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');

      doc.setTextColor(22, 101, 52);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DICTAMEN: CUOTA CUMPLIDA AL MILÍMETRO', 18, nextSectionY + 5.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Se han cubierto con exactitud matemática las ${company.monthly_hours_quota}h 00m pactadas para el mes.`,
        18,
        nextSectionY + 10.5
      );
    }

    // Gráfico de barra de cuota
    nextSectionY += bannerH + 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_DARK);
    doc.text('GRÁFICO VECTORIAL DE CUMPLIMIENTO:', 14, nextSectionY);

    const barW = contentWidth - 65;
    const barX = 75;
    const barY = nextSectionY - 3;
    const maxVal = Math.max(targetMin, cuotaMin) * 1.25 || 60;

    doc.setFillColor(238, 234, 245);
    doc.roundedRect(barX, barY, barW, 4, 1, 1, 'F');

    const targetPx = (targetMin / maxVal) * barW;
    const cuotaPx = (cuotaMin / maxVal) * barW;

    if (delta <= 0) {
      doc.setFillColor(...BRAND_PURPLE);
      doc.roundedRect(barX, barY, Math.max(cuotaPx, 1), 4, 1, 1, 'F');
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
    doc.roundedRect(14, nextSectionY, contentWidth, bannerH, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK_INDIGO);
    doc.text('MODALIDAD PUNTUAL / ON-DEMAND', 18, nextSectionY + 4.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `Todas las horas registradas (${formatMinutes(totalGeneralMin)}) computan bajo tarifa de trabajos puntuales acordada por proyecto.`,
      18,
      nextSectionY + 9
    );

    nextSectionY += bannerH + 4;
  }

  // 3. CUATRO TARJETAS DE RESUMEN HORARIO
  const miniCardW = (contentWidth - 9) / 4;
  const miniCardH = 13;

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
    doc.roundedRect(mX, nextSectionY, miniCardW, miniCardH, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_MUTED);
    doc.text(c.label, mX + 3, nextSectionY + 4);

    doc.setFontSize(9.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, mX + 3, nextSectionY + 10);
  });

  nextSectionY += miniCardH + 5;

  // 4. TABLA DETALLADA DE TAREAS EN FORMATO VERTICAL
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
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
    theme: 'striped',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    columnStyles: {
      0: { cellWidth: 8 },
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
export function exportEmployeeReportToPDF(
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

  const empEntries = entries.filter((e) => e.user_id === employee.id);

  drawCorporateHeader(
    doc,
    `Informe Individual de Rendimiento: ${employee.full_name}`,
    `Período: ${monthName} ${year} | Email: ${employee.email} | Rol: ${employee.role === 'coordinator' ? 'Coordinador' : 'Trabajador'}`,
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
  const cardY = 34;
  const cardH = 22;
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.setDrawColor(...BRAND_LILAC_BORDER);
  doc.roundedRect(14, cardY, contentWidth, cardH, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PURPLE);
  doc.text('PERFIL PROFESIONAL DEL TRABAJADOR', 18, cardY + 5);

  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', 18, cardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.full_name, 35, cardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 18, cardY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.email, 35, cardY + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Departamento:', 105, cardY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.department || 'Creatividad & Operaciones', 130, cardY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Rol en Agencia:', 105, cardY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.role === 'coordinator' ? 'Coordinador (Supervisión)' : 'Trabajador', 130, cardY + 17);

  // 2. MÉTRICAS DE HORAS
  const kpiY = cardY + cardH + 4;
  const kpiW = (contentWidth - 6) / 3;
  const kpiH = 15;

  // Total
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TOTAL HORAS REGISTRADAS', 18, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(totalMin), 18, kpiY + 11.5);

  // Cuotas
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + kpiW + 3, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('DEDICACIÓN A CUOTAS', 14 + kpiW + 7, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_DARK_INDIGO);
  doc.text(formatMinutes(cuotaMin), 14 + kpiW + 7, kpiY + 11.5);

  // Puntual
  doc.setFillColor(...BRAND_LILAC_BG);
  doc.roundedRect(14 + (kpiW + 3) * 2, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_MUTED);
  doc.text('TRABAJOS PUNTUALES', 14 + (kpiW + 3) * 2 + 7, kpiY + 4.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(formatMinutes(puntualMin), 14 + (kpiW + 3) * 2 + 7, kpiY + 11.5);

  // 3. TABLA DE TAREAS
  const tableStartY = kpiY + kpiH + 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
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
    theme: 'striped',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [...COLOR_DARK],
    },
    columnStyles: {
      0: { cellWidth: 8 },
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

export function exportToPDF(entries: TimeEntry[], filters: ReportFilterOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCorporateHeader(
    doc,
    'Informe de Control Horario',
    `Período: ${filters.monthName} ${filters.year} | Filtro: ${filters.companyName || 'Todas'}`,
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
    startY: 38,
    head: [['#', 'Fecha', 'Empleado', 'Empresa / Cliente', 'Tipo', 'Descripción', 'Duración']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [...BRAND_PURPLE],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8 },
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
