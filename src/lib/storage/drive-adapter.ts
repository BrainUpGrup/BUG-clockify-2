/**
 * Adaptador Desacoplado de Almacenamiento para Google Workspace Shared Drive.
 *
 * Modos soportados:
 *  1. 'simulator' (por defecto mientras no existan credenciales de Google Cloud):
 *     Simula fielmente una Unidad Compartida de Google Drive en disco privado del servidor
 *     (`/.local-drive-sim/`) respetando la jerarquía exacta por empresa y aislamiento estricto
 *     entre `01_AREA_INTERNA` y `02_PORTAL_CLIENTE`.
 *  2. 'google_drive' (Fase de producción al añadir GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_DRIVE_SHARED_DRIVE_ID):
 *     Conecta directamente con Google Drive API v3 sobre Unidad Compartida (Shared Drive).
 */

import fs from 'fs';
import path from 'path';
import {
  DriveFolderZone,
  SimulatedDriveEntry,
  StorageProviderMode,
} from '@/types/files-portal';
import { buildCompanyDriveSlug, sanitizeStorageName } from '@/lib/files-portal/security';

const SIMULATOR_ROOT = path.resolve(process.cwd(), '.local-drive-sim');

const ZONE_TO_SUBPATH: Record<DriveFolderZone, string> = {
  internal_pending: path.join('01_AREA_INTERNA', '01_Pendientes'),
  internal_changes: path.join('01_AREA_INTERNA', '02_Cambios'),
  internal_validated: path.join('01_AREA_INTERNA', '03_Validados'),
  client_deliverables: path.join('02_PORTAL_CLIENTE', '01_Entregables_Publicados'),
  client_briefings: path.join('02_PORTAL_CLIENTE', '02_Briefings_Cliente'),
};

export interface DriveUploadResult {
  storageProvider: StorageProviderMode;
  driveFileId: string;
  driveFolderPath: string;
}

/**
 * Determina si las credenciales reales de Google Workspace Shared Drive están configuradas.
 */
export function getActiveStorageMode(): StorageProviderMode {
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const hasSharedDrive = !!process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID?.trim();
  const forceSim = process.env.FILES_STORAGE_MODE === 'simulator';

  if (!forceSim && hasServiceAccount && hasSharedDrive) {
    return 'google_drive';
  }
  return 'simulator';
}

export function getStorageDiagnostics() {
  const mode = getActiveStorageMode();
  return {
    mode,
    isSimulated: mode === 'simulator',
    sharedDriveConfigured: !!process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID?.trim(),
    serviceAccountConfigured: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
    simulatorRootName: '.local-drive-sim',
  };
}

/**
 * Resuelve de forma segura una ruta relativa dentro de SIMULATOR_ROOT bloqueando path traversal.
 */
function resolveSafeSimPath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.resolve(SIMULATOR_ROOT, normalized);
  if (!fullPath.startsWith(SIMULATOR_ROOT + path.sep) && fullPath !== SIMULATOR_ROOT) {
    throw new Error('Acceso denegado: ruta fuera del perímetro seguro de almacenamiento.');
  }
  return fullPath;
}

/**
 * Asegura la existencia física de toda la estructura de carpetas de una empresa en el Simulador.
 */
export function ensureCompanyFolderHierarchy(companyId: string, companyName?: string): string {
  const companySlug = buildCompanyDriveSlug(companyId, companyName);
  Object.values(ZONE_TO_SUBPATH).forEach((sub) => {
    const dir = resolveSafeSimPath(path.join(companySlug, sub));
    fs.mkdirSync(dir, { recursive: true });
  });
  return companySlug;
}

/**
 * Construye la ruta relativa legible (estilo Google Drive) para una zona y empresa concretas.
 */
export function buildFolderRelativePath(
  companyId: string,
  companyName: string | undefined,
  zone: DriveFolderZone
): string {
  const slug = buildCompanyDriveSlug(companyId, companyName);
  return `${slug}/${ZONE_TO_SUBPATH[zone].replace(/\\/g, '/')}`;
}

/**
 * Genera el nombre físico único en almacenamiento preservando extensión y versión.
 */
function buildStoredFileName(driveFileId: string, originalFileName: string, versionNumber?: number): string {
  const safeName = sanitizeStorageName(originalFileName, 'archivo');
  const vPrefix = versionNumber ? `v${versionNumber}_` : '';
  return `${driveFileId}__${vPrefix}${safeName}`;
}

