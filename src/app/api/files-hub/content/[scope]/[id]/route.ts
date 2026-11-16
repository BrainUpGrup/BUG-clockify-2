import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import {
  CLIENT_PORTAL_COOKIE_NAME,
  sanitizeStorageName,
  verifyClientPortalSession,
} from '@/lib/files-portal/security';
import { readFileFromDrive } from '@/lib/storage/drive-adapter';
import { simFindFileLocation, simGetPortalByToken } from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AllowedScope = 'internal' | 'internal_version' | 'client_deliverable' | 'client_briefing';

/**
 * GET /api/files-hub/content/[scope]/[id]
 * Proxy autenticado Zero-Leak para descarga y previsualización:
 *  - Scopes 'internal' e 'internal_version': EXCLUSIVO equipo interno activo. Jamás accesible por clientes.
 *  - Scopes 'client_deliverable' y 'client_briefing': Equipo interno activo O cliente con cookie HMAC válida de su misma empresa.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { scope: string; id: string } }
) {
  const scope = params.scope as AllowedScope;
  const id = params.id;
  const isDownload = req.nextUrl.searchParams.get('download') === '1';

  if (
    scope !== 'internal' &&
    scope !== 'internal_version' &&
    scope !== 'client_deliverable' &&
    scope !== 'client_briefing'
  ) {
    return NextResponse.json({ error: 'Ámbito de archivo no válido.' }, { status: 400 });
  }

  let companyIdGuard: string | undefined;

  // 1. Verificar si es usuario interno autenticado de Brain Up
  const internalAuth = await requireActiveUser(req);
  const isInternalTeam = !internalAuth.errorResponse && !!internalAuth.user && !!internalAuth.profile;

  if (scope === 'internal' || scope === 'internal_version') {
    // Barrera dura anti-fugas: los archivos internos jamás se sirven a sesiones de cliente
    if (!isInternalTeam) {
      return NextResponse.json(
        { error: 'Acceso denegado. Archivo restringido al entorno interno de Brain Up.' },
        { status: 403 }
      );
    }
  } else {
    // Área Cliente: permitir al equipo interno O a la empresa dueña autenticada con PIN activo
    if (!isInternalTeam) {
      const portalCookie = req.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
      const clientSession = await verifyClientPortalSession(portalCookie);
      if (!clientSession || clientSession.scope !== 'client_portal' || !clientSession.companyId) {
        return NextResponse.json(
          { error: 'Acceso denegado. Se requiere PIN válido del Portal Cliente.' },
          { status: 401 }
        );
      }
      // Verificar que el token siga vigente y no haya sido pausado/rotado por coordinación
      const livePortal = await simGetPortalByToken(clientSession.portalToken);
      if (!livePortal.exists || !livePortal.isEnabled || livePortal.companyId !== clientSession.companyId) {
        return NextResponse.json(
          { error: 'El acceso de este Portal Cliente fue desactivado o rotado.' },
          { status: 403 }
        );
      }
      companyIdGuard = clientSession.companyId;
    }
  }

  const location = await simFindFileLocation({ scope, id, companyIdGuard });
  if (!location) {
    return NextResponse.json({ error: 'Archivo no encontrado o sin permisos.' }, { status: 404 });
  }

  if ((scope === 'internal' || scope === 'internal_version') && isInternalTeam) {
    const isCoordOrAdmin =
      internalAuth.profile?.role === 'coordinator' || internalAuth.profile?.role === 'admin';
    if (
      !isCoordOrAdmin &&
      location.status !== 'validated' &&
      location.uploadedBy !== internalAuth.profile?.id &&
      !location.uploadedBy?.startsWith('demo-worker-')
    ) {
      return NextResponse.json({ error: 'Archivo restringido al autor o coordinación.' }, { status: 403 });
    }
  }

  const buffer = await readFileFromDrive({
    driveFileId: location.driveFileId,
    driveFolderPath: location.driveFolderPath,
  });

  if (!buffer) {
    return NextResponse.json({ error: 'Contenido binario no localizado en el almacén.' }, { status: 404 });
  }

  const safeName = sanitizeStorageName(location.fileName, 'archivo');
  const mime = location.mimeType || 'application/octet-stream';
  const isSvg = mime.includes('svg') || safeName.toLowerCase().endsWith('.svg');

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Length': String(buffer.byteLength),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=300',
    'Content-Disposition': isDownload
      ? `attachment; filename="${safeName}"`
      : `inline; filename="${safeName}"`,
  };

  // Protección XSS para vistas previas SVG
  if (isSvg) {
    headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
  }

  return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
}

