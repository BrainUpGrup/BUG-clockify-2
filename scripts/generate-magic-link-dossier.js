const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Crear directorio public/docs si no existe
const docsDir = path.join(process.cwd(), 'public', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const pdfPath = path.join(docsDir, 'PORTAL_DE_TRANSPARENCIA_MAGIC_LINK.pdf');
const rootPdfPath = path.join(process.cwd(), 'PORTAL_DE_TRANSPARENCIA_MAGIC_LINK.pdf');

// Inicializar documento A4 vertical (210 x 297 mm)
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

// Colores Corporativos Brain Up ("La Abuela")
const C_PURPLE = [142, 14, 117];     // #8E0E75
const C_INDIGO = [25, 22, 84];       // #191654
const C_LILAC_BG = [248, 246, 252];  // #F8F6FC
const C_LILAC_BORDER = [216, 207, 240]; // #D8CFF0
const C_GREEN = [16, 185, 129];      // #10B981
const C_AMBER = [217, 119, 6];       // #D97706
const C_DARK = [31, 41, 55];         // #1F2937
const C_MUTED = [75, 85, 99];        // #4B5563
const C_WHITE = [255, 255, 255];

// Cargar logotipo de Brain Up si existe
let logoBase64 = null;
const logoPath = path.join(process.cwd(), 'public', 'logo.png');
if (fs.existsSync(logoPath)) {
  const buf = fs.readFileSync(logoPath);
  logoBase64 = 'data:image/png;base64,' + buf.toString('base64');
}

// Función auxiliar para pie de página y cabecera en páginas de contenido
function addPageHeaderFooter(doc, pageNum, totalPages, pageTitle) {
  // Franja superior de marca
  doc.setFillColor(...C_INDIGO);
  doc.rect(0, 0, 210, 4, 'F');
  doc.setFillColor(...C_PURPLE);
  doc.rect(140, 0, 70, 4, 'F');

  // Cabecera sutil
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C_PURPLE);
  doc.text('BRAIN UP GRUP - SUITE CORPORATIVA', 15, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C_MUTED);
  doc.text(pageTitle || 'Portal de Transparencia para Clientes (Magic Link)', 110, 12);

  doc.setDrawColor(...C_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.line(15, 14, 195, 14);

  // Pie de página
  doc.setDrawColor(...C_LILAC_BORDER);
  doc.setLineWidth(0.3);
  doc.line(15, 284, 195, 284);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_MUTED);
  doc.text('Brain Up Clockify & TaskFlow - Documento de Arquitectura y Negocio', 15, 289);
  doc.text(`Pagina ${pageNum} de ${totalPages}`, 175, 289);
}

// ==========================================
// PÁGINA 1: PORTADA EJECUTIVA
// ==========================================
// Fondo superior degradado simulación
doc.setFillColor(...C_INDIGO);
doc.rect(0, 0, 210, 95, 'F');
doc.setFillColor(...C_PURPLE);
doc.rect(0, 85, 210, 10, 'F');

// Logotipo
if (logoBase64) {
  try {
    doc.addImage(logoBase64, 'PNG', 15, 18, 55, 18);
  } catch (e) {
    console.warn('No se pudo incrustar imagen:', e);
  }
}

// Badge de la suite
doc.setFillColor(255, 255, 255);
doc.roundedRect(145, 20, 50, 7, 2, 2, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(...C_PURPLE);
doc.text('SUITE OPERATIVA 2026', 150, 25);

// Títulos de portada en blanco sobre fondo índigo
doc.setFont('helvetica', 'bold');
doc.setFontSize(22);
doc.setTextColor(...C_WHITE);
doc.text('PORTAL DE TRANSPARENCIA', 15, 52);
doc.text('PARA CLIENTES (MAGIC LINK)', 15, 62);

doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(216, 207, 240);
doc.text('Transformando el control horario de una agencia en confianza radical,', 15, 73);
doc.text('fidelizacion sin friccion y venta proactiva de cuotas.', 15, 79);

// Tarjeta Central: Resumen Ejecutivo
doc.setFillColor(...C_LILAC_BG);
doc.setDrawColor(...C_LILAC_BORDER);
doc.setLineWidth(0.5);
doc.roundedRect(15, 110, 180, 75, 4, 4, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...C_PURPLE);
doc.text('RESUMEN EJECUTIVO DE LA INNOVACION', 22, 122);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...C_DARK);
const introLines = [
  'El Portal de Transparencia mediante Magic Link resuelve el mayor foco de friccion entre',
  'una agencia creativa y sus clientes: la desconfianza o incomprension de las horas facturadas.',
  '',
  'En lugar de remitir frios informes en PDF o complejas hojas Excel a final de mes cuando ya no',
  'hay margen de reaccion, la agencia proporciona a cada cliente un enlace web unico, seguro y',
  'sin necesidad de contrasenas, donde este puede consultar en cualquier momento y en vivo:',
  '  1. El estado exacto de su bolsa mensual de horas (consumidas, disponibles y ritmo).',
  '  2. El muro de entregables tangibles completados (campanas, disenos, webs, publicaciones).',
  '  3. El desglose visual por areas de especialidad de la agencia.',
  '  4. Un canal directo para autorizar ampliaciones de horas antes de fin de mes.'
];
let textY = 129;
introLines.forEach(line => {
  doc.text(line, 22, textY);
  textY += 4.5;
});

