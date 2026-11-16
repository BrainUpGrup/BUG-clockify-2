/**
 * Motor de Simulación Persistente (Base de Datos Local JSON + Archivos Reales en .local-drive-sim)
 *
 * Permite validar todo el ciclo completo (Área Trabajador, Validación Coordinadora,
 * Apartado Validados, Notificaciones, Árbol de Carpetas tipo Google Drive y Área Cliente con PIN)
 * sin necesitar credenciales de Google Cloud ni tablas creadas en Supabase todavía.
 */

import fs from 'fs';
import path from 'path';
import {
  ClientBriefingFile,
  ClientDeliverable,
  ClientPortalAccessConfig,
  FileNotification,
  InternalFileVersion,
  InternalWorkFile,
} from '@/types/files-portal';
import {
  copyFileToClientDeliverablesZone,
  deleteFileFromDrive,
  moveFileToDriveZone,
  uploadFileToDrive,
  writeSimulatedDemoBinary,
} from '@/lib/storage/drive-adapter';
import {
  generatePortalToken,
  hashPortalPin,
  verifyPortalPin,
} from '@/lib/files-portal/security';

const SIMULATOR_ROOT = path.resolve(process.cwd(), '.local-drive-sim');
const DB_PATH = path.join(SIMULATOR_ROOT, 'portal-db.json');

export interface SimulatorDatabase {
  initialized: boolean;
  internalWorkFiles: InternalWorkFile[];
  clientDeliverables: ClientDeliverable[];
  clientBriefings: ClientBriefingFile[];
  portalAccesses: ClientPortalAccessConfig[];
  notifications: FileNotification[];
}

function createEmptyDb(): SimulatorDatabase {
  return {
    initialized: true,
    internalWorkFiles: [],
    clientDeliverables: [],
    clientBriefings: [],
    portalAccesses: [],
    notifications: [],
  };
}

