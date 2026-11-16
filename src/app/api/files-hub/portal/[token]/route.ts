import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE_NAME,
  signClientPortalSession,
  verifyClientPortalSession,
} from '@/lib/files-portal/security';
import {
  simGetClientPortalSnapshot,
  simGetPortalByToken,
  simVerifyPortalPin,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files-hub/portal/[token]
 * Comprueba validez del enlace mágico y, si la cookie HMAC de ese portal es válida,
 * devuelve EXCLUSIVAMENTE sus entregables publicados y sus briefings (cero acceso interno).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = (params.token || '').trim();
  const portal = await simGetPortalByToken(token);

  if (!portal.exists || !portal.companyId) {
    return NextResponse.json(
      { ok: false, exists: false, isEnabled: false, error: 'Enlace del Portal Cliente no encontrado.' },
      { status: 404 }
    );
  }

  if (!portal.isEnabled) {
    return NextResponse.json(
      { ok: false, exists: true, isEnabled: false, error: 'Este portal ha sido desactivado temporalmente por la agencia.' },
      { status: 403 }
    );
  }

  const rawCookie = req.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  const session = await verifyClientPortalSession(rawCookie);

  const isAuthenticated =
    !!session &&
    session.scope === 'client_portal' &&
    session.portalToken === token &&
    session.companyId === portal.companyId;

  if (!isAuthenticated) {
    return NextResponse.json({
      ok: true,
      exists: true,
      isEnabled: true,
      isAuthenticated: false,
      companyName: portal.companyName,
      isDemoToken: token === 'demo-cliente-brainup-portal-2026',
    });
  }

  const snapshot = await simGetClientPortalSnapshot(portal.companyId);

  return NextResponse.json({
    ok: true,
    exists: true,
    isEnabled: true,
    isAuthenticated: true,
    companyId: portal.companyId,
    companyName: portal.companyName,
    deliverables: snapshot.deliverables,
    briefings: snapshot.briefings,
  });
}

/**
 * POST /api/files-hub/portal/[token]
 * Verifica el código PIN (4-6 dígitos) y emite la cookie aislada del Portal Cliente.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = (params.token || '').trim();
  try {
    const body = await req.json();
    const pin = String(body?.pin || '').trim();

    if (!pin) {
      return NextResponse.json({ ok: false, error: 'Introduce tu código PIN de acceso.' }, { status: 400 });
    }

    const result = await simVerifyPortalPin(token, pin);
    if (!result.ok || !result.companyId) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Acceso denegado.' },
        { status: 401 }
      );
    }

    const signedCookie = await signClientPortalSession({
      companyId: result.companyId,
      companyName: result.companyName || 'Cliente Brain Up',
      portalToken: token,
    });

    const snapshot = await simGetClientPortalSnapshot(result.companyId);

    const response = NextResponse.json({
      ok: true,
      isAuthenticated: true,
      companyId: result.companyId,
      companyName: result.companyName,
      deliverables: snapshot.deliverables,
      briefings: snapshot.briefings,
    });

    response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error al verificar el código PIN.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files-hub/portal/[token]
 * Cierra la sesión aislada del cliente.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