// Ficha Técnica en la parte inferior de la portada
const metaY = 195;
doc.setFillColor(255, 255, 255);
doc.setDrawColor(...C_LILAC_BORDER);
doc.roundedRect(15, metaY, 180, 78, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...C_INDIGO);
doc.text('DATOS DE LA ESPECIFICACION TECNICA', 22, metaY + 10);

const metaDetails = [
  ['Plataforma:', 'Brain Up Clockify & TaskFlow (Suite Brain Up Grup)'],
  ['Modulo:', 'Client Portal & Public Magic Link Access (v1.0)'],
  ['Arquitectura:', 'Next.js 14 App Router, Supabase PostgreSQL, Edge Tokens HMAC'],
  ['Seguridad:', 'Aislamiento estricto por Empresa mediante Row Level Security (RLS)'],
  ['Acceso:', 'Zero-Login / Magic Link de solo lectura auditado'],
  ['Impacto Clave:', 'Erradicacion del "sindrome del dia 28" y venta proactiva de cuotas'],
  ['Fecha:', 'Noviembre 2026 - Documento Oficial de Ingenieria y Producto']
];

let rowY = metaY + 18;
metaDetails.forEach(([k, v]) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_PURPLE);
  doc.text(k, 22, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C_DARK);
  doc.text(v, 65, rowY);
  rowY += 8;
});

// ==========================================
// PÁGINA 2: DIAGNÓSTICO DEL DOLOR VS. LA SOLUCIÓN
// ==========================================
doc.addPage();
addPageHeaderFooter(doc, 2, 5, 'El Diagnostico del Dolor en Agencias');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...C_INDIGO);
doc.text('1. El Diagnostico: La Friccion Silenciosa de Fin de Mes', 15, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...C_DARK);
const p2Intro = [
  'En el modelo tradicional de las agencias de marketing y publicidad, la relacion horaria con el cliente',
  'esta marcada por una dinamica de opacidad involuntaria:',
  '',
  '• El cliente contrata una bolsa mensual (ej. 15 horas/mes) para diseno, redes, web o consultoria.',
  '• Durante 30 dias se producen decenas de llamadas, correos, adaptaciones graficas y cambios urgentes.',
  '• El dia 30, la agencia emite la factura. Con frecuencia se han gastado 24 horas en lugar de 15.',
  '• Resultado: O la agencia asume la perdida y regala 9 horas de trabajo, o le cobra las horas extra por sorpresa,',
  '  desencadenando una llamada tensa donde el cliente exige justificar cada minuto con recelo.'
];
let yP2 = 33;
p2Intro.forEach(line => {
  doc.text(line, 15, yP2);
  yP2 += 4.5;
});