/**
 * Busca la ruta física de un archivo dentro de una carpeta del simulador por su driveFileId.
 */
function findSimFileInFolder(folderRelPath: string, driveFileId: string): string | null {
  const folderAbs = resolveSafeSimPath(folderRelPath);
  if (!fs.existsSync(folderAbs)) return null;
  const entries = fs.readdirSync(folderAbs);
  const match = entries.find((e) => e.startsWith(`${driveFileId}__`));
  return match ? path.join(folderAbs, match) : null;
}

/**
 * Sube un archivo a la carpeta correspondiente de Google Drive (o Simulador Local).
 */
export async function uploadFileToDrive(params: {
  companyId: string;
  companyName?: string;
  zone: DriveFolderZone;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  versionNumber?: number;
}): Promise<DriveUploadResult> {
  const mode = getActiveStorageMode();

  if (mode === 'google_drive') {
    throw new Error(
      'Modo Google Workspace Shared Drive detectado pero pendiente de activar credenciales en Fase de Producción.'
    );
  }

  ensureCompanyFolderHierarchy(params.companyId, params.companyName);
  const relFolder = buildFolderRelativePath(params.companyId, params.companyName, params.zone);
  const driveFileId = `simdrv_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const storedName = buildStoredFileName(driveFileId, params.fileName, params.versionNumber);

  const absTarget = resolveSafeSimPath(path.join(relFolder, storedName));
  fs.mkdirSync(path.dirname(absTarget), { recursive: true });
  fs.writeFileSync(absTarget, params.buffer);

  return {
    storageProvider: 'simulator',
    driveFileId,
    driveFolderPath: relFolder,
  };
}

/**
 * Mueve un archivo existente en Drive de una carpeta de estado a otra
 * (ej. de 01_Pendientes a 02_Cambios o 03_Validados).
 */
export async function moveFileToDriveZone(params: {
  driveFileId: string;
  currentFolderPath: string;
  companyId: string;
  companyName?: string;
  targetZone: DriveFolderZone;
}): Promise<{ driveFolderPath: string }> {
  const mode = getActiveStorageMode();
  if (mode === 'google_drive') {
    throw new Error('Operación moveFile en Google Drive real pendiente de credenciales.');
  }

  ensureCompanyFolderHierarchy(params.companyId, params.companyName);
  const targetRelFolder = buildFolderRelativePath(params.companyId, params.companyName, params.targetZone);

  if (params.currentFolderPath === targetRelFolder) {
    return { driveFolderPath: targetRelFolder };
  }

  const currentAbsFile = findSimFileInFolder(params.currentFolderPath, params.driveFileId);
  if (currentAbsFile && fs.existsSync(currentAbsFile)) {
    const fileNameOnDisk = path.basename(currentAbsFile);
    const targetAbsFile = resolveSafeSimPath(path.join(targetRelFolder, fileNameOnDisk));
    fs.mkdirSync(path.dirname(targetAbsFile), { recursive: true });
    fs.renameSync(currentAbsFile, targetAbsFile);
  }

  return { driveFolderPath: targetRelFolder };
}

/**
 * Crea una copia aislada en la zona de Entregables Publicados del Portal Cliente.
 * Garantiza separación física total respecto a futuras versiones internas.
 */
export async function copyFileToClientDeliverablesZone(params: {
  sourceDriveFileId: string;
  sourceFolderPath: string;
  companyId: string;
  companyName?: string;
  fileName: string;
  versionNumber?: number;
}): Promise<DriveUploadResult> {
  const mode = getActiveStorageMode();
  if (mode === 'google_drive') {
    throw new Error('Operación copyFile en Google Drive real pendiente de credenciales.');
  }

  ensureCompanyFolderHierarchy(params.companyId, params.companyName);
  const targetRelFolder = buildFolderRelativePath(
    params.companyId,
    params.companyName,
    'client_deliverables'
  );
  const newDriveFileId = `simpub_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const storedName = buildStoredFileName(newDriveFileId, params.fileName, params.versionNumber);

  const sourceAbsFile = findSimFileInFolder(params.sourceFolderPath, params.sourceDriveFileId);
  const targetAbsFile = resolveSafeSimPath(path.join(targetRelFolder, storedName));
  fs.mkdirSync(path.dirname(targetAbsFile), { recursive: true });

  if (sourceAbsFile && fs.existsSync(sourceAbsFile)) {
    fs.copyFileSync(sourceAbsFile, targetAbsFile);
  } else {
    // Fallback de seguridad si se creó como registro demo sin binario previo
    fs.writeFileSync(
      targetAbsFile,
      Buffer.from(`Archivo demo publicado en Portal Cliente: ${params.fileName}`, 'utf-8')
    );
  }

  return {
    storageProvider: 'simulator',
    driveFileId: newDriveFileId,
    driveFolderPath: targetRelFolder,
  };
}

