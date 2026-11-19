import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' || msg.includes('user_notifications');
}

function mapRowToClient(row: any) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    source: row.source || 'system',
    date: row.date || row.created_at || new Date().toISOString(),
    read: Boolean(row.read),
    urgency: row.urgency || 'normal',
    relatedId: row.related_id || undefined,
    reminderLabel: row.reminder_label || undefined,
    targetDate: row.target_date || undefined,
    link: row.link || undefined,
  };
}

function mapClientToRow(userId: string, item: any) {
  const validSources = new Set(['postit', 'taskflow', 'clockify', 'system']);
  const validUrgency = new Set(['normal', 'alta', 'info']);
  return {
    id: String(item?.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    user_id: userId,
    title: String(item?.title || 'Notificación').slice(0, 240),
    message: String(item?.message || '').slice(0, 1000),
    source: validSources.has(item?.source) ? item.source : 'system',
    date: item?.date || new Date().toISOString(),
    read: Boolean(item?.read),
    urgency: validUrgency.has(item?.urgency) ? item.urgency : 'normal',
    related_id: item?.relatedId ? String(item.relatedId) : null,
    reminder_label: item?.reminderLabel ? String(item.reminderLabel) : null,
    target_date: item?.targetDate ? String(item.targetDate) : null,
    link: item?.link ? String(item.link) : null,
  };
}

/**
 * GET /api/data/notifications
 * Devuelve las notificaciones persistidas del usuario autenticado.
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: true, tableReady: false, notifications: [] });
  }

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('date', { ascending: false })
    .limit(150);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ success: true, tableReady: false, notifications: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tableReady: true,
    notifications: (data || []).map(mapRowToClient),
  });
}

/**
 * POST /api/data/notifications
 * Inserta o sincroniza una o varias notificaciones del propio usuario.
 */
export async function POST(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: true, tableReady: false });
  }

  try {
    const body = await req.json();
    const rawList = Array.isArray(body?.notifications)
      ? body.notifications
      : body?.notification
        ? [body.notification]
        : [];

    if (rawList.length === 0) {
      return NextResponse.json({ error: 'Se requiere notification o notifications.' }, { status: 400 });
    }

    const rows = rawList.slice(0, 100).map((item: any) => mapClientToRow(profile.id, item));

    const { error } = await supabase
      .from('user_notifications')
      .upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tableReady: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando notificaciones' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/notifications
 * Marca una notificación (`{ id }`) o todas (`{ markAllRead: true }`) como leídas.
 */
export async function PATCH(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: true, tableReady: false });
  }

  try {
    const body = await req.json();
    let query = supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', profile.id);

    if (!body?.markAllRead) {
      const id = String(body?.id || '').trim();
      if (!id) {
        return NextResponse.json({ error: 'Se requiere id o markAllRead.' }, { status: 400 });
      }
      query = query.eq('id', id);
    }

    const { error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tableReady: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error actualizando notificaciones' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/notifications?id=... o ?all=1
 * Elimina una o todas las notificaciones del propio usuario.
 */
export async function DELETE(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: true, tableReady: false });
  }

  const all = req.nextUrl.searchParams.get('all') === '1';
  const id = req.nextUrl.searchParams.get('id');

  if (!all && !id) {
    return NextResponse.json({ error: 'Se requiere parámetro id o all=1.' }, { status: 400 });
  }

  let query = supabase.from('user_notifications').delete().eq('user_id', profile.id);
  if (!all && id) {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ success: true, tableReady: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tableReady: true });
}
