import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import {
  simListNotificationsForUser,
  simMarkNotificationsRead,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files-hub/notifications
 * Devuelve las notificaciones de archivos del usuario autenticado (y su rol).
 */
export async function GET(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const role = (profile.role as 'admin' | 'coordinator' | 'employee') || 'employee';
    const notifications = await simListNotificationsForUser({
      userId: profile.id,
      role,
    });
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      ok: true,
      unreadCount,
      notifications,
    });
  } catch (err: any) {
    console.error('Error en GET /api/files-hub/notifications:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error cargando notificaciones.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files-hub/notifications
 * Marca notificaciones como leídas (todas si no se pasan IDs).
 */
export async function PATCH(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : undefined;
    await simMarkNotificationsRead(ids);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error actualizando notificaciones.' },
      { status: 500 }
    );
  }
}

