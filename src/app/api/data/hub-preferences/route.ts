import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser, isManagerRole } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';
import { BRAIN_UP_HUB_APPS, DEFAULT_EMPLOYEE_APPS, DEFAULT_FAVORITE_APPS } from '@/lib/hub-apps';
import { sanitizeAppIdList } from '@/lib/server-hub-permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' || msg.includes('user_hub_preferences');
}

/**
 * GET /api/data/hub-preferences
 * - Por defecto devuelve `allowed_apps` y `favorite_apps` del usuario autenticado.
 * - Con `?scope=all` (exclusivo coordinator/admin), devuelve también `permissionsMap`
 *   de todo el equipo para la matriz de permisos del Hub.
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const isManager = isManagerRole(profile.role);
  const scope = req.nextUrl.searchParams.get('scope');
  const includeAll = scope === 'all' && isManager;

  const defaultAllowed = isManager
    ? BRAIN_UP_HUB_APPS.map((a) => a.id)
    : [...DEFAULT_EMPLOYEE_APPS];

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      success: true,
      tableReady: false,
      allowed_apps: defaultAllowed,
      favorite_apps: [...DEFAULT_FAVORITE_APPS],
      ...(includeAll ? { permissionsMap: {} } : {}),
    });
  }

  try {
    const { data: ownRow, error: ownErr } = await supabase
      .from('user_hub_preferences')
      .select('user_id, allowed_apps, favorite_apps, updated_at')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (ownErr) {
      if (isMissingTableError(ownErr)) {
        return NextResponse.json({
          success: true,
          tableReady: false,
          allowed_apps: defaultAllowed,
          favorite_apps: [...DEFAULT_FAVORITE_APPS],
          ...(includeAll ? { permissionsMap: {} } : {}),
        });
      }
      return NextResponse.json({ error: ownErr.message }, { status: 500 });
    }

    const ownAllowed = isManager
      ? BRAIN_UP_HUB_APPS.map((a) => a.id)
      : sanitizeAppIdList(ownRow?.allowed_apps) || [...DEFAULT_EMPLOYEE_APPS];

    const sanitizedFavs = sanitizeAppIdList(ownRow?.favorite_apps);
    const ownFavorites = sanitizedFavs !== null ? sanitizedFavs : [...DEFAULT_FAVORITE_APPS];

    let permissionsMap: Record<string, string[]> | undefined;
    if (includeAll) {
      const { data: allRows, error: allErr } = await supabase
        .from('user_hub_preferences')
        .select('user_id, allowed_apps');

      if (!allErr && Array.isArray(allRows)) {
        permissionsMap = {};
        for (const row of allRows) {
          const apps = sanitizeAppIdList(row.allowed_apps);
          if (row.user_id && apps && apps.length > 0) {
            permissionsMap[row.user_id] = apps;
          }
        }
      } else {
        permissionsMap = {};
      }
    }

    return NextResponse.json({
      success: true,
      tableReady: true,
      allowed_apps: ownAllowed.length > 0 ? ownAllowed : defaultAllowed,
      favorite_apps: ownFavorites,
      ...(includeAll ? { permissionsMap } : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error leyendo preferencias del Hub' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/hub-preferences
 * - `{ favorite_apps: string[] }`: actualiza las favoritas del propio usuario.
 * - `{ user_id: string, allowed_apps: string[] }`: exclusivo coordinator/admin para
 *   asignar permisos de aplicaciones a un trabajador.
 */
export async function PATCH(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const hasAllowedUpdate = body?.allowed_apps !== undefined;
    const hasFavoriteUpdate = body?.favorite_apps !== undefined;

    if (!hasAllowedUpdate && !hasFavoriteUpdate) {
      return NextResponse.json({ error: 'No se especificaron preferencias a actualizar.' }, { status: 400 });
    }

    const isManager = isManagerRole(profile.role);
    const targetUserId =
      hasAllowedUpdate && typeof body?.user_id === 'string' && body.user_id.trim()
        ? body.user_id.trim()
        : profile.id;

    if (hasAllowedUpdate && !isManager) {
      return NextResponse.json(
        { error: 'Solo coordinación o administración pueden modificar los permisos de aplicaciones.' },
        { status: 403 }
      );
    }

    if (!hasAllowedUpdate && targetUserId !== profile.id) {
      return NextResponse.json({ error: 'No autorizado para editar favoritas ajenas.' }, { status: 403 });
    }

    const payload: Record<string, any> = {
      user_id: targetUserId,
      updated_at: new Date().toISOString(),
    };

    if (hasAllowedUpdate) {
      const sanitizedAllowed = sanitizeAppIdList(body.allowed_apps);
      if (!sanitizedAllowed || sanitizedAllowed.length === 0) {
        return NextResponse.json(
          { error: 'Cada trabajador debe tener al menos una aplicación válida asignada.' },
          { status: 400 }
        );
      }
      payload.allowed_apps = sanitizedAllowed;
    }

    if (hasFavoriteUpdate) {
      const sanitizedFavs = sanitizeAppIdList(body.favorite_apps);
      if (sanitizedFavs === null) {
        return NextResponse.json({ error: 'Formato inválido de favorite_apps.' }, { status: 400 });
      }
      payload.favorite_apps = sanitizedFavs;
    }

    // Preservar el campo no modificado si la fila ya existía
    const { data: existing } = await supabase
      .from('user_hub_preferences')
      .select('allowed_apps, favorite_apps')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existing) {
      if (!hasAllowedUpdate && existing.allowed_apps !== undefined) {
        payload.allowed_apps = existing.allowed_apps;
      }
      if (!hasFavoriteUpdate && existing.favorite_apps !== undefined) {
        payload.favorite_apps = existing.favorite_apps;
      }
    }

    const { data, error } = await supabase
      .from('user_hub_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id, allowed_apps, favorite_apps, updated_at')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          success: true,
          tableReady: false,
          warning: 'Ejecuta migration_v4_5_persistence_hardening.sql en Supabase para persistir entre dispositivos.',
          preference: payload,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tableReady: true, preference: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando preferencias del Hub' }, { status: 500 });
  }
}
