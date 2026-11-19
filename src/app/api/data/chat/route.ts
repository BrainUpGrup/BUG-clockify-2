import { NextRequest, NextResponse } from 'next/server';
import { requireHubAppAccess } from '@/lib/server-hub-permissions';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_PROFILE_JOIN = 'id, full_name, role, status, department, avatar_url';
const MESSAGE_SELECT = `*, sender:profiles!messages_sender_id_fkey(${SAFE_PROFILE_JOIN}), assignee:profiles!messages_assigned_to_fkey(${SAFE_PROFILE_JOIN})`;
const MESSAGE_SELECT_FALLBACK = `*, sender:profiles(${SAFE_PROFILE_JOIN}), assignee:profiles(${SAFE_PROFILE_JOIN})`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || '');
  return code === 'PGRST205' || code === '42P01';
}

/**
 * GET /api/data/chat?resource=channels|messages|actions|pinned
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'chat');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const resource = req.nextUrl.searchParams.get('resource') || 'channels';

  if (resource === 'channels') {
    const { data, error } = await supabase
      .from('channels')
      .select('*, company:companies(id, name, logo_url, client_type, is_active)')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, tableReady: true, data: data || [] });
  }

  if (resource === 'messages') {
    const channelId = req.nextUrl.searchParams.get('channelId') || '';
    if (!channelId) {
      return NextResponse.json({ error: 'Parámetro channelId obligatorio.' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error && !isMissingTableError(error)) {
      const retry = await supabase
        .from('messages')
        .select(MESSAGE_SELECT_FALLBACK)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(300);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, tableReady: true, data: data || [] });
  }

  if (resource === 'actions') {
    let query = supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('is_action_item', true)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (UUID_RE.test(profile.id)) {
      query = query.eq('assigned_to', profile.id);
    }

    let { data, error } = await query;
    if (error && !isMissingTableError(error)) {
      let retryQ = supabase
        .from('messages')
        .select(MESSAGE_SELECT_FALLBACK)
        .eq('is_action_item', true)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(200);
      if (UUID_RE.test(profile.id)) {
        retryQ = retryQ.eq('assigned_to', profile.id);
      }
      const retry = await retryQ;
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, tableReady: true, data: data || [] });
  }

  if (resource === 'pinned') {
    let { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error && !isMissingTableError(error)) {
      const retry = await supabase
        .from('messages')
        .select(MESSAGE_SELECT_FALLBACK)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(100);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, tableReady: true, data: data || [] });
  }

  return NextResponse.json({ error: 'Recurso de chat inválido.' }, { status: 400 });
}

/**
 * POST /api/data/chat
 * Crea un mensaje (`resource: 'message'`) o canal (`resource: 'channel'`),
 * forzando `sender_id` / `created_by` al usuario autenticado.
 */
export async function POST(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'chat');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const resource = body?.resource;

    if (resource === 'message') {
      const channelId = String(body?.channel_id || '').trim();
      const content = String(body?.content || '').trim();
      if (!channelId || !content) {
        return NextResponse.json({ error: 'channel_id y content son obligatorios.' }, { status: 400 });
      }

      const assignedToRaw = body?.assigned_to ? String(body.assigned_to).trim() : null;
      const assignedTo = assignedToRaw && UUID_RE.test(assignedToRaw) ? assignedToRaw : null;

      const insertPayload: Record<string, any> = {
        channel_id: channelId,
        sender_id: profile.id,
        content,
        is_action_item: Boolean(body?.is_action_item),
        assigned_to: assignedTo,
        priority: body?.priority === 'urgent' ? 'urgent' : 'normal',
        is_completed: false,
        is_pinned: false,
      };
      if (typeof body?.id === 'string' && UUID_RE.test(body.id)) {
        insertPayload.id = body.id;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json({ success: true, tableReady: false });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, tableReady: true, message: data });
    }

    if (resource === 'channel') {
      const name = String(body?.name || '').trim().toLowerCase().replace(/\s+/g, '-');
      const type = body?.type === 'client' || body?.type === 'dm' ? body.type : 'group';
      if (!name) {
        return NextResponse.json({ error: 'Nombre de canal obligatorio.' }, { status: 400 });
      }

      const companyIdRaw = body?.company_id ? String(body.company_id).trim() : null;
      const companyId = companyIdRaw && UUID_RE.test(companyIdRaw) ? companyIdRaw : null;

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          type,
          company_id: companyId,
          created_by: UUID_RE.test(profile.id) ? profile.id : null,
        })
        .select('*')
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json({ success: true, tableReady: false });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, tableReady: true, channel: data });
    }

    return NextResponse.json({ error: 'Tipo de recurso de chat no soportado.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error en escritura de chat' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/chat
 * Actualiza estado de tarea, fijado (pin) o conversión de mensaje en tarea.
 */
export async function PATCH(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'chat');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const messageId = String(body?.id || '').trim();
    const action = String(body?.action || '').trim();
    if (!messageId || !action) {
      return NextResponse.json({ error: 'id y action son obligatorios.' }, { status: 400 });
    }

    let updatePayload: Record<string, any> | null = null;

    if (action === 'toggle_complete') {
      updatePayload = { is_completed: Boolean(body?.is_completed) };
    } else if (action === 'toggle_pin') {
      updatePayload = { is_pinned: Boolean(body?.is_pinned) };
    } else if (action === 'convert_to_task') {
      const assignedToRaw = body?.assigned_to ? String(body.assigned_to).trim() : null;
      updatePayload = {
        is_action_item: true,
        assigned_to: assignedToRaw && UUID_RE.test(assignedToRaw) ? assignedToRaw : null,
        priority: body?.priority === 'urgent' ? 'urgent' : 'normal',
        is_completed: false,
      };
    }

    if (!updatePayload) {
      return NextResponse.json({ error: 'Acción de actualización inválida.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('messages')
      .update(updatePayload)
      .eq('id', messageId);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ success: true, tableReady: false });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tableReady: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error actualizando mensaje' }, { status: 500 });
  }
}
