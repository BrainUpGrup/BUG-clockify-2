import { Company, ClientType } from '@/types/database';

export interface ParsedCompanyItem {
  id?: string;
  name: string;
  client_type: ClientType;
  monthly_hours_quota: number | null;
  cif?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  account_manager?: string | null;
  is_active: boolean;
}

/**
 * Plantilla CSV oficial de Brain Up para importación de empresas.
 * Delimitada por punto y coma (;) compatible con Microsoft Excel y hojas de cálculo en español.
 */
export const COMPANY_CSV_TEMPLATE_CONTENT = `\uFEFFNombre Empresa;Tipo de Cliente (cuota/puntual);Cuota Mensual (Horas);CIF/NIF;Persona de Contacto;Email de Contacto;Gestor de Cuenta;Estado (Activa/Archivada)
BrandStudio SL;cuota;15;B-87654321;Laura Gómez;laura@brandstudio.es;Alejandro Ramos;Activa
InnovaTech Solutions;cuota;25;A-12345678;Marc Rovira;m.rovira@innovatech.cat;Alejandro Ramos;Activa
Eventos Barcelona;puntual;0;B-98765432;Sonia Morales;contacto@eventosbcn.com;Alejandro Ramos;Activa
Grup Gastronòmic;cuota;30;B-55443322;Carles Puig;carles@grupgastro.com;Alejandro Ramos;Activa
Estudi Creatiu;puntual;0;B-11223344;Mireia Soler;mireia@estudicreatiu.es;Alejandro Ramos;Activa
`;

/**
 * Descarga en el navegador del usuario la plantilla oficial en formato CSV listo para rellenar en Excel.
 */
