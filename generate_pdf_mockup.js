const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logoPath = path.join(__dirname, 'public', 'logo.png');
let logoBase64 = '';
try {
  const logoBuffer = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
} catch (e) {
  console.warn('Could not read logo:', e);
}

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Propuesta de Rediseño de Usabilidad - Horas por Cliente | Brain Up Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      font-family: 'Montserrat', sans-serif;
      color: #292929;
      background: #FFFFFF;
      line-height: 1.4;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm 12mm;
      background: #FFFFFF;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* Franja corporativa superior */
    .top-accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #191654 0%, #8E0E75 60%, #D8CFF0 100%);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    /* Colores corporativos */
    .text-lila { color: #8E0E75; }
    .bg-lila { background-color: #8E0E75; }
    .border-lila { border-color: #8E0E75; }
    .bg-lila-light { background-color: #F8F6FC; }
    .border-lila-pastel { border-color: #D8CFF0; }
    .text-indigo { color: #191654; }

    /* Semánticos */
    .text-green { color: #10B981; }
    .bg-green-light { background-color: #ECFDF5; }
    .border-green { border-color: #A7F3D0; }

    .text-amber { color: #D97706; }
    .bg-amber-light { background-color: #FFFBEB; }
    .border-amber { border-color: #FCD34D; }

    .text-red { color: #DC2626; }
    .bg-red-light { background-color: #FEF2F2; }
    .border-red { border-color: #FCA5A5; }

    .mono { font-family: 'JetBrains Mono', monospace; }

    /* Componentes visuales de la maqueta */
    .mock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #EAE4F5;
      margin-bottom: 10px;
    }
    .mock-title {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mock-subtitle {
      font-size: 10px;
      color: #666;
      font-weight: 400;
      margin-top: 2px;
    }
    .badge-supervision {
      padding: 4px 10px;
      background: #F8F6FC;
      border: 1px solid #D8CFF0;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8E0E75;
    }

    /* BLOQUE EMPRESA MUCHO MÁS GRANDE (ÚNICO LUGAR DE SELECCIÓN) */
    .company-hero-banner {
      background: linear-gradient(135deg, #FAF8FD 0%, #FFFFFF 100%);
      border: 2px solid #8E0E75;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 10px;
      box-shadow: 0 2px 6px rgba(142, 14, 117, 0.08);
      position: relative;
    }
    .company-hero-badge {
      position: absolute;
      top: -8px;
      left: 16px;
      background: #8E0E75;
      color: white;
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 1px 8px;
      border-radius: 2px;
      letter-spacing: 0.8px;
    }
    .company-hero-name {
      font-size: 23px;
      font-weight: 900;
      color: #191654;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      line-height: 1.1;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .company-hero-quota-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      border-radius: 3px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .client-select-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      border: 1.5px solid #8E0E75;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(142, 14, 117, 0.1);
    }

    /* CONTROL DE HORAS BAR (SIN SELECTOR DUPLICADO) */
    .control-box {
      border: 1px solid #D8CFF0;
      border-radius: 4px;
      background: #FFFFFF;
      padding: 11px 13px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 7px;
      margin-bottom: 8px;
      border-bottom: 1px solid #EAE4F5;
    }
    .control-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #292929;
    }
    .mode-pills {
      display: flex;
      background: #F8F6FC;
      padding: 2px;
      border-radius: 3px;
      border: 1px solid #D8CFF0;
    }
    .mode-pill {
      padding: 4px 10px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      border-radius: 2px;
    }
    .mode-pill.active {
      background: #8E0E75;
      color: white;
    }
    .mode-pill.inactive {
      color: #666;
    }

    /* GRID LIMPIO Y ANCHO: INPUT TEXTO + CRONÓMETRO + BOTÓN */
    .tracker-input-row {
      display: grid;
      grid-template-columns: 1fr 140px 145px;
      gap: 10px;
      align-items: center;
    }
    .mock-input {
      border: 1.5px solid #D8CFF0;
      padding: 9px 12px;
      border-radius: 4px;
      font-size: 11.5px;
      color: #333;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mock-timer {
      background: #F8F6FC;
      border: 1px solid #D8CFF0;
      border-radius: 4px;
      padding: 7px;
      text-align: center;
      font-size: 17px;
      font-weight: 800;
      color: #292929;
      letter-spacing: 0.5px;
    }
    .btn-green-start {
      background: #10B981;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3);
      cursor: pointer;
    }
    .btn-red-stop {
      background: #DC2626;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(220, 38, 38, 0.3);
    }

    /* SECCIONES HORIZONTALES */
    .section-headline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .section-tag {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #191654;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 11px;
    }
    .kpi-card {
      border: 1px solid #D8CFF0;
      border-radius: 4px;
      padding: 10px 12px;
      background: #FFFFFF;
      position: relative;
      overflow: hidden;
    }
    .kpi-card.highlight {
      border-color: #8E0E75;
      background: #FCFBFD;
    }
    .kpi-stripe {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
    }
    .kpi-stripe.lila { background: #8E0E75; }
    .kpi-stripe.indigo { background: #191654; }
    .kpi-stripe.green { background: #10B981; }
    .kpi-stripe.amber { background: #F59E0B; }
    .kpi-stripe.red { background: #DC2626; }

    .kpi-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 900;
      color: #292929;
      line-height: 1.1;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #666;
      font-weight: 500;
    }
    .kpi-detail {
      font-size: 9px;
      color: #777;
      margin-top: 4px;
      font-weight: 500;
    }
    .mini-progress-track {
      height: 5px;
      background: #F1EDF8;
      border-radius: 3px;
      margin-top: 6px;
      overflow: hidden;
    }
    .mini-progress-fill {
      height: 100%;
      border-radius: 3px;
    }

    /* Header del documento */
    .doc-cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid #8E0E75;
      margin-bottom: 12px;
    }
    .doc-brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #191654;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .doc-brand-sub {
      font-size: 10px;
      color: #8E0E75;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .callout-box {
      background: #F8F6FC;
      border-left: 3px solid #8E0E75;
      padding: 8px 12px;
      border-radius: 0 3px 3px 0;
      margin-bottom: 11px;
      font-size: 9.5px;
      color: #4A4A4A;
      line-height: 1.45;
    }
    .callout-title {
      font-weight: 800;
      color: #8E0E75;
      text-transform: uppercase;
      font-size: 9.5px;
      margin-bottom: 3px;
    }

    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin: 10px 0;
    }
    .comp-table th {
      background: #F8F6FC;
      color: #191654;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 10px;
      text-align: left;
      border: 1px solid #D8CFF0;
    }
    .comp-table td {
      padding: 6px 10px;
      border: 1px solid #EAE4F5;
      vertical-align: top;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: PRESENTACIÓN Y MAQUETA VISUAL ALTA DEFINICIÓN -->
  <div class="page">
    <div class="top-accent-bar"></div>

    <!-- CABECERA DEL INFORME DE DISEÑO -->
    <div class="doc-cover-header">
      <div>
        <div class="doc-brand-title">BRAIN UP GRUP <span style="color:#8E0E75">CLOCKIFY</span></div>
        <div class="doc-brand-sub">Propuesta Ejecutiva de Rediseño de Usabilidad • Revisión v3.1</div>
        <div style="font-size: 9px; color: #777; margin-top: 2px;">Documento Técnico para Aprobación previa a la integración en código</div>
      </div>
      ${logoBase64 ? `<img src="${logoBase64}" style="height: 44px; width: 44px; object-fit: contain; border-radius: 50%; border: 1px solid #D8CFF0; padding: 2px;" alt="Brain Up Logo" />` : ''}
    </div>

    <!-- RESUMEN DE CAMBIOS SOLICITADOS -->
    <div class="callout-box">
      <div class="callout-title">Ajustes de Usabilidad Solicitados (Revisión v3.1):</div>
      1. <strong>Título de la Vista:</strong> Se sustituye "MI REGISTRO HORARIO" por <strong>"HORAS POR CLIENTE"</strong>.<br>
      2. <strong>Empresa Prominente Superior:</strong> Nombre de la empresa en tamaño <strong>MUCHO MÁS GRANDE (23px)</strong> con selector único arriba de "Control de horas".<br>
      3. <strong>Eliminación del Selector Duplicado:</strong> Se eliminó el menú desplegable que estaba en la barra de imputación. El campo de texto ahora dispone de todo el ancho.<br>
      4. <strong>Código de Color Semántico en Botón:</strong> <span style="color:#059669; font-weight:800;">VERDE</span> para <strong>▶ INICIAR</strong> y <span style="color:#DC2626; font-weight:800;">ROJO</span> para <strong>⏹ PARAR</strong>.<br>
      5. <strong>Doble Plano Horizontal:</strong> Fila 1 (Horas Generales de Jornada) y Fila 2 (Horas en la Empresa Seleccionada).
    </div>

    <!-- MAQUETA SIMULADA (PIXEL-PERFECT) DE LA NUEVA PANTALLA -->
    <div style="border: 2px dashed #8E0E75; border-radius: 6px; padding: 12px; background: #FFFFFF; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
      
      <!-- 1. Cabecera con nuevo título "HORAS POR CLIENTE" -->
      <div class="mock-header">
        <div>
          <div class="mock-title">
            <span style="display:inline-block; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #8E0E75; text-align: center; line-height: 14px; font-size: 11px; color:#8E0E75; font-weight:900;">⏱</span>
            <span>HORAS POR <span style="color:#8E0E75">CLIENTE</span></span>
          </div>
          <div class="mock-subtitle">Control de jornada y tiempo imputado directamente por cliente y cuota pactada</div>
        </div>
        <div class="badge-supervision">🛡 Supervisión de Agencia</div>
      </div>

      <!-- 2. NUEVO BLOQUE DE EMPRESA MUCHO MÁS GRANDE (ENCIMA DEL CONTROL DE HORAS - ÚNICO SELECTOR) -->
      <div class="company-hero-banner">
        <div class="company-hero-badge">Cliente en Curso de Trabajo (Activo)</div>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div>
            <div class="company-hero-name">
              <span style="background:#8E0E75; color:white; font-size:12px; padding:4px 8px; border-radius:3px;">🏢</span>
              <span>Acme Marketing Agency</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <span class="company-hero-quota-pill">✓ Cuota Mensual: 15h Pactadas</span>
              <span style="font-size: 9px; color:#666; font-family:'JetBrains Mono', monospace;">CIF: B-65489123 • Responsable: Alejandro Ramos</span>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
            <span style="font-size: 8px; font-weight: 800; color:#8E0E75; text-transform:uppercase; letter-spacing:0.5px;">Cambiar Cliente Activo:</span>
            <div class="client-select-box">
              <span style="font-size: 10px; font-weight: 800; color: #191654;">🏢 Acme Marketing Agency (15h)</span>
              <span style="color: #8E0E75; font-size: 9px; font-weight: 900;">▼</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. BARRA DE CONTROL DE HORAS (LIMPIA: SIN SELECTOR DUPLICADO + BOTÓN VERDE/ROJO) -->
      <div class="control-box">
        <div class="control-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="control-title">CONTROL <span style="color:#8E0E75">DE HORAS</span></span>
            <span style="background:#8E0E75; color:white; font-size:8px; font-weight:800; padding:2px 6px; border-radius:2px; text-transform:uppercase;">Horas Cuota (15h)</span>
            <span style="background:#F8F6FC; border:1px solid #D8CFF0; color:#4A4A4A; font-size:8px; font-weight:700; padding:2px 6px; border-radius:2px; text-transform:uppercase;">Trabajo Puntual / Extra</span>
          </div>
          <div class="mode-pills">
            <div class="mode-pill active">⏱ Temporizador</div>
            <div class="mode-pill inactive">📅 Entrada Manual</div>
          </div>
        </div>

        <!-- Fila con input ancho (sin selector duplicado) + contador + botón verde -->
        <div class="tracker-input-row">
          <div class="mock-input">
            <span style="color: #8E0E75; font-size: 12px;">✍️</span>
            <span>¿En qué estás trabajando para <strong style="color: #191654;">Acme Marketing Agency</strong>?</span>
          </div>
          <div class="mock-timer mono">00:00:00</div>
          <div class="btn-green-start">▶ INICIAR</div>
        </div>

        <!-- Leyenda interactiva que demuestra ambos estados del botón -->
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #EAE4F5; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
          <span style="color: #666; font-weight: 700; text-transform: uppercase;">Estados Semánticos del Botón:</span>
          <div style="display: flex; gap: 14px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #065F46; font-weight: 700;">Al iniciar / parado:</span>
              <span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 900; font-size: 8px; letter-spacing: 0.3px;">▶ INICIAR (VERDE)</span>
            </div>
            <span style="color: #D8CFF0;">|</span>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #991B1B; font-weight: 700;">Al estar cronometrando:</span>
              <span style="background: #DC2626; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 900; font-size: 8px; letter-spacing: 0.3px;">⏹ PARAR (ROJO)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. PLANO HORIZONTAL 1: HORAS DE TRABAJO GENERALES -->
      <div class="section-headline">
        <div class="section-tag">
          <span style="color:#8E0E75; font-size:12px;">●</span>
          <span>PLANO HORIZONTAL 1: HORAS DE TRABAJO GENERALES (JORNADA GLOBAL)</span>
        </div>
        <span style="font-size: 8.5px; color:#777; text-transform:uppercase; font-weight:700;">Suma de todos los clientes</span>
      </div>

      <div class="cards-row">
        <!-- Card 1.1: Horas Trabajadas Hoy -->
        <div class="kpi-card">
          <div class="kpi-stripe amber"></div>
          <div class="kpi-label">
            <span>HORAS TRABAJADAS HOY</span>
            <span>☀️</span>
          </div>
          <div class="kpi-value">
            <span>4h 15m</span>
            <span class="kpi-sub">/ 8h diaria</span>
          </div>
          <div class="mini-progress-track">
            <div class="mini-progress-fill" style="width: 53%; background: #F59E0B;"></div>
          </div>
          <div class="kpi-detail">
            Jornada actual: <strong style="color:#D97706;">53% completado</strong> hoy
          </div>
        </div>

        <!-- Card 1.2: Horas Trabajo Semanal -->
        <div class="kpi-card">
          <div class="kpi-stripe indigo"></div>
          <div class="kpi-label">
            <span>HORAS DE TRABAJO SEMANAL</span>
            <span>📈</span>
          </div>
          <div class="kpi-value">
            <span>24h 30m</span>
            <span class="kpi-sub">Lunes - Domingo</span>
          </div>
          <div class="mini-progress-track">
            <div class="mini-progress-fill" style="width: 61%; background: #191654;"></div>
          </div>
          <div class="kpi-detail">
            Acumulado: <strong>24.5 horas</strong> registradas en Semana 42
          </div>
        </div>

        <!-- Card 1.3: Horas Trabajo Mensual -->
        <div class="kpi-card">
          <div class="kpi-stripe lila"></div>
          <div class="kpi-label">
            <span>HORAS DE TRABAJO MENSUAL</span>
            <span>📅</span>
          </div>
          <div class="kpi-value">
            <span>98h 45m</span>
            <span class="kpi-sub">Octubre 2026</span>
          </div>
          <div class="mini-progress-track">
            <div class="mini-progress-fill" style="width: 75%; background: #8E0E75;"></div>
          </div>
          <div class="kpi-detail">
            Total computable: <strong>98.75 horas</strong> en el mes activo
          </div>
        </div>
      </div>

      <!-- 5. PLANO HORIZONTAL 2: DEDICACIÓN SEGÚN EMPRESA SELECCIONADA -->
      <div class="section-headline">
        <div class="section-tag" style="color: #8E0E75;">
          <span>★</span>
          <span>PLANO HORIZONTAL 2: DEDICACIÓN EN "ACME MARKETING AGENCY" (EMPRESA SELECCIONADA)</span>
        </div>
        <span style="font-size: 8.5px; color:#8E0E75; text-transform:uppercase; font-weight:800; background:#F8F6FC; padding:1px 6px; border:1px solid #D8CFF0; border-radius:2px;">Reactivas al cambiar de empresa</span>
      </div>

      <div class="cards-row" style="margin-bottom: 0;">
        <!-- Card 2.1: Horas hoy en empresa -->
        <div class="kpi-card highlight">
          <div class="kpi-stripe lila"></div>
          <div class="kpi-label">
            <span>HORAS HOY EN ACME</span>
            <span style="color:#8E0E75;">🏢</span>
          </div>
          <div class="kpi-value" style="color:#8E0E75;">
            <span>2h 15m</span>
            <span class="kpi-sub">imputadas hoy</span>
          </div>
          <div class="kpi-detail">
            Representa el <strong>53% del tiempo</strong> trabajado hoy
          </div>
        </div>

        <!-- Card 2.2: Horas semana en empresa -->
        <div class="kpi-card highlight">
          <div class="kpi-stripe indigo"></div>
          <div class="kpi-label">
            <span>HORAS SEMANA EN ACME</span>
            <span>📊</span>
          </div>
          <div class="kpi-value" style="color:#191654;">
            <span>7h 30m</span>
            <span class="kpi-sub">esta semana</span>
          </div>
          <div class="kpi-detail">
            Dedicación constante: <strong>31% del total semanal</strong>
          </div>
        </div>

        <!-- Card 2.3: Horas mes en empresa -->
        <div class="kpi-card highlight">
          <div class="kpi-stripe green"></div>
          <div class="kpi-label">
            <span>HORAS MES EN ACME</span>
            <span style="color:#10B981;">✓</span>
          </div>
          <div class="kpi-value" style="color:#065F46;">
            <span>14h 45m</span>
            <span class="kpi-sub">/ 15h cuota</span>
          </div>
          <div class="mini-progress-track">
            <div class="mini-progress-fill" style="width: 98%; background: #10B981;"></div>
          </div>
          <div class="kpi-detail" style="color:#065F46; font-weight:700;">
            Estado de Cuota: <strong>Faltan solo 15m (98% completada)</strong>
          </div>
        </div>
      </div>

    </div>

    <!-- PIE DE PÁGINA 1 -->
    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #EAE4F5; display: flex; justify-content: space-between; font-size: 8.5px; color: #888;">
      <span>Brain Up Grup • Sistema Clockify Hub • Propuesta de Diseño v3.1</span>
      <span>Página 1 de 2</span>
    </div>
  </div>

  <!-- PÁGINA 2: ESPECIFICACIONES TÉCNICAS Y COMPARATIVA -->
  <div class="page">
    <div class="top-accent-bar"></div>

    <div class="doc-cover-header">
      <div>
        <div class="doc-brand-title">ESPECIFICACIONES <span style="color:#8E0E75">DE USABILIDAD</span></div>
        <div class="doc-brand-sub">Detalle de Funcionamiento y Validación para Aprobación • Revisión v3.1</div>
      </div>
      <div style="font-size: 9px; font-weight: 800; color: #8E0E75; border: 1px solid #D8CFF0; padding: 4px 8px; border-radius: 3px; background: #F8F6FC;">
        MODALIDAD: TRABAJADOR / EMPLEADO
      </div>
    </div>

    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #191654; margin-bottom: 6px;">
      1. Comparativa Directa: Diseño Anterior vs Nuevo Diseño Actualizado
    </div>

    <table class="comp-table">
      <thead>
        <tr>
          <th style="width: 22%;">Elemento</th>
          <th style="width: 38%;">Diseño Anterior (Captura inicial)</th>
          <th style="width: 40%;">Nuevo Diseño (Revisión v3.1 Aprobada)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Título de la Vista</strong></td>
          <td style="color:#777;">"MI REGISTRO HORARIO"</td>
          <td style="color:#8E0E75; font-weight:700;">"HORAS POR CLIENTE" (Enfoque en cliente y facturación).</td>
        </tr>
        <tr>
          <td><strong>Nombre de Empresa Actual</strong></td>
          <td style="color:#777;">Oculto dentro de un desplegable pequeño (12px).</td>
          <td style="color:#191654; font-weight:700;">
            Banner destacado superior con tipografía gigante (23px), icono temático, badge de cuota e indicador visual directo. Imposible equivocarse de cliente.
          </td>
        </tr>
        <tr>
          <td><strong>Ubicación del Selector de Cliente</strong></td>
          <td style="color:#DC2626;">Duplicado dentro de la barra de imputación, reduciendo el espacio para escribir la descripción.</td>
          <td style="color:#10B981; font-weight:700;">
            <strong>Eliminado el selector duplicado:</strong> Se ubica exclusivamente en el encabezado superior. La caja de texto ahora es amplia y cómoda.
          </td>
        </tr>
        <tr>
          <td><strong>Botón de Acción (Iniciar / Parar)</strong></td>
          <td style="color:#777;">Color morado oscuro estático para ambas acciones.</td>
          <td style="color:#10B981; font-weight:700;">
            <strong>Código semántico dinámico:</strong><br>
            • <span style="color:#10B981; font-weight:800;">VERDE (#10B981)</span> para <strong>▶ INICIAR</strong><br>
            • <span style="color:#DC2626; font-weight:800;">ROJO (#DC2626)</span> para <strong>⏹ PARAR</strong>
          </td>
        </tr>
        <tr>
          <td><strong>Métricas de Horas</strong></td>
          <td style="color:#777;">Una única fila horizontal mezclando horas globales sin desglose por empresa.</td>
          <td style="color:#191654; font-weight:700;">
            <strong>Doble Fila Horizontal Independiente:</strong><br>
            • Fila 1: Horas generales de trabajo (Hoy, Semana, Mes).<br>
            • Fila 2: Horas en la empresa seleccionada (Hoy, Semana, Mes).
          </td>
        </tr>
        <tr>
          <td><strong>Interactividad al cambiar de cliente</strong></td>
          <td style="color:#777;">Solo cambiaba el select del formulario.</td>
          <td style="color:#8E0E75; font-weight:700;">
            <strong>Reactivas al instante:</strong> Al cambiar de cliente en el selector superior, la Fila 2 se recalcula en 0ms para mostrar la dedicación específica en esa empresa.
          </td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #191654; margin-top: 12px; margin-bottom: 6px;">
      2. Lógica de los Dos Planos Horizontales de Horas
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <div style="border: 1px solid #D8CFF0; border-radius: 4px; padding: 10px; background: #FFFFFF;">
        <div style="font-size: 10.5px; font-weight: 800; color: #191654; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #EAE4F5; padding-bottom: 3px;">
          Fila 1: Plano General de Jornada
        </div>
        <p style="font-size: 9px; color: #555; line-height: 1.45;">
          • <strong>Propósito:</strong> Controlar el cumplimiento de la jornada laboral del trabajador (ej. 8 horas diarias de convenio o contrato).<br>
          • <strong>Cálculo:</strong> Suma todos los registros de tiempo de cualquier empresa en el día de hoy, en la semana en curso y en el mes.<br>
          • <strong>Código Semántico:</strong> Barra en rojo si &lt;40%, amarillo entre 40-99% y verde al llegar al 100% de la jornada diaria.
        </p>
      </div>

      <div style="border: 1px solid #8E0E75; border-radius: 4px; padding: 10px; background: #F8F6FC;">
        <div style="font-size: 10.5px; font-weight: 800; color: #8E0E75; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #D8CFF0; padding-bottom: 3px;">
          Fila 2: Plano por Empresa Seleccionada
        </div>
        <p style="font-size: 9px; color: #555; line-height: 1.45;">
          • <strong>Propósito:</strong> Saber con exactitud matemática cuántas horas le estamos dedicando al cliente específico con el que estamos trabajando.<br>
          • <strong>Día / Semana / Mes:</strong> Muestra el tiempo invertido en este cliente hoy, esta semana y este mes contra su cuota pactada.<br>
          • <strong>Prevención de Errores:</strong> Permite detectar de inmediato si nos estamos quedando cortos o pasando de la cuota pactada.
        </p>
      </div>
    </div>

    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #191654; margin-top: 12px; margin-bottom: 6px;">
      3. Hoja de Ruta de Implementación Técnica
    </div>

    <div class="callout-box" style="border-left-color: #10B981; background: #ECFDF5;">
      <div class="callout-title" style="color: #065F46;">Plan de ejecución tras aprobación:</div>
      <ol style="margin-left: 14px; font-size: 9.5px; color: #065F46; line-height: 1.5;">
        <li>Actualizar cabecera en <code>src/app/dashboard/employee/page.tsx</code> con <strong>HORAS POR CLIENTE</strong>.</li>
        <li>Elevar el selector de cliente al encabezado superior grande encima del bloque de control de horas.</li>
        <li>Limpiar la barra de imputación eliminando el selector duplicado, asignando todo el espacio a la descripción.</li>
        <li>Actualizar los estilos del botón: <strong>VERDE (#10B981)</strong> para Iniciar y <strong>ROJO (#DC2626)</strong> para Parar.</li>
        <li>Conectar las métricas horizontales dobles: Fila 1 (Global) y Fila 2 (Empresa seleccionada reactiva).</li>
        <li>Validación de compilación sin errores con <code>next build</code>.</li>
      </ol>
    </div>

    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #EAE4F5; display: flex; justify-content: space-between; font-size: 8.5px; color: #888;">
      <span>Brain Up Grup • Propuesta de Diseño v3.1 para Aprobación</span>
      <span>Página 2 de 2</span>
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'mockup_horas_por_cliente.html');
fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log('HTML written successfully to:', htmlFilePath);

// Generar PDF y Captura PNG usando Microsoft Edge Headless
const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
const pdfOutputPath = path.join(__dirname, 'Propuesta_Diseno_Horas_Por_Cliente.pdf');
const previewPngPath = path.join(__dirname, 'preview_mockup_horas_por_cliente.png');

try {
  console.log('Generating PDF via Edge headless...');
  const pdfCmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfOutputPath}" "${htmlFilePath}"`;
  execSync(pdfCmd);
  console.log('PDF generated at:', pdfOutputPath);

  console.log('Generating high-resolution screenshot preview...');
  const pngCmd = `"${edgePath}" --headless --disable-gpu --window-size=1280,1800 --screenshot="${previewPngPath}" "${htmlFilePath}"`;
  execSync(pngCmd);
  console.log('Preview image generated at:', previewPngPath);
} catch (err) {
  console.error('Error generating PDF or image:', err);
}
