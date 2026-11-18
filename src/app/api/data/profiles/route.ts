import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser, requireRole, isManagerRole } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/admin-identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_PROFILE_COLUMNS =
  'id, full_name, email, role, status, department, avatar_url, password_configured, created_at';

/**
 * GET /api/data/profiles
 * Coordinación/Admin reciben el directorio completo (sin columnas de contraseñas);
 * Empleados reciben solo compañeros activos con campos no sensibles.
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const isSelfOnly = req.nextUrl.searchParams.get('self') === '1';
  if (isSelfOnly) {
    const { data, error } = await supabase
      .from('profiles')
      .select(SAFE_PROFILE_COLUMNS)
      .eq('id', profile.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, profile: data || null });
  }

  if (isManagerRole(profile.role)) {
    const { data, error } = await supabase
      .from('profiles')
      .select(SAFE_PROFILE_COLUMNS)
      .order('full_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, profiles: data || [] });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, department, avatar_url')
    .eq('status', 'active')
    .order('full_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profiles: data || [] });
}

/**
 * POST /api/data/profiles
 * Alta directa de cuentas desde Subcapa Super Admin (exclusivo rol 'admin').
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireRole(
    req,
    ['admin'],
    'Solo el Super Administrador puede crear cuentas directamente.'
  );
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const fullName = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    const role = body?.role === 'admin' || body?.role === 'coordinator' ? body.role : 'employee';
    const department = String(body?.department || 'Creatividad & Operaciones').trim();

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json(
        { error: 'Nombre, correo válido y contraseña (mínimo 6 caracteres) son obligatorios.' },
        { status: 400 }
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .upsert(
        {
          full_name: fullName,
          email,
          role: isSuperAdminEmail(email) ? 'admin' : role,
          status: 'active',
          department,
          password_configured: true,
        },
        { onConflict: 'email' }
      )
      .select(SAFE_PROFILE_COLUMNS)
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || 'Error creando cuenta' }, { status: 500 });
    }

    await supabase.rpc('admin_set_user_password', {
      p_email: email,
      p_password: password,
      p_is_temp: false,
    });

    return NextResponse.json({ success: true, profile: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error creando usuario' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/profiles
 * - Propio usuario: solo avatar_url, full_name o department (nunca role/status).
 * - Coordinador: aprobar/rechazar pendientes o editar empleados (nunca ascender a admin).
 * - Admin: edición completa (sin degradar al Super Admin maestro).
 */
export async function PATCH(req: NextRequest) {
  const { profile: caller, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !caller) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const targetId = String(body?.id || '').trim();
    const updates = body?.updates || {};
    if (!targetId) {
      return NextResponse.json({ error: 'ID de perfil obligatorio.' }, { status: 400 });
    }

    const { data: target, error: findErr } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('id', targetId)
      .maybeSingle();

    if (findErr || !target) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    }

    const isSelf = caller.id === targetId;
    const isAdmin = caller.role === 'admin';
    const isCoordinator = caller.role === 'coordinator';

    if (!isSelf && !isAdmin && !isCoordinator) {
      return NextResponse.json({ error: 'No autorizado para editar perfiles.' }, { status: 403 });
    }

    const safePayload: Record<string, any> = {};

    if (updates.avatar_url !== undefined) safePayload.avatar_url = updates.avatar_url || null;
    if (typeof updates.full_name === 'string' && updates.full_name.trim()) {
      safePayload.full_name = updates.full_name.trim();
    }
    if (typeof updates.department === 'string') safePayload.department = updates.department.trim();

    if (isAdmin || isCoordinator) {
      if (updates.status === 'active' || updates.status === 'pending' || updates.status === 'rejected') {
        if (!isSuperAdminEmail(target.email)) {
          safePayload.status = updates.status;
        }
      }
      if (updates.role === 'admin' || updates.role === 'coordinator' || updates.role === 'employee') {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Solo el Super Administrador puede modificar roles.' },
            { status: 403 }
          );
        }
        if (!isSuperAdminEmail(target.email)) {
          safePayload.role = updates.role;
        }
      }
      if (typeof updates.email === 'string' && updates.email.trim() && isAdmin && !isSuperAdminEmail(target.email)) {
        safePayload.email = updates.email.trim().toLowerCase();
      }
    }

    if (typeof updates.password === 'string' && updates.password.trim().length >= 6) {
      if (!isAdmin && !(isCoordinator && target.role !== 'admin')) {
        return NextResponse.json({ error: 'Sin permisos para fijar contraseña ajena.' }, { status: 403 });
      }
      await supabase.rpc('admin_set_user_password', {
        p_email: safePayload.email || target.email,
        p_password: updates.password.trim(),
        p_is_temp: false,
      });
      safePayload.password_configured = true;
    }

    if (Object.keys(safePayload).length > 0) {
      const { data: updated, error: updErr } = await supabase
        .from('profiles')
        .update(safePayload)
        .eq('id', targetId)
        .select(SAFE_PROFILE_COLUMNS)
        .single();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profile: updated });
    }

    return NextResponse.json({ success: true, profile: target });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error actualizando perfil' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/profiles?id=...
 * Coordinación puede rechazar/borrar empleados; Admin puede eliminar salvo el Super Admin maestro.
 */
export async function DELETE(req: NextRequest) {
  const { profile: caller, errorResponse } = await requireRole(
    req,
    ['coordinator', 'admin'],
    'Solo coordinación o administración puede eliminar perfiles.'
  );
  if (errorResponse || !caller) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const targetId = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!targetId) {
    return NextResponse.json({ error: 'ID de perfil obligatorio.' }, { status: 400 });
  }

  const { data: target, error: findErr } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', targetId)
    .maybeSingle();

  if (findErr || !target) {
    return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
  }

  if (isSuperAdminEmail(target.email)) {
    return NextResponse.json(
      { error: 'No se puede eliminar la cuenta maestra Super Administrador.' },
      { status: 403 }
    );
  }

  if (caller.role !== 'admin' && target.role === 'admin') {
    return NextResponse.json(
      { error: 'No tienes permisos para eliminar cuentas de administrador.' },
      { status: 403 }
    );
  }

  const { error } = await supabase.from('profiles').delete().eq('id', targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