// Tabla Comparativa de Modelos
doc.autoTable({
  startY: 75,
  margin: { left: 15, right: 15 },
  head: [['Criterio de Gestion', 'Modelo Tradicional de Agencia', 'Modelo Portal Magic Link (Brain Up)']],
  body: [
    [
      'Visibilidad del Cliente',
      'Opaca durante el mes. Solo recibe un informe estatico en PDF o Excel al terminar el periodo.',
      'Transparencia en vivo 24/7. El cliente abre su enlace y comprueba el avance en cualquier momento.'
    ],
    [
      'Percepcion del Cobro',
      'Sensacion de "coste que vigilar". El cliente desconfia de si las horas fueron reales o infladas.',
      'Sensacion de "inversion en valor tangible". El cliente asocia las horas a entregables concretos finalizados.'
    ],
    [
      'Gestion de Horas Extra',
      'Reactiva y conflictiva. La agencia descubre el exceso a final de mes y no puede cobrarlo con garantia.',
      'Proactiva y comercial. Al llegar al 80% de cuota a mitad de mes, el sistema propone ampliar la bolsa.'
    ],
    [
      'Acceso e Inicio de Sesion',
      'Barrera alta. Requiere crear cuentas, recordar contrasenas y aprender a usar software complejo.',
      'Cero friccion (Zero-Login). Un enlace web seguro que se guarda en marcadores o WhatsApp del cliente.'
    ],
    [
      'Carga de Trabajo Interna',
      'Alta. La coordinadora invierte horas cada mes componiendo reportes manuales para cada cuenta.',
      'Automatica. La misma imputacion de Clockify y TaskFlow alimenta el portal sin duplicar esfuerzos.'
    ],
    [
      'Fidelizacion y Retencion',
      'Fragil. El cliente cambia de agencia por diferencias de precio de 100 EUR al no percibir el valor continuo.',
      'Blindada. Ninguna otra agencia ofrece este nivel de profesionalidad, claridad y tranquilidad.'
    ]
  ],
  theme: 'grid',
  headStyles: {
    fillColor: C_INDIGO,
    textColor: C_WHITE,
    fontStyle: 'bold',
    fontSize: 9,
    halign: 'left',
    cellPadding: 3.5
  },
  bodyStyles: {
    textColor: C_DARK,
    fontSize: 8,
    lineColor: C_LILAC_BORDER,
    cellPadding: 3
  },
  columnStyles: {
    0: { cellWidth: 40, fontStyle: 'bold', textColor: C_PURPLE },
    1: { cellWidth: 70 },
    2: { cellWidth: 70, fillColor: [250, 248, 253] }
  }
});

// Cuadro de Impacto Psicológico
const boxY = doc.lastAutoTable.finalY + 10;
doc.setFillColor(...C_LILAC_BG);
doc.setDrawColor(...C_PURPLE);
doc.setLineWidth(0.6);
doc.roundedRect(15, boxY, 180, 38, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...C_PURPLE);
doc.text('EL PRINCIPIO PSICOLOGICO: DE INTERMEDIARIO A SOCIO INTERNO', 22, boxY + 9);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...C_DARK);
const psychLines = [
  'Cuando un cliente puede ver que su agencia esta trabajando en sus piezas de forma constante y ordenada,',
  'desaparece la sensacion de distancia. La agencia deja de ser un proveedor externo al que "controlar"',
  'para convertirse en su propio departamento de marketing sentado en la mesa contigua.',
  'La transparencia radical genera confianza incondicional y elimina el regateo de tarifas.'
];
let pyY = boxY + 16;
psychLines.forEach(l => {
  doc.text(l, 22, pyY);
  pyY += 4.5;
});

// ==========================================
// PÁGINA 3: ANATOMÍA DEL PORTAL DEL CLIENTE
// ==========================================
doc.addPage();
addPageHeaderFooter(doc, 3, 5, 'Anatomia y Experiencia del Cliente');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...C_INDIGO);
doc.text('2. Anatomia de la Experiencia: Que ve el Cliente', 15, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...C_DARK);
doc.text('El portal esta disenado bajo la identidad corporativa "La Abuela", optimizado al 100% para lectura movil y desktop:', 15, 33);

// Componente 1: La Barra de Cuota Viva
doc.setFillColor(255, 255, 255);
doc.setDrawColor(...C_LILAC_BORDER);
doc.setLineWidth(0.4);
doc.roundedRect(15, 38, 180, 52, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...C_PURPLE);
doc.text('A. El Monitor de Cuota en Tiempo Real (Live Burn-Rate)', 22, 48);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...C_DARK);
const comp1Text = [
  'El cliente visualiza de forma instantanea el estado de su mes en curso:',
  '• Cuota Mensual Contratada: 20 Horas (100%)',
  '• Horas Dedicadas hasta hoy: 14 Horas 30 Minutos (72.5%)',
  '• Horas Disponibles para el resto del mes: 5 Horas 30 Minutos (27.5%)',
  '• Termometro Grafico: Barra bimodal con verde esmeralda si va dentro del ritmo esperado,',
  '  y ambar si el consumo se ha acelerado por campanas extraordinarias.'
];
let cy1 = 55;
comp1Text.forEach(l => {
  doc.text(l, 22, cy1);
  cy1 += 5;
});

