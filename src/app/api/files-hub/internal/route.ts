import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { validateUploadedFile } from '@/lib/files-portal/security';
import { getSimulatedDriveTree, getStorageDiagnostics } from '@/lib/storage/drive-adapter';
import {
  ensureSimulatorInitialized,
  simDeleteInternalFile,
  simListAllBriefings,
  simListInternalFiles,
  simListPortalAccesses,
  simSubmitClientBriefing,
  simUploadWorkerFile,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files-hub/internal
 * Devuelve el estado completo del módulo interno (archivos de trabajadores, briefings de clientes,
 * accesos del portal, diagnóstico del simulador Drive y árbol de carpetas).
 */
export async function GET(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const companyId = req.nextUrl.searchParams.get('companyId') || undefined;
    const status = req.nextUrl.searchParams.get('status') || undefined;

    await ensureSimulatorInitialized();

    const isCoordOrAdmin = profile.role === 'coordinator' || profile.role === 'admin';

    const [allInternalFiles, briefings, portalAccesses] = await Promise.all([
      simListInternalFiles({ companyId, status }),
      simListAllBriefings(companyId),
      isCoordOrAdmin ? simListPortalAccesses() : Promise.resolve([]),
    ]);

    // Respetar aislamiento RLS: empleados ven sus archivos, validados y los de demo del simulador
    const internalFiles = isCoordOrAdmin
      ? allInternalFiles
      : allInternalFiles.filter(
          (f) =>
            f.uploaded_by === profile.id ||
            f.status === 'validated' ||
            f.uploaded_by.startsWith('demo-worker-')
        );

    const driveTree = getSimulatedDriveTree();
    const storage = getStorageDiagnostics();

    return NextResponse.json({
      ok: true,
      storage,
      internalFiles,
      briefings,
      portalAccesses: portalAccesses.map((a) => ({
        ...a,
        pin_hash: undefined, // Nunca devolver el hash criptográfico al cliente
      })),
      driveTree,
    });
  } catch (err: any) {
    console.error('Error en GET /api/files-hub/internal:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error cargando archivos del módulo.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files-hub/internal
 * Subida de archivo nuevo (v1) o nueva versión corregida (v2+) por trabajador o coordinadora.
 */
export async function POST(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isBriefing = formData.get('isBriefing') === '1' || formData.get('isBriefing') === 'true';
    const companyId = ((formData.get('companyId') as string) || '').trim();
    const companyName = ((formData.get('companyName') as string) || 'Empresa').trim();
    const title = ((formData.get('title') as string) || '').trim();
    const workerNote = ((formData.get('workerNote') as string) || '').trim();
    const contactName = ((formData.get('contactName') as string) || '').trim();
    const replaceWorkFileId = ((formData.get('replaceWorkFileId') as string) || '').trim() || undefined;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Debes adjuntar un archivo.' }, { status: 400 });
    }

    if (!replaceWorkFileId && !companyId) {
      return NextResponse.json({ ok: false, error: 'Debes seleccionar una empresa o cliente.' }, { status: 400 });
    }

    const validation = validateUploadedFile(file.name, file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isBriefing) {
      const savedBriefing = await simSubmitClientBriefing({
        companyId: companyId || 'demo-company-brainup-001',
        companyName,
        title: title || validation.sanitizedName,
        description: workerNote || undefined,
        fileName: validation.sanitizedName,
        mimeType: file.type || 'application/octet-stream',
        buffer,
        uploadedByContact: contactName || profile.full_name || 'Agencia Brain Up',
      });
      return NextResponse.json({ ok: true, briefing: savedBriefing, isBriefing: true }, { status: 201 });
    }

    const saved = await simUploadWorkerFile({
      companyId: companyId || 'demo-company-brainup-001',
      companyName,
      uploadedBy: profile.id,
      uploadedByName: profile.full_name || user.email || 'Equipo Brain Up',
      title: title || validation.sanitizedName,
      fileName: validation.sanitizedName,
      mimeType: file.type || 'application/octet-stream',
      buffer,
      workerNote: workerNote || undefined,
      replaceWorkFileId,
    });

    return NextResponse.json({ ok: true, file: saved }, { status: 201 });
  } catch (err: any) {
    console.error('Error en POST /api/files-hub/internal:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error al subir el archivo.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files-hub/internal?id=...
 */
export async function DELETE(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Falta el parámetro id.' }, { status: 400 });
    }

    const files = await simListInternalFiles();
    const target = files.find((f) => f.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: 'Archivo no encontrado.' }, { status: 404 });
    }

    const isCoordOrAdmin = profile.role === 'coordinator' || profile.role === 'admin';
    if (!isCoordOrAdmin && (target.uploaded_by !== profile.id || target.status === 'validated')) {
      return NextResponse.json(
        { ok: false, error: 'No tienes permiso para eliminar un archivo ya validado o de otro compañero.' },
        { status: 403 }
      );
    }

    await simDeleteInternalFile(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error en DELETE /api/files-hub/internal:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error al eliminar archivo.' },
      { status: 500 }
    );
  }
}

