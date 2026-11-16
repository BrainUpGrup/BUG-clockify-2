import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE_NAME,
  validateUploadedFile,
  verifyClientPortalSession,
} from '@/lib/files-portal/security';
import {
  simGetPortalByToken,
  simSubmitClientBriefing,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/files-hub/portal/[token]/briefing
 * Subida aislada exclusiva para el cliente (para acompañar briefings).
 * Guarda físicamente en `02_PORTAL_CLIENTE/02_Briefings_Cliente`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = (params.token || '').trim();
  const portal = await simGetPortalByToken(token);

  if (!portal.exists || !portal.isEnabled || !portal.companyId) {
    return NextResponse.json({ ok: false, error: 'Portal no disponible.' }, { status: 403 });
  }

  const rawCookie = req.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  const session = await verifyClientPortalSession(rawCookie);

  if (
    !session ||
    session.scope !== 'client_portal' ||
    session.portalToken !== token ||
    session.companyId !== portal.companyId
  ) {
    return NextResponse.json(
      { ok: false, error: 'Sesión de cliente caducada. Introduce de nuevo tu PIN.' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = ((formData.get('title') as string) || '').trim();
    const description = ((formData.get('description') as string) || '').trim();
    const uploadedByContact = ((formData.get('contactName') as string) || 'Cliente').trim();

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Debes adjuntar un archivo.' }, { status: 400 });
    }

    const validation = validateUploadedFile(file.name, file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const briefing = await simSubmitClientBriefing({
      companyId: portal.companyId,
      companyName: portal.companyName || 'Cliente',
      title: title || validation.sanitizedName,
      description: description || undefined,
      fileName: validation.sanitizedName,
      mimeType: file.type || 'application/octet-stream',
      buffer,
      uploadedByContact: uploadedByContact || 'Cliente',
    });

    return NextResponse.json({ ok: true, briefing }, { status: 201 });
  } catch (err: any) {
    console.error('Error en POST briefing cliente:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error al subir archivo de briefing.' },
      { status: 500 }
    );
  }
}

