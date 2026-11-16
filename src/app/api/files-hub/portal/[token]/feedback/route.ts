import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE_NAME,
  verifyClientPortalSession,
} from '@/lib/files-portal/security';
import {
  simGetPortalByToken,
  simRecordClientDeliverableFeedback,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/files-hub/portal/[token]/feedback
 * Permite al cliente dar visto bueno o solicitar ajuste sobre un entregable publicado.
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
    return NextResponse.json({ ok: false, error: 'Sesión de cliente no autorizada.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { deliverableId, feedbackStatus, feedbackNote } = body as {
      deliverableId?: string;
      feedbackStatus?: 'approved' | 'adjustment_requested';
      feedbackNote?: string;
    };

    if (!deliverableId || !feedbackStatus) {
      return NextResponse.json({ ok: false, error: 'Faltan datos del entregable.' }, { status: 400 });
    }

    const updated = await simRecordClientDeliverableFeedback({
      companyId: portal.companyId,
      deliverableId,
      feedbackStatus,
      feedbackNote,
    });

    return NextResponse.json({ ok: true, deliverable: updated });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error al registrar tu respuesta.' },
      { status: 400 }
    );
  }
}