// Componente 2: Muro de Entregables Tangibles
doc.setFillColor(255, 255, 255);
doc.setDrawColor(...C_LILAC_BORDER);
doc.setLineWidth(0.4);
doc.roundedRect(15, 96, 180, 60, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...C_PURPLE);
doc.text('B. El Muro de Entregables Tangibles (Foco en Valor, No en Tiempos)', 22, 106);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...C_DARK);
const comp2Text = [
  'En lugar de mostrar un friki-registro de "35m - llamada", los registros se agrupan en entregables de valor:',
  '',
  '  [Completado] Campana de Black Friday: 8 creatividades graficas para Instagram, Web y Carteleria.',
  '  [Completado] Optimizacion Web Movil: Mejora de la velocidad de carga de la tienda en un 28%.',
  '  [Completado] Planificacion de Contenidos: Redaccion y programacion de 12 publicaciones mensuales.',
  '  [En Curso]   Landing Page Promocional: Maquetacion de estructura y adaptacion a identidad corporativa.',
  '',
  'El cliente comprende al segundo en que se han invertido sus recursos y que resultados ha obtenido.'
];
let cy2 = 113;
comp2Text.forEach(l => {
  doc.text(l, 22, cy2);
  cy2 += 4.5;
});

// Componente 3: Desglose por Áreas y Botón de Ampliación
doc.setFillColor(255, 255, 255);
doc.setDrawColor(...C_LILAC_BORDER);
doc.setLineWidth(0.4);
doc.roundedRect(15, 162, 180, 60, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...C_PURPLE);
doc.text('C. Desglose de Especialidades y Boton de Upselling Directo', 22, 172);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...C_DARK);
const comp3Text = [
  '• Grafico Circular de Reparto: Creatividad y Diseno (45%), Social Media (30%), Desarrollo Web (25%).',
  '• Informacion de Contacto VIP: Ficha directa con el Account Manager asignado en la agencia.',
  '• Boton Interactivo "Solicitar Paquete de Horas Adicionales":',
  '  Cuando la bolsa alcanza el 80%, el portal habilita una accion directa para que el cliente pueda',
  '  solicitar un paquete de 5h o 10h con 1 solo toque. La peticion llega a la coordinadora en Clockify',
  '  y la ampliacion queda autorizada sin emails interminables.'
];
let cy3 = 179;
comp3Text.forEach(l => {
  doc.text(l, 22, cy3);
  cy3 += 5;
});

// Componente 4: Privacidad Absoluta de la Agencia
doc.setFillColor(...C_LILAC_BG);
doc.setDrawColor(...C_LILAC_BORDER);
doc.roundedRect(15, 228, 180, 48, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...C_INDIGO);
doc.text('BLINDAJE DE PRIVACIDAD: LO QUE EL CLIENTE NUNCA VERA', 22, 237);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...C_DARK);
const privLines = [
  'El portal filtra estrictamente la informacion para preservar el control de la agencia:',
  '  1. Cero Datos Salariales ni Costes Internos: Solo se computa el tiempo acordado con el cliente.',
  '  2. Anonimizacion Opcional de Empleados: Se muestra el trabajo como "Equipo Brain Up" o con avatar corporativo.',
  '  3. Puerta de Aprobacion: Las horas pasan por un filtro de aprobacion de la coordinadora antes de ser visibles.',
  '  4. Cero Acceso a Otras Cuentas: Aislamiento hermetico mediante Row Level Security en la base de datos.'
];
let pry = 244;
privLines.forEach(l => {
  doc.text(l, 22, pry);
  pry += 4.5;
});

// ==========================================
// PÁGINA 4: ARQUITECTURA TÉCNICA Y SEGURIDAD
// ==========================================
doc.addPage();
addPageHeaderFooter(doc, 4, 5, 'Arquitectura Tecnica y Seguridad');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...C_INDIGO);
doc.text('3. Arquitectura Tecnica: Como Funciona Bajo el Capo', 15, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...C_DARK);
doc.text('La implementacion aprovecha la infraestructura ya existente de Next.js 14, Supabase y PostgreSQL:', 15, 33);