/**
 * Lee los bytes de un archivo almacenado para servirlo vía proxy autenticado.
 */
export async function readFileFromDrive(params: {
  driveFileId: string;
  driveFolderPath: string;
}): Promise<Buffer | null> {
  const mode = getActiveStorageMode();
  if (mode === 'google_drive') {
    throw new Error('Lectura Google Drive real pendiente de credenciales.');
  }

  const absFile = findSimFileInFolder(params.driveFolderPath, params.driveFileId);
  if (!absFile || !fs.existsSync(absFile)) {
    return null;
  }
  return fs.readFileSync(absFile);
}

/**
 * Elimina un archivo físico del almacenamiento.
 */
export async function deleteFileFromDrive(params: {
  driveFileId: string;
  driveFolderPath: string;
}): Promise<void> {
  const mode = getActiveStorageMode();
  if (mode === 'google_drive') {
    return;
  }

  const absFile = findSimFileInFolder(params.driveFolderPath, params.driveFileId);
  if (absFile && fs.existsSync(absFile)) {
    fs.unlinkSync(absFile);
  }
}

/**
 * Crea un archivo binario demo real (SVG/PNG/TXT) dentro del simulador para demostraciones al jefe.
 */
export async function writeSimulatedDemoBinary(params: {
  companyId: string;
  companyName?: string;
  zone: DriveFolderZone;
  driveFileId: string;
  fileName: string;
  content: Buffer;
  versionNumber?: number;
}): Promise<string> {
  ensureCompanyFolderHierarchy(params.companyId, params.companyName);
  const relFolder = buildFolderRelativePath(params.companyId, params.companyName, params.zone);
  const storedName = buildStoredFileName(params.driveFileId, params.fileName, params.versionNumber);
  const absTarget = resolveSafeSimPath(path.join(relFolder, storedName));
  fs.mkdirSync(path.dirname(absTarget), { recursive: true });
  fs.writeFileSync(absTarget, params.content);
  return relFolder;
}

/**
 * Construye el árbol visual de carpetas del Simulador de Google Drive para auditoría y vista de Dirección.
 */
export function getSimulatedDriveTree(filterCompanySlug?: string): SimulatedDriveEntry[] {
  if (!fs.existsSync(SIMULATOR_ROOT)) {
    return [];
  }

  const walk = (absDir: string, relBase: string): SimulatedDriveEntry[] => {
    const items = fs.readdirSync(absDir, { withFileTypes: true });
    const sorted = items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const result: SimulatedDriveEntry[] = [];
    for (const item of sorted) {
      // No listar metadatos internos de BD del simulador dentro del árbol visual de Drive
      if (item.name === 'portal-db.json') continue;

      const itemAbs = path.join(absDir, item.name);
      const itemRel = relBase ? `${relBase}/${item.name}` : item.name;
      const stats = fs.statSync(itemAbs);

      if (item.isDirectory()) {
        result.push({
          name: item.name,
          kind: 'folder',
          relativePath: itemRel,
          modifiedAt: stats.mtime.toISOString(),
          children: walk(itemAbs, itemRel),
        });
      } else {
        // Limpiar prefijo simdrv_xxxx__ del nombre visible en el árbol
        const cleanDisplayName = item.name.includes('__')
          ? item.name.split('__').slice(1).join('__')
          : item.name;
        result.push({
          name: cleanDisplayName,
          kind: 'file',
          relativePath: itemRel,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }
    return result;
  };

  const rootItems = walk(SIMULATOR_ROOT, '');
  if (filterCompanySlug) {
    return rootItems.filter((node) => node.kind === 'folder' && node.name === filterCompanySlug);
  }
  return rootItems;
}

