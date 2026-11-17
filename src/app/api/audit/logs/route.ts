import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AuditLog } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit/logs
 * Devuelve el registro inmutable de auditoría para Coordinadores y Super Administradores.
 * Utiliza SUPABASE_SERVICE_ROLE_KEY en el servidor (tras verificar sesión HMAC + rol)
 * para leer `audit_logs` sin abrir la tabla al rol público `anon`.
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (profile.role !== 'admin' && profile.role !== 'coordinator') {
    return NextResponse.json(
      { error: 'Acceso restringido. Se requieren permisos de Coordinación o Super Administrador.' },
      { status: 403 }
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();
    const supabase = adminSupabase || createServerSupabaseClient();

    const parsedLimit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(250, parsedLimit) : 100;
    const actionFilter = req.nextUrl.searchParams.get('action') || undefined;
    const severityFilter = req.nextUrl.searchParams.get('severity') || undefined;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actionFilter) {
      query = query.eq('action', actionFilter);
    }
    if (severityFilter) {
      query = query.eq('severity', severityFilter);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          logs: [],
          tableReady: false,
          serviceRoleConfigured: !!adminSupabase,
          message: 'Ejecuta schema_audit_logs.sql en Supabase para activar la persistencia en base de datos.',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: (data || []) as AuditLog[],
      tableReady: true,
      serviceRoleConfigured: !!adminSupabase,
      message:
        !adminSupabase && (!data || data.length === 0)
          ? 'Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor para leer audit_logs protegida por RLS.'
          : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error consultando auditoría' }, { status: 500 });
  }
}

/**
 * POST /api/audit/logs
 * Permite registrar un evento de auditoría desde una sesión autenticada.
 */
export async function POST(req: NextRequest) {
  const { profile, user, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, entityType, entityId, details, severity } = body;

    if (!action || !entityType) {
      return NextResponse.json({ error: 'Campos requeridos: action y entityType' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient() || createServerSupabaseClient();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || null;

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: profile.id || user?.id || null,
          user_email: user?.email || profile.full_name || 'sistema@brainupgrup.com',
          user_role: profile.role || 'system',
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: details || {},
          ip_address: clientIp,
          severity: severity || 'info',
        },
      ])
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error registrando evento de auditoría' }, { status: 500 });
  }
}