function saveDb(db: SimulatorDatabase): void {
  fs.mkdirSync(SIMULATOR_ROOT, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Crea un gráfico SVG de demostración realista para previsualización inmediata sin dependencias externas.
 */
function makeDemoSvgBuffer(title: string, subtitle: string, accentHex: string): Buffer {
  const safeTitle = title.replace(/[<>&"]/g, '');
  const safeSub = subtitle.replace(/[<>&"]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#191654"/>
      <stop offset="100%" stop-color="${accentHex}"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" rx="28" fill="#F8F6FC"/>
  <rect x="36" y="36" width="888" height="468" rx="24" fill="url(#bg)"/>
  <rect x="76" y="78" width="220" height="36" rx="18" fill="rgba(255,255,255,0.18)"/>
  <text x="186" y="101" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="14" font-weight="bold">BRAIN UP GRUP • DEMO</text>
  <text x="76" y="240" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="40" font-weight="bold">${safeTitle}</text>
  <text x="76" y="294" fill="#D8CFF0" font-family="Arial, sans-serif" font-size="22">${safeSub}</text>
  <rect x="76" y="390" width="808" height="2" fill="rgba(255,255,255,0.25)"/>
  <text x="76" y="438" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="16">Simulador de Flujo de Archivos IaiaHub (Sin Google Drive Real)</text>
</svg>`;
  return Buffer.from(svg, 'utf-8');
}

/**
 * Inicializa datos de demostración realistas la primera vez para facilitar la validación del jefe.
 */
export async function ensureSimulatorInitialized(seedCompany?: {
  id: string;
  name: string;
}): Promise<SimulatorDatabase> {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as SimulatorDatabase;
      if (parsed && parsed.initialized) {
        return parsed;
      }
    } catch {
      // Si el JSON se corrompió, regenerar limpiamente
    }
  }

  const db = createEmptyDb();
  const demoCompanyId = seedCompany?.id || 'demo-company-brainup-001';
  const demoCompanyName = seedCompany?.name || 'Cliente Demo Brain Up';
  const now = Date.now();

  // 1. Acceso Portal Cliente con PIN 1234
  const pinHash = await hashPortalPin('1234');
  db.portalAccesses.push({
    id: 'sim-portal-001',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    portal_token: 'demo-cliente-brainup-portal-2026',
    pin_hash: pinHash,
    pin_hint: '1234',
    is_enabled: true,
    failed_attempts: 0,
    locked_until: null,
    last_access_at: null,
    created_by: 'coordinator-demo',
    created_at: new Date(now - 86400000 * 2).toISOString(),
    updated_at: new Date(now - 86400000 * 2).toISOString(),
  });

  // 2. Archivo 1: Rechazado / Con Cambios (para probar notificación al trabajador y subida de v2)
  const rejDriveId = 'simdrv_demo_rejected_v1';
  const rejSvg = makeDemoSvgBuffer('Banner Campana Otono', 'v1 - Pendiente ajuste de tipografia', '#8E0E75');
  const rejPath = await writeSimulatedDemoBinary({
    companyId: demoCompanyId,
    companyName: demoCompanyName,
    zone: 'internal_changes',
    driveFileId: rejDriveId,
    fileName: 'banner_otono_v1.svg',
    content: rejSvg,
    versionNumber: 1,
  });

  db.internalWorkFiles.push({
    id: 'sim-wf-001',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    uploaded_by: 'demo-worker-001',
    uploaded_by_name: 'Valeria (Equipo Creativo)',
    title: 'Banner Principal Campaña Otoño',
    file_name: 'banner_otono_v1.svg',
    mime_type: 'image/svg+xml',
    size_bytes: rejSvg.byteLength,
    storage_provider: 'simulator',
    drive_file_id: rejDriveId,
    drive_folder_path: rejPath,
    current_version: 1,
    status: 'changes_requested',
    is_client_published: false,
    worker_note: 'Propuesta inicial para cabecera web y redes.',
    review_reason: 'El logotipo del cliente queda muy pegado al borde izquierdo en versión móvil. Subir v2 con margen de seguridad.',
    reviewed_by: 'demo-coord-001',
    reviewed_by_name: 'Montse (Coordinación)',
    reviewed_at: new Date(now - 3600000 * 3).toISOString(),
    published_at: null,
    created_at: new Date(now - 3600000 * 6).toISOString(),
    updated_at: new Date(now - 3600000 * 3).toISOString(),
    versions: [
      {
        id: 'sim-ver-001',
        work_file_id: 'sim-wf-001',
        version_number: 1,
        file_name: 'banner_otono_v1.svg',
        mime_type: 'image/svg+xml',
        size_bytes: rejSvg.byteLength,
        drive_file_id: rejDriveId,
        drive_folder_path: rejPath,
        change_note: 'Primera propuesta subida para revisión',
        uploaded_by: 'demo-worker-001',
        uploaded_by_name: 'Valeria (Equipo Creativo)',
        created_at: new Date(now - 3600000 * 6).toISOString(),
      },
    ],
  });

  // Notificación pendiente para el trabajador por ese rechazo
  db.notifications.push({
    id: 'sim-notif-001',
    recipient_user_id: 'demo-worker-001',
    recipient_role: 'employee',
    company_id: demoCompanyId,
    work_file_id: 'sim-wf-001',
    type: 'file_changes_requested',
    title: 'Corrección requerida: Banner Principal Campaña Otoño',
    message: 'El logotipo del cliente queda muy pegado al borde izquierdo en versión móvil. Subir v2 con margen de seguridad.',
    is_read: false,
    created_at: new Date(now - 3600000 * 3).toISOString(),
  });

  // 3. Archivo 2: Pendiente de Validación por la Coordinadora
  const pendDriveId = 'simdrv_demo_pending_v1';
  const pendSvg = makeDemoSvgBuffer('Carrusel Instagram 4 Piezas', 'v1 - Listo para revisar por coordinacion', '#2C3E50');
  const pendPath = await writeSimulatedDemoBinary({
    companyId: demoCompanyId,
    companyName: demoCompanyName,
    zone: 'internal_pending',
    driveFileId: pendDriveId,
    fileName: 'carrusel_instagram_v1.svg',
    content: pendSvg,
    versionNumber: 1,
  });

  db.internalWorkFiles.push({
    id: 'sim-wf-002',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    uploaded_by: 'demo-worker-002',
    uploaded_by_name: 'Lidia (Social Media)',
    title: 'Carrusel Instagram Lanzamiento',
    file_name: 'carrusel_instagram_v1.svg',
    mime_type: 'image/svg+xml',
    size_bytes: pendSvg.byteLength,
    storage_provider: 'simulator',
    drive_file_id: pendDriveId,
    drive_folder_path: pendPath,
    current_version: 1,
    status: 'pending_review',
    is_client_published: false,
    worker_note: 'Revisar copies de las diapositivas 2 y 3 antes de enseñar al cliente.',
    created_at: new Date(now - 3600000 * 1).toISOString(),
    updated_at: new Date(now - 3600000 * 1).toISOString(),
    versions: [
      {
        id: 'sim-ver-002',
        work_file_id: 'sim-wf-002',
        version_number: 1,
        file_name: 'carrusel_instagram_v1.svg',
        mime_type: 'image/svg+xml',
        size_bytes: pendSvg.byteLength,
        drive_file_id: pendDriveId,
        drive_folder_path: pendPath,
        change_note: 'Subida inicial para validación',
        uploaded_by: 'demo-worker-002',
        uploaded_by_name: 'Lidia (Social Media)',
        created_at: new Date(now - 3600000 * 1).toISOString(),
      },
    ],
  });

  db.notifications.push({
    id: 'sim-notif-002',
    recipient_role: 'coordinator',
    company_id: demoCompanyId,
    work_file_id: 'sim-wf-002',
    type: 'new_worker_upload',
    title: 'Nuevo archivo pendiente de validar',
    message: 'Lidia (Social Media) ha subido "Carrusel Instagram Lanzamiento" para Cliente Demo Brain Up.',
    is_read: false,
    created_at: new Date(now - 3600000 * 1).toISOString(),
  });

  // 4. Archivo 3: Validado + Publicado en Área Cliente
  const valDriveId = 'simdrv_demo_validated_v2';
  const valSvg = makeDemoSvgBuffer('Dossier Identidad Corporativa', 'Validado y publicado al cliente (v2)', '#3BB54A');
  const valPath = await writeSimulatedDemoBinary({
    companyId: demoCompanyId,
    companyName: demoCompanyName,
    zone: 'internal_validated',
    driveFileId: valDriveId,
    fileName: 'dossier_identidad_v2.svg',
    content: valSvg,
    versionNumber: 2,
  });

  const pubDriveId = 'simpub_demo_published_v2';
  const pubPath = await writeSimulatedDemoBinary({
    companyId: demoCompanyId,
    companyName: demoCompanyName,
    zone: 'client_deliverables',
    driveFileId: pubDriveId,
    fileName: 'dossier_identidad_v2.svg',
    content: valSvg,
    versionNumber: 2,
  });

  db.internalWorkFiles.push({
    id: 'sim-wf-003',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    uploaded_by: 'demo-worker-001',
    uploaded_by_name: 'Valeria (Equipo Creativo)',
    title: 'Dossier Identidad Corporativa 2026',
    file_name: 'dossier_identidad_v2.svg',
    mime_type: 'image/svg+xml',
    size_bytes: valSvg.byteLength,
    storage_provider: 'simulator',
    drive_file_id: valDriveId,
    drive_folder_path: valPath,
    current_version: 2,
    status: 'validated',
    is_client_published: true,
    worker_note: 'Versión final ajustada con paleta oficial.',
    reviewed_by: 'demo-coord-001',
    reviewed_by_name: 'Montse (Coordinación)',
    reviewed_at: new Date(now - 86400000).toISOString(),
    published_at: new Date(now - 86400000).toISOString(),
    created_at: new Date(now - 86400000 * 2).toISOString(),
    updated_at: new Date(now - 86400000).toISOString(),
    versions: [
      {
        id: 'sim-ver-003',
        work_file_id: 'sim-wf-003',
        version_number: 2,
        file_name: 'dossier_identidad_v2.svg',
        mime_type: 'image/svg+xml',
        size_bytes: valSvg.byteLength,
        drive_file_id: valDriveId,
        drive_folder_path: valPath,
        change_note: 'Versión definitiva validada',
        uploaded_by: 'demo-worker-001',
        uploaded_by_name: 'Valeria (Equipo Creativo)',
        created_at: new Date(now - 86400000 * 1.5).toISOString(),
      },
    ],
  });

  db.clientDeliverables.push({
    id: 'sim-deliv-001',
    source_work_file_id: 'sim-wf-003',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    title: 'Dossier Identidad Corporativa 2026',
    file_name: 'dossier_identidad_v2.svg',
    mime_type: 'image/svg+xml',
    size_bytes: valSvg.byteLength,
    version_number: 2,
    storage_provider: 'simulator',
    drive_file_id: pubDriveId,
    drive_folder_path: pubPath,
    published_by: 'demo-coord-001',
    published_by_name: 'Montse (Coordinación)',
    client_feedback_status: 'approved',
    client_feedback_note: 'Nos encanta el resultado final.',
    published_at: new Date(now - 86400000).toISOString(),
    updated_at: new Date(now - 3600000 * 12).toISOString(),
  });

  // 5. Briefing subido por el cliente en su sub-zona separada
  const briefDriveId = 'simdrv_demo_briefing_01';
  const briefTxt = Buffer.from(
    'BRIEFING CLIENTE DEMO\n\nCampana Navidad 2026:\n- Adjuntamos guia de tonos y productos estrella.\n- Prioridad: formatos verticales 9:16 para Reels y TikTok.\n',
    'utf-8'
  );
  const briefPath = await writeSimulatedDemoBinary({
    companyId: demoCompanyId,
    companyName: demoCompanyName,
    zone: 'client_briefings',
    driveFileId: briefDriveId,
    fileName: 'briefing_campana_navidad.txt',
    content: briefTxt,
  });

  db.clientBriefings.push({
    id: 'sim-brief-001',
    company_id: demoCompanyId,
    company_name: demoCompanyName,
    title: 'Briefing Campaña Navidad 2026',
    description: 'Notas iniciales y requisitos de formato para los vídeos de campaña.',
    file_name: 'briefing_campana_navidad.txt',
    mime_type: 'text/plain',
    size_bytes: briefTxt.byteLength,
    storage_provider: 'simulator',
    drive_file_id: briefDriveId,
    drive_folder_path: briefPath,
    uploaded_by_contact: 'Dirección Comercial Cliente',
    status: 'new',
    created_at: new Date(now - 3600000 * 5).toISOString(),
  });

  saveDb(db);
  return db;
}

/**
 * Reinicia el simulador limpiando archivos y regenerando la demo inicial.
 */
export async function resetSimulatorDatabase(seedCompany?: {
  id: string;
  name: string;
}): Promise<SimulatorDatabase> {
  if (fs.existsSync(SIMULATOR_ROOT)) {
    fs.rmSync(SIMULATOR_ROOT, { recursive: true, force: true });
  }
  return ensureSimulatorInitialized(seedCompany);
}

// ------------------------------------------------------------------------------
// OPERACIONES DEL ÁREA INTERNA (TRABAJADORES Y COORDINADORA)
// ------------------------------------------------------------------------------

export async function simListInternalFiles(filters?: {
  companyId?: string;
  status?: string;
}): Promise<InternalWorkFile[]> {
  const db = await ensureSimulatorInitialized();
  return db.internalWorkFiles
    .filter((f) => (!filters?.companyId || f.company_id === filters.companyId))
    .filter((f) => (!filters?.status || f.status === filters.status))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function simUploadWorkerFile(params: {
  companyId: string;
  companyName: string;
  uploadedBy: string;
  uploadedByName: string;
  title: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  workerNote?: string;
  replaceWorkFileId?: string; // Si es una corrección v2+ sobre archivo rechazado
}): Promise<InternalWorkFile> {
  const db = await ensureSimulatorInitialized();
  const nowIso = new Date().toISOString();

  // Caso A: Subida de nueva versión corregida (v2, v3...)
  if (params.replaceWorkFileId) {
    const existing = db.internalWorkFiles.find((f) => f.id === params.replaceWorkFileId);
    if (!existing) {
      throw new Error('Archivo original no encontrado para subir la corrección.');
    }

    const nextVersion = existing.current_version + 1;
    const driveRes = await uploadFileToDrive({
      companyId: existing.company_id,
      companyName: existing.company_name || params.companyName,
      zone: 'internal_pending',
      fileName: params.fileName,
      buffer: params.buffer,
      mimeType: params.mimeType,
      versionNumber: nextVersion,
    });

    const newVer: InternalFileVersion = {
      id: `sim-ver-${Date.now()}`,
      work_file_id: existing.id,
      version_number: nextVersion,
      file_name: params.fileName,
      mime_type: params.mimeType,
      size_bytes: params.buffer.byteLength,
      drive_file_id: driveRes.driveFileId,
      drive_folder_path: driveRes.driveFolderPath,
      change_note: params.workerNote || `Versión corregida v${nextVersion}`,
      uploaded_by: params.uploadedBy,
      uploaded_by_name: params.uploadedByName,
      created_at: nowIso,
    };

    existing.file_name = params.fileName;
    existing.mime_type = params.mimeType;
    existing.size_bytes = params.buffer.byteLength;
    existing.drive_file_id = driveRes.driveFileId;
    existing.drive_folder_path = driveRes.driveFolderPath;
    existing.current_version = nextVersion;
    existing.status = 'pending_review';
    existing.is_client_published = false;
    existing.worker_note = params.workerNote || existing.worker_note;
    existing.review_reason = null;
    existing.updated_at = nowIso;
    existing.versions = [newVer, ...(existing.versions || [])];

    // Notificar a coordinación de la nueva versión corregida
    db.notifications.unshift({
      id: `sim-notif-${Date.now()}`,
      recipient_role: 'coordinator',
      company_id: existing.company_id,
      work_file_id: existing.id,
      type: 'new_worker_upload',
      title: `Corrección subida (v${nextVersion}): ${existing.title}`,
      message: `${params.uploadedByName} ha subido una nueva versión corregida para validar.`,
      is_read: false,
      created_at: nowIso,
    });

    saveDb(db);
    return existing;
  }

  // Caso B: Archivo nuevo (v1)
  const workFileId = `sim-wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const driveRes = await uploadFileToDrive({
    companyId: params.companyId,
    companyName: params.companyName,
    zone: 'internal_pending',
    fileName: params.fileName,
    buffer: params.buffer,
    mimeType: params.mimeType,
    versionNumber: 1,
  });

  const newFile: InternalWorkFile = {
    id: workFileId,
    company_id: params.companyId,
    company_name: params.companyName,
    uploaded_by: params.uploadedBy,
    uploaded_by_name: params.uploadedByName,
    title: params.title,
    file_name: params.fileName,
    mime_type: params.mimeType,
    size_bytes: params.buffer.byteLength,
    storage_provider: driveRes.storageProvider,
    drive_file_id: driveRes.driveFileId,
    drive_folder_path: driveRes.driveFolderPath,
    current_version: 1,
    status: 'pending_review',
    is_client_published: false,
    worker_note: params.workerNote || null,
    created_at: nowIso,
    updated_at: nowIso,
    versions: [
      {
        id: `sim-ver-${Date.now()}`,
        work_file_id: workFileId,
        version_number: 1,
        file_name: params.fileName,
        mime_type: params.mimeType,
        size_bytes: params.buffer.byteLength,
        drive_file_id: driveRes.driveFileId,
        drive_folder_path: driveRes.driveFolderPath,
        change_note: params.workerNote || 'Subida inicial v1',
        uploaded_by: params.uploadedBy,
        uploaded_by_name: params.uploadedByName,
        created_at: nowIso,
      },
    ],
  };

  db.internalWorkFiles.unshift(newFile);

  db.notifications.unshift({
    id: `sim-notif-${Date.now()}`,
    recipient_role: 'coordinator',
    company_id: params.companyId,
    work_file_id: workFileId,
    type: 'new_worker_upload',
    title: `Nuevo archivo para validar: ${params.title}`,
    message: `${params.uploadedByName} ha subido "${params.fileName}" para ${params.companyName}.`,
    is_read: false,
    created_at: nowIso,
  });

  saveDb(db);
  return newFile;
}

export async function simReviewWorkFile(params: {
  workFileId: string;
  action: 'request_changes' | 'validate_internal' | 'validate_and_publish' | 'publish_only';
  reviewerId: string;
  reviewerName: string;
  reason?: string;
}): Promise<{ file: InternalWorkFile; deliverable?: ClientDeliverable; notification?: FileNotification }> {
  const db = await ensureSimulatorInitialized();
  const file = db.internalWorkFiles.find((f) => f.id === params.workFileId);
  if (!file) {
    throw new Error('Archivo interno no encontrado.');
  }

  const nowIso = new Date().toISOString();
  let createdNotification: FileNotification | undefined;
  let createdDeliverable: ClientDeliverable | undefined;

  if (params.action === 'request_changes') {
    const cleanReason = (params.reason || '').trim();
    if (!cleanReason) {
      throw new Error('Debes indicar el motivo de la corrección para notificar al trabajador.');
    }

    const moved = await moveFileToDriveZone({
      driveFileId: file.drive_file_id,
      currentFolderPath: file.drive_folder_path,
      companyId: file.company_id,
      companyName: file.company_name,
      targetZone: 'internal_changes',
    });

    file.status = 'changes_requested';
    file.is_client_published = false;
    file.review_reason = cleanReason;
    file.reviewed_by = params.reviewerId;
    file.reviewed_by_name = params.reviewerName;
    file.reviewed_at = nowIso;
    file.updated_at = nowIso;
    file.drive_folder_path = moved.driveFolderPath;

    createdNotification = {
      id: `sim-notif-${Date.now()}`,
      recipient_user_id: file.uploaded_by,
      recipient_role: 'employee',
      company_id: file.company_id,
      work_file_id: file.id,
      type: 'file_changes_requested',
      title: `Cambios solicitados en: ${file.title}`,
      message: `${params.reviewerName} indicó: "${cleanReason}"`,
      is_read: false,
      created_at: nowIso,
    };
    db.notifications.unshift(createdNotification);

    saveDb(db);
    return { file, notification: createdNotification };
  }

  // Validación interna (ya sea solo interna o interna + publicación al cliente)
  if (file.status !== 'validated' || params.action !== 'publish_only') {
    const moved = await moveFileToDriveZone({
      driveFileId: file.drive_file_id,
      currentFolderPath: file.drive_folder_path,
      companyId: file.company_id,
      companyName: file.company_name,
      targetZone: 'internal_validated',
    });

    file.status = 'validated';
    file.review_reason = null;
    file.reviewed_by = params.reviewerId;
    file.reviewed_by_name = params.reviewerName;
    file.reviewed_at = nowIso;
    file.updated_at = nowIso;
    file.drive_folder_path = moved.driveFolderPath;
  }

  const shouldPublish = params.action === 'validate_and_publish' || params.action === 'publish_only';

  if (shouldPublish) {
    const copied = await copyFileToClientDeliverablesZone({
      sourceDriveFileId: file.drive_file_id,
      sourceFolderPath: file.drive_folder_path,
      companyId: file.company_id,
      companyName: file.company_name,
      fileName: file.file_name,
      versionNumber: file.current_version,
    });

    file.is_client_published = true;
    file.published_at = nowIso;
    file.updated_at = nowIso;

    const existingDeliv = db.clientDeliverables.find((d) => d.source_work_file_id === file.id);
    if (existingDeliv) {
      existingDeliv.title = file.title;
      existingDeliv.file_name = file.file_name;
      existingDeliv.mime_type = file.mime_type;
      existingDeliv.size_bytes = file.size_bytes;
      existingDeliv.version_number = file.current_version;
      existingDeliv.drive_file_id = copied.driveFileId;
      existingDeliv.drive_folder_path = copied.driveFolderPath;
      existingDeliv.published_by = params.reviewerId;
      existingDeliv.published_by_name = params.reviewerName;
      existingDeliv.published_at = nowIso;
      existingDeliv.updated_at = nowIso;
      createdDeliverable = existingDeliv;
    } else {
      createdDeliverable = {
        id: `sim-deliv-${Date.now()}`,
        source_work_file_id: file.id,
        company_id: file.company_id,
        company_name: file.company_name,
        title: file.title,
        file_name: file.file_name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        version_number: file.current_version,
        storage_provider: copied.storageProvider,
        drive_file_id: copied.driveFileId,
        drive_folder_path: copied.driveFolderPath,
        published_by: params.reviewerId,
        published_by_name: params.reviewerName,
        client_feedback_status: 'pending',
        published_at: nowIso,
        updated_at: nowIso,
      };
      db.clientDeliverables.unshift(createdDeliverable);
    }

    createdNotification = {
      id: `sim-notif-${Date.now()}`,
      recipient_user_id: file.uploaded_by,
      recipient_role: 'employee',
      company_id: file.company_id,
      work_file_id: file.id,
      type: 'file_published',
      title: `Validado y publicado al cliente: ${file.title}`,
      message: `${params.reviewerName} aprobó y publicó este entregable en el Área Cliente de ${file.company_name || 'la empresa'}.`,
      is_read: false,
      created_at: nowIso,
    };
  } else {
    createdNotification = {
      id: `sim-notif-${Date.now()}`,
      recipient_user_id: file.uploaded_by,
      recipient_role: 'employee',
      company_id: file.company_id,
      work_file_id: file.id,
      type: 'file_validated',
      title: `Archivo validado en interno: ${file.title}`,
      message: `${params.reviewerName} validó este trabajo (pendiente de publicación cuando corresponda).`,
      is_read: false,
      created_at: nowIso,
    };
  }

  db.notifications.unshift(createdNotification);
  saveDb(db);
  return { file, deliverable: createdDeliverable, notification: createdNotification };
}

export async function simDeleteInternalFile(workFileId: string): Promise<void> {
  const db = await ensureSimulatorInitialized();
  const idx = db.internalWorkFiles.findIndex((f) => f.id === workFileId);
  if (idx === -1) return;

  const target = db.internalWorkFiles[idx];
  await deleteFileFromDrive({
    driveFileId: target.drive_file_id,
    driveFolderPath: target.drive_folder_path,
  });

  db.internalWorkFiles.splice(idx, 1);
  // También retirar proyección en portal cliente si existiera
  db.clientDeliverables = db.clientDeliverables.filter((d) => d.source_work_file_id !== workFileId);
  saveDb(db);
}

// ------------------------------------------------------------------------------
// OPERACIONES DEL ÁREA CLIENTE (AISLAMIENTO ESTRICTO POR EMPRESA)
// ------------------------------------------------------------------------------

export async function simListPortalAccesses(): Promise<ClientPortalAccessConfig[]> {
  const db = await ensureSimulatorInitialized();
  return db.portalAccesses;
}

export async function simUpsertPortalAccess(params: {
  companyId: string;
  companyName: string;
  pin: string;
  isEnabled?: boolean;
  regenerateToken?: boolean;
  createdBy?: string;
}): Promise<ClientPortalAccessConfig> {
  const db = await ensureSimulatorInitialized();
  const nowIso = new Date().toISOString();
  const pinHash = await hashPortalPin(params.pin);

  let access = db.portalAccesses.find((a) => a.company_id === params.companyId);
  if (access) {
    access.company_name = params.companyName;
    access.pin_hash = pinHash;
    access.pin_hint = params.pin;
    if (typeof params.isEnabled === 'boolean') access.is_enabled = params.isEnabled;
    if (params.regenerateToken) access.portal_token = generatePortalToken();
    access.failed_attempts = 0;
    access.locked_until = null;
    access.updated_at = nowIso;
  } else {
    access = {
      id: `sim-portal-${Date.now()}`,
      company_id: params.companyId,
      company_name: params.companyName,
      portal_token: generatePortalToken(),
      pin_hash: pinHash,
      pin_hint: params.pin,
      is_enabled: params.isEnabled ?? true,
      failed_attempts: 0,
      locked_until: null,
      last_access_at: null,
      created_by: params.createdBy || null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    db.portalAccesses.push(access);
  }

  saveDb(db);
  return access;
}

export async function simGetPortalByToken(portalToken: string): Promise<{
  exists: boolean;
  isEnabled: boolean;
  companyId?: string;
  companyName?: string;
}> {
  const db = await ensureSimulatorInitialized();
  const access = db.portalAccesses.find((a) => a.portal_token === portalToken.trim());
  if (!access) {
    return { exists: false, isEnabled: false };
  }
  return {
    exists: true,
    isEnabled: access.is_enabled,
    companyId: access.company_id,
    companyName: access.company_name || 'Cliente Brain Up',
  };
}

export async function simVerifyPortalPin(portalToken: string, pin: string): Promise<{
  ok: boolean;
  error?: string;
  companyId?: string;
  companyName?: string;
}> {
  const db = await ensureSimulatorInitialized();
  const access = db.portalAccesses.find((a) => a.portal_token === portalToken.trim());
  if (!access || !access.is_enabled) {
    return { ok: false, error: 'Enlace no válido o desactivado por la agencia.' };
  }

  if (access.locked_until && new Date(access.locked_until).getTime() > Date.now()) {
    return { ok: false, error: 'Portal bloqueado temporalmente por intentos fallidos. Prueba en unos minutos.' };
  }

  const valid = await verifyPortalPin(pin, access.pin_hash);
  if (!valid) {
    access.failed_attempts += 1;
    if (access.failed_attempts >= 5) {
      access.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    access.updated_at = new Date().toISOString();
    saveDb(db);
    return { ok: false, error: 'Código PIN incorrecto.' };
  }

  access.failed_attempts = 0;
  access.locked_until = null;
  access.last_access_at = new Date().toISOString();
  access.updated_at = new Date().toISOString();
  saveDb(db);

  return {
    ok: true,
    companyId: access.company_id,
    companyName: access.company_name || 'Cliente Brain Up',
  };
}

/**
 * Snapshot aislado exclusivo para el Área Cliente (JAMÁS accede a internalWorkFiles).
 */
export async function simGetClientPortalSnapshot(companyId: string): Promise<{
  deliverables: ClientDeliverable[];
  briefings: ClientBriefingFile[];
}> {
  const db = await ensureSimulatorInitialized();
  return {
    deliverables: db.clientDeliverables
      .filter((d) => d.company_id === companyId)
      .sort((a, b) => b.published_at.localeCompare(a.published_at)),
    briefings: db.clientBriefings
      .filter((b) => b.company_id === companyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function simSubmitClientBriefing(params: {
  companyId: string;
  companyName: string;
  title: string;
  description?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  uploadedByContact?: string;
}): Promise<ClientBriefingFile> {
  const db = await ensureSimulatorInitialized();
  const nowIso = new Date().toISOString();
  const driveRes = await uploadFileToDrive({
    companyId: params.companyId,
    companyName: params.companyName,
    zone: 'client_briefings',
    fileName: params.fileName,
    buffer: params.buffer,
    mimeType: params.mimeType,
  });

  const briefing: ClientBriefingFile = {
    id: `sim-brief-${Date.now()}`,
    company_id: params.companyId,
    company_name: params.companyName,
    title: params.title,
    description: params.description || null,
    file_name: params.fileName,
    mime_type: params.mimeType,
    size_bytes: params.buffer.byteLength,
    storage_provider: driveRes.storageProvider,
    drive_file_id: driveRes.driveFileId,
    drive_folder_path: driveRes.driveFolderPath,
    uploaded_by_contact: params.uploadedByContact || 'Cliente',
    status: 'new',
    created_at: nowIso,
  };

  db.clientBriefings.unshift(briefing);

  // Avisar a la coordinadora
  db.notifications.unshift({
    id: `sim-notif-${Date.now()}`,
    recipient_role: 'coordinator',
    company_id: params.companyId,
    briefing_id: briefing.id,
    type: 'new_client_briefing',
    title: `Nuevo archivo de Briefing de ${params.companyName}`,
    message: `El cliente ha subido "${params.title}" (${params.fileName}) para acompañar su briefing.`,
    is_read: false,
    created_at: nowIso,
  });

  saveDb(db);
  return briefing;
}

export async function simRecordClientDeliverableFeedback(params: {
  companyId: string;
  deliverableId: string;
  feedbackStatus: 'approved' | 'adjustment_requested';
  feedbackNote?: string;
}): Promise<ClientDeliverable> {
  const db = await ensureSimulatorInitialized();
  const deliv = db.clientDeliverables.find(
    (d) => d.id === params.deliverableId && d.company_id === params.companyId
  );
  if (!deliv) {
    throw new Error('Entregable no encontrado para esta empresa.');
  }

  const nowIso = new Date().toISOString();
  deliv.client_feedback_status = params.feedbackStatus;
  deliv.client_feedback_note = params.feedbackNote?.trim() || null;
  deliv.updated_at = nowIso;

  db.notifications.unshift({
    id: `sim-notif-${Date.now()}`,
    recipient_role: 'coordinator',
    company_id: deliv.company_id,
    work_file_id: deliv.source_work_file_id,
    type: 'client_feedback',
    title:
      params.feedbackStatus === 'approved'
        ? `Cliente aprobó entregable: ${deliv.title}`
        : `Cliente solicita ajuste en: ${deliv.title}`,
    message:
      params.feedbackNote?.trim() ||
      (params.feedbackStatus === 'approved'
        ? `${deliv.company_name || 'El cliente'} ha dado su visto bueno.`
        : `${deliv.company_name || 'El cliente'} ha solicitado un ajuste.`),
    is_read: false,
    created_at: nowIso,
  });

  saveDb(db);
  return deliv;
}

export async function simListAllBriefings(companyId?: string): Promise<ClientBriefingFile[]> {
  const db = await ensureSimulatorInitialized();
  return db.clientBriefings
    .filter((b) => (!companyId || b.company_id === companyId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function simMarkBriefingStatus(
  briefingId: string,
  status: 'new' | 'reviewed' | 'archived',
  reviewerId: string
): Promise<ClientBriefingFile | null> {
  const db = await ensureSimulatorInitialized();
  const target = db.clientBriefings.find((b) => b.id === briefingId);
  if (!target) return null;
  target.status = status;
  target.reviewed_by = reviewerId;
  target.reviewed_at = new Date().toISOString();
  saveDb(db);
  return target;
}

// ------------------------------------------------------------------------------
// NOTIFICACIONES Y LECTURA DE ARCHIVOS
// ------------------------------------------------------------------------------

export async function simListNotificationsForUser(params: {
  userId: string;
  role: 'admin' | 'coordinator' | 'employee';
}): Promise<FileNotification[]> {
  const db = await ensureSimulatorInitialized();
  const isCoordOrAdmin = params.role === 'coordinator' || params.role === 'admin';

  return db.notifications
    .filter((n) => {
      if (n.recipient_user_id && n.recipient_user_id === params.userId) return true;
      if (isCoordOrAdmin && (n.recipient_role === 'coordinator' || n.recipient_role === 'admin')) {
        return true;
      }
      // En modo simulador demo, mostrar notificaciones de demostración de trabajador si no hay ID exacto coincidente
      if (
        !isCoordOrAdmin &&
        n.recipient_user_id === 'demo-worker-001'
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 40);
}

export async function simMarkNotificationsRead(notificationIds?: string[]): Promise<void> {
  const db = await ensureSimulatorInitialized();
  const idSet = notificationIds ? new Set(notificationIds) : null;
  db.notifications.forEach((n) => {
    if (!idSet || idSet.has(n.id)) {
      n.is_read = true;
    }
  });
  saveDb(db);
}

export async function simFindFileLocation(params: {
  scope: 'internal' | 'internal_version' | 'client_deliverable' | 'client_briefing';
  id: string;
  companyIdGuard?: string;
}): Promise<{
  driveFileId: string;
  driveFolderPath: string;
  fileName: string;
  mimeType: string;
  uploadedBy?: string;
  status?: string;
} | null> {
  const db = await ensureSimulatorInitialized();

  if (params.scope === 'internal') {
    const f = db.internalWorkFiles.find((item) => item.id === params.id);
    if (!f) return null;
    return {
      driveFileId: f.drive_file_id,
      driveFolderPath: f.drive_folder_path,
      fileName: f.file_name,
      mimeType: f.mime_type,
      uploadedBy: f.uploaded_by,
      status: f.status,
    };
  }

  if (params.scope === 'internal_version') {
    for (const f of db.internalWorkFiles) {
      const v = f.versions?.find((ver) => ver.id === params.id);
      if (v) {
        return {
          driveFileId: v.drive_file_id,
          driveFolderPath: v.drive_folder_path,
          fileName: v.file_name,
          mimeType: v.mime_type,
          uploadedBy: f.uploaded_by,
          status: f.status,
        };
      }
    }
    return null;
  }

  if (params.scope === 'client_deliverable') {
    const d = db.clientDeliverables.find(
      (item) => item.id === params.id && (!params.companyIdGuard || item.company_id === params.companyIdGuard)
    );
    if (!d) return null;
    return {
      driveFileId: d.drive_file_id,
      driveFolderPath: d.drive_folder_path,
      fileName: d.file_name,
      mimeType: d.mime_type,
    };
  }

  if (params.scope === 'client_briefing') {
    const b = db.clientBriefings.find(
      (item) => item.id === params.id && (!params.companyIdGuard || item.company_id === params.companyIdGuard)
    );
    if (!b) return null;
    return {
      driveFileId: b.drive_file_id,
      driveFolderPath: b.drive_folder_path,
      fileName: b.file_name,
      mimeType: b.mime_type,
    };
  }

  return null;
}