// Tabla Técnica de Componentes
doc.autoTable({
  startY: 38,
  margin: { left: 15, right: 15 },
  head: [['Capa Tecnica', 'Implementacion en Brain Up Suite', 'Garantia de Seguridad y Rendimiento']],
  body: [
    [
      'Mecanismo de Token (Magic Link)',
      'Generacion de token criptografico HMAC-SHA256 almacenado en `companies.portal_token`.',
      'Imposible de adivinar por fuerza bruta (longitud 64 caracteres alfanumericos).'
    ],
    [
      'URL Publica Amigable',
      'Ruta dinamica de Next.js App Router: `/v/[token]` (o subdominio `portal.brainupgrup.com/v/[token]`).',
      'Cache ultraligera con revalidacion bajo demanda al aprobar nuevos registros.'
    ],
    [
      'Politicas de Seguridad (RLS)',
      'Funcion SQL `SECURITY DEFINER` que valida el token antes de entregar las filas de `time_entries`.',
      'Un token de "Empresa A" nunca puede acceder bajo ningun concepto a datos de "Empresa B".'
    ],
    [
      'Filtro de Validacion de Horas',
      'Nuevo campo booleano `is_portal_visible` en la tabla `time_entries` (true por defecto o previa revision).',
      'Evita que notas internas o tareas en borrador se muestren al cliente antes de tiempo.'
    ],
    [
      'Revocacion y Rotacion con 1 Clic',
      'En el panel de coordinacion (`/dashboard/coordinator`), boton para regenerar o desactivar el enlace.',
      'Si un interlocutor abandona la empresa del cliente, se genera un nuevo enlace instantaneamente.'
    ]
  ],
  theme: 'grid',
  headStyles: {
    fillColor: C_INDIGO,
    textColor: C_WHITE,
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: 3.5
  },
  bodyStyles: {
    textColor: C_DARK,
    fontSize: 8,
    lineColor: C_LILAC_BORDER,
    cellPadding: 3
  },
  columnStyles: {
    0: { cellWidth: 45, fontStyle: 'bold', textColor: C_PURPLE },
    1: { cellWidth: 70 },
    2: { cellWidth: 65 }
  }
});

// Diagrama de Flujo en Texto Estructurado
const flowY = doc.lastAutoTable.finalY + 12;
doc.setFillColor(...C_LILAC_BG);
doc.setDrawColor(...C_LILAC_BORDER);
doc.roundedRect(15, flowY, 180, 95, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...C_PURPLE);
doc.text('FLUJO DE DATOS SINCRONIZADO EN TIEMPO REAL', 22, flowY + 10);

const flowSteps = [
  ['Paso 1: Imputacion Habitual', 'El empleado registra su tiempo o inicia el cronometro en Clockify o TaskFlow.'],
  ['Paso 2: Registro en Base de Datos', 'Supabase almacena el registro vinculado a `company_id` con su descripcion de tarea.'],
  ['Paso 3: Validacion de Coordinacion', 'La coordinadora revisa el panel semanal. Las horas validadas quedan listas para visualizacion.'],
  ['Paso 4: Consulta del Cliente', 'El cliente hace clic en su enlace desde su movil o portatil sin necesidad de login.'],
  ['Paso 5: Renderizado In-App', 'Next.js lee los datos via token y renderiza la interfaz elegante de La Abuela en < 300 ms.'],
  ['Paso 6: Accion Proactiva', 'Al llegar a la cota del 80%, el portal muestra la propuesta de ampliacion de horas.']
];

let fsY = flowY + 18;
flowSteps.forEach(([stepTitle, stepDesc]) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_INDIGO);
  doc.text(stepTitle, 22, fsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C_DARK);
  doc.text(stepDesc, 22, fsY + 4.5);

  fsY += 12;
});

// ==========================================
// PÁGINA 5: IMPACTO ECONÓMICO Y PLAN DE ACCIÓN
// ==========================================
doc.addPage();
addPageHeaderFooter(doc, 5, 5, 'Retorno de Inversion (ROI) y Plan de Accion');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...C_INDIGO);
doc.text('4. Impacto Economico, Retorno (ROI) y Fases de Despliegue', 15, 26);

