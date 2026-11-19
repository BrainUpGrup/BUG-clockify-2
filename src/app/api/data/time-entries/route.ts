import { NextRequest, NextResponse } from 'next/server';
import { isManagerRole } from '@/lib/api-auth';
import { requireHubAppAccess } from '@/lib/server-hub-permissions';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTRY_SELECT = '*, company:companies(*), profile:profiles(id, full_name, email, role, status, department, avatar_url)';

/**
 * GET /api/data/time-entries
 * Trabajadores solo ven sus propias imputaciones (`profile.id`);
 * Coordinación y Admin pueden consultar el histórico global (`?scope=all`).
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'clockify');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const parsedLimit = parseInt(req.nextUrl.searchParams.get('limit') || '1000', 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(2500, parsedLimit) : 1000;
  const scope = req.nextUrl.searchParams.get('scope');
  const allowGlobal = scope === 'all' && isManagerRole(profile.role);

  let query = supabase
    .from('time_entries')
    .select(ENTRY_SELECT)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!allowGlobal) {
    query = query.eq('user_id', profile.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, entries: data || [] });
}

/**
 * POST /api/data/time-entries
 * Crea un registro horario forzando `user_id = profile.id` para evitar suplantación.
 */
export async function POST(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'clockify');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const companyId = String(body?.company_id || '').trim();
    const workDate = String(body?.work_date || '').trim();
    const durationMinutes = Number(body?.duration_minutes);

    if (!companyId || !workDate || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Datos de imputación inválidos (empresa, fecha y duración positiva son obligatorios).' },
        { status: 400 }
      );
    }

    const payload = {
      user_id: profile.id,
      company_id: companyId,
      work_date: workDate,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      duration_minutes: Math.round(durationMinutes),
      description: String(body.description || 'Sin descripción').trim() || 'Sin descripción',
      compute_type: body.compute_type === 'puntual' ? 'puntual' : 'cuota',
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert(payload)
      .select(ENTRY_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando registro horario' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/time-entries
 * Solo permite editar al propietario del registro o a un coordinador/admin.
 */
export async function PATCH(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'clockify');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const updates = body?.updates || {};
    if (!id) {
      return NextResponse.json({ error: 'ID de registro obligatorio.' }, { status: 400 });
    }

    const { data: existing, error: findErr } = await supabase
      .from('time_entries')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !existing) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    if (existing.user_id !== profile.id && !isManagerRole(profile.role)) {
      return NextResponse.json(
        { error: 'No autorizado para modificar registros de otro compañero.' },
        { status: 403 }
      );
    }

    const safeUpdates: Record<string, any> = {};
    if (typeof updates.company_id === 'string' && updates.company_id) safeUpdates.company_id = updates.company_id;
    if (typeof updates.work_date === 'string' && updates.work_date) safeUpdates.work_date = updates.work_date;
    if (updates.start_time !== undefined) safeUpdates.start_time = updates.start_time || null;
    if (updates.end_time !== undefined) safeUpdates.end_time = updates.end_time || null;
    if (updates.duration_minutes !== undefined) {
      const mins = Number(updates.duration_minutes);
      if (Number.isFinite(mins) && mins > 0) safeUpdates.duration_minutes = Math.round(mins);
    }
    if (updates.description !== undefined) {
      safeUpdates.description = String(updates.description || 'Sin descripción').trim() || 'Sin descripción';
    }
    if (updates.compute_type === 'cuota' || updates.compute_type === 'puntual') {
      safeUpdates.compute_type = updates.compute_type;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(safeUpdates)
      .eq('id', id)
      .select(ENTRY_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error actualizando registro' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/time-entries?id=...
 * Solo permite borrar al propietario del registro o a un coordinador/admin.
 */
export async function DELETE(req: NextRequest) {
  const { profile, errorResponse } = await requireHubAppAccess(req, 'clockify');
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'ID de registro obligatorio.' }, { status: 400 });
  }

  const { data: existing, error: findErr } = await supabase
    .from('time_entries')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (findErr || !existing) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
  }

  if (existing.user_id !== profile.id && !isManagerRole(profile.role)) {
    return NextResponse.json(
      { error: 'No autorizado para eliminar registros de otro compañero.' },
      { status: 403 }
    );
  }

  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