export function downloadCompanyCSVTemplate() {
  if (typeof window === 'undefined') return;
  const blob = new Blob([COMPANY_CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_empresas_brainup.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta el catálogo actual de empresas a un archivo CSV estructurado idéntico a la plantilla.
 */
export function exportCompaniesToCSV(companies: Company[]) {
  if (typeof window === 'undefined') return;

  const headers = [
    'Nombre Empresa',
    'Tipo de Cliente (cuota/puntual)',
    'Cuota Mensual (Horas)',
    'CIF/NIF',
    'Persona de Contacto',
    'Email de Contacto',
    'Gestor de Cuenta',
    'Estado (Activa/Archivada)',
  ].join(';');

  const rows = companies.map((c) => {
    const name = `"${(c.name || '').replace(/"/g, '""')}"`;
    const type = c.client_type || 'cuota';
    const quota = c.client_type === 'cuota' && c.monthly_hours_quota ? c.monthly_hours_quota : '0';
    const cif = `"${(c.cif || '').replace(/"/g, '""')}"`;
    const contact = `"${(c.contact_name || '').replace(/"/g, '""')}"`;
    const email = `"${(c.contact_email || '').replace(/"/g, '""')}"`;
    const manager = `"${(c.account_manager || 'Alejandro Ramos').replace(/"/g, '""')}"`;
    const status = c.is_active ? 'Activa' : 'Archivada';

    return [name, type, quota, cif, contact, email, manager, status].join(';');
  });

  const fullContent = `\uFEFF${headers}\n${rows.join('\n')}\n`;
  const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `empresas_brainup_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Normaliza y elimina acentos/caracteres especiales para emparejar cabeceras de columnas.
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parsea el contenido en texto de un archivo CSV de empresas y devuelve la lista de empresas normalizada.
 * Soporta delimitadores por punto y coma (;), comas (,) y tabulaciones (\t).
 */
export function parseCompanyCSV(csvText: string): ParsedCompanyItem[] {
  if (!csvText || !csvText.trim()) return [];

  // Eliminar BOM si existe
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rawLines = cleanText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) return [];

  // Detectar delimitador inspeccionando la primera línea
  const headerLine = rawLines[0];
  let delimiter = ';';
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  if (tabCount > semicolonCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (commaCount > semicolonCount) {
    delimiter = ',';
  }

  // Parser robusto de línea CSV respetando comillas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // saltar comilla escapada
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(rawLines[0]).map(normalizeHeader);

  // Mapear índices de columnas con flexibilidad de nombres
  let nameIdx = -1;
  let typeIdx = -1;
  let quotaIdx = -1;
  let cifIdx = -1;
  let contactNameIdx = -1;
  let contactEmailIdx = -1;
  let managerIdx = -1;
  let activeIdx = -1;

  headers.forEach((h, idx) => {
    if (nameIdx === -1 && (h.includes('nombre') || h.includes('empresa') || h.includes('cliente') || h.includes('razon') || h === 'name' || h === 'company')) {
      nameIdx = idx;
    } else if (typeIdx === -1 && (h.includes('tipo') || h.includes('modalidad') || h.includes('relacion') || h === 'type')) {
      typeIdx = idx;
    } else if (quotaIdx === -1 && (h.includes('cuota') || h.includes('horas') || h.includes('quota') || h.includes('pactada') || h.includes('bolsa'))) {
      quotaIdx = idx;
    } else if (cifIdx === -1 && (h.includes('cif') || h.includes('nif') || h.includes('dni') || h.includes('tax') || h.includes('fiscal'))) {
      cifIdx = idx;
    } else if (contactNameIdx === -1 && (h.includes('contacto') || h.includes('persona') || h.includes('responsable') || h.includes('cargo')) && !h.includes('email') && !h.includes('correo')) {
      contactNameIdx = idx;
    } else if (contactEmailIdx === -1 && (h.includes('email') || h.includes('correo') || h.includes('mail'))) {
      contactEmailIdx = idx;
    } else if (managerIdx === -1 && (h.includes('gestor') || h.includes('account') || h.includes('manager') || h.includes('coordinador'))) {
      managerIdx = idx;
    } else if (activeIdx === -1 && (h.includes('estado') || h.includes('activo') || h.includes('activa') || h.includes('status') || h === 'active')) {
      activeIdx = idx;
    }
  });

  // Si no se encontró columna de nombre por coincidencia exacta, usar la primera columna por defecto
  if (nameIdx === -1) {
    nameIdx = 0;
  }

  const items: ParsedCompanyItem[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const cols = parseCSVLine(line);
    const rawName = cols[nameIdx] || '';
    if (!rawName.trim()) continue;

    // Tipo de cliente (cuota vs puntual)
    let clientType: ClientType = 'cuota';
    if (typeIdx !== -1 && cols[typeIdx]) {
      const typeStr = normalizeHeader(cols[typeIdx]);
      if (typeStr.includes('puntual') || typeStr.includes('tarea') || typeStr.includes('proyecto')) {
        clientType = 'puntual';
      }
    }

    // Cuota mensual de horas
    let monthlyQuota: number | null = 15;
    if (quotaIdx !== -1 && cols[quotaIdx]) {
      const quotaStr = cols[quotaIdx].replace(',', '.').replace(/[^0-9.]/g, '');
      const parsedQuota = parseFloat(quotaStr);
      if (!isNaN(parsedQuota) && parsedQuota >= 0) {
        monthlyQuota = parsedQuota;
        // Si el usuario especificó cuota 0, interpretarlo como puntual a menos que se haya marcado explícitamente cuota
        if (parsedQuota === 0 && typeIdx === -1) {
          clientType = 'puntual';
          monthlyQuota = null;
        }
      }
    }

    if (clientType === 'puntual') {
      monthlyQuota = null;
    }

    // CIF
    const cif = cifIdx !== -1 && cols[cifIdx] ? cols[cifIdx].trim() : null;

    // Contacto
    const contactName = contactNameIdx !== -1 && cols[contactNameIdx] ? cols[contactNameIdx].trim() : null;
    const contactEmail = contactEmailIdx !== -1 && cols[contactEmailIdx] ? cols[contactEmailIdx].trim() : null;

    // Gestor de cuenta
    const accountManager = managerIdx !== -1 && cols[managerIdx] ? cols[managerIdx].trim() : 'Alejandro Ramos';

    // Estado activo
    let isActive = true;
    if (activeIdx !== -1 && cols[activeIdx]) {
      const activeStr = normalizeHeader(cols[activeIdx]);
      if (
        activeStr.includes('archivad') ||
        activeStr.includes('inactiv') ||
        activeStr.includes('baja') ||
        activeStr === 'no' ||
        activeStr === 'false' ||
        activeStr === '0'
      ) {
        isActive = false;
      }
    }

    items.push({
      name: rawName.trim(),
      client_type: clientType,
      monthly_hours_quota: monthlyQuota,
      cif: cif || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      account_manager: accountManager || 'Alejandro Ramos',
      is_active: isActive,
    });
  }

  return items;
}