// Tarjetas de Métricas de Negocio
doc.autoTable({
  startY: 34,
  margin: { left: 15, right: 15 },
  head: [['Area de Impacto', 'Metrica Estimada', 'Beneficio Directo para Brain Up Grup']],
  body: [
    [
      'Ahorro de Tiempo en Coordinacion',
      'De 8h a 0h al mes por cuenta',
      'Elimina la redaccion manual de informes en PDF/Excel a final de mes. Todo fluye en automatico.'
    ],
    [
      'Recuperacion de Horas Extra (Upselling)',
      '+15% a +25% de facturacion',
      'Los excesos de trabajo se detectan antes del dia 15 y se convierten en ampliaciones de cuota cobradas.'
    ],
    [
      'Tasa de Retencion de Clientes (Churn)',
      'Reduccion del 80% en disputas',
      'Los clientes nunca sienten opacidad ni sorpresa al recibir la factura. Confianza y permanencia blindadas.'
    ],
    [
      'Diferenciacion Competitiva',
      'Ventaja comercial unica',
      'Ninguna agencia tradicional entrega un portal en vivo de este nivel a clientes medianos y grandes.'
    ]
  ],
  theme: 'grid',
  headStyles: {
    fillColor: C_PURPLE,
    textColor: C_WHITE,
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: 3.5
  },
  bodyStyles: {
    textColor: C_DARK,
    fontSize: 8.5,
    lineColor: C_LILAC_BORDER,
    cellPadding: 3.5
  },
  columnStyles: {
    0: { cellWidth: 50, fontStyle: 'bold', textColor: C_INDIGO },
    1: { cellWidth: 45, fontStyle: 'bold', textColor: C_GREEN },
    2: { cellWidth: 85 }
  }
});

// Plan de Implementación en 3 Fases
const planY = doc.lastAutoTable.finalY + 12;
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(...C_INDIGO);
doc.text('Hoja de Ruta de Implementacion en 3 Fases', 15, planY);

const phases = [
  {
    num: 'FASE 1: INFRAESTRUCTURA DE TOKENS Y RUTA PUBLICA (2-3 DIAS)',
    desc: '• Anadir campo `portal_token` y `portal_enabled` en la tabla `companies` de Supabase.\n• Crear la pagina de lectura publica `/v/[token]` con el monitor de cuota y entregables completados.\n• Aplicar politicas RLS de solo lectura asociadas a dicho token sin requerir login.',
    color: C_INDIGO
  },
  {
    num: 'FASE 2: GESTION EN EL PANEL DE COORDINACION (2 DIAS)',
    desc: '• En la ficha de cada empresa en `/dashboard/coordinator`, anadir boton "Copiar Enlace Magico del Cliente".\n• Boton "Vista Previa" para que la coordinadora vea exactamente lo que vera el cliente antes de enviarselo.\n• Boton de seguridad "Regenerar Token" para revocar enlaces antiguos.',
    color: C_PURPLE
  },
  {
    num: 'FASE 3: ACCIONES INTERACTIVAS Y ALERTAS PROACTIVAS (3 DIAS)',
    desc: '• Activacion del aviso visual al 80% de cuota con boton "Solicitar mas horas".\n• Notificacion automatica por email o chat a la coordinadora cuando el cliente solicita una ampliacion.\n• Opcion para que el cliente pueda descargar su informe consolidado en PDF con 1 clic desde el portal.',
    color: C_GREEN
  }
];

let phaseY = planY + 7;
phases.forEach((ph) => {
  doc.setFillColor(...C_LILAC_BG);
  doc.setDrawColor(...C_LILAC_BORDER);
  doc.roundedRect(15, phaseY, 180, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ph.color);
  doc.text(ph.num, 20, phaseY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...C_DARK);
  const lines = ph.desc.split('\n');
  let ly = phaseY + 11;
  lines.forEach(l => {
    doc.text(l, 20, ly);
    ly += 4;
  });

  phaseY += 28;
});

// Cuadro de Conclusión Final
const conclY = phaseY + 2;
doc.setFillColor(...C_INDIGO);
doc.roundedRect(15, conclY, 180, 26, 3, 3, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...C_WHITE);
doc.text('CONCLUSION ESTRATEGICA', 22, conclY + 8);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(216, 207, 240);
const cLines = [
  'El Portal Magic Link no es solo una pantalla mas: es la herramienta que convierte el control horario',
  'de una obligacion tediosa en el argumento de venta y retencion mas solido de Brain Up Grup.',
  'La transparencia total no resta autoridad a la agencia; la multiplica.'
];
let cy = conclY + 14;
cLines.forEach(l => {
  doc.text(l, 22, cy);
  cy += 4;
});

// Guardar archivo en disco
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(pdfPath, pdfBuffer);
fs.writeFileSync(rootPdfPath, pdfBuffer);

console.log('PDF generado exitosamente:');
console.log('1. ', pdfPath, `(${pdfBuffer.length} bytes)`);
console.log('2. ', rootPdfPath, `(${pdfBuffer.length} bytes)`);

