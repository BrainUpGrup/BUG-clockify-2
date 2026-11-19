import { NextRequest, NextResponse } from 'next/server';
import { requireHubAppAccess } from '@/lib/server-hub-permissions';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/data/hosting
 * Devuelve servicios de hosting/dominios ordenados por fecha de expiración.
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'hosting');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('hosting_services')
    .select('*')
    .order('expiration_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, services: data || [] });
}

/**
 * POST /api/data/hosting
 * Upsert individual o por lotes en hosting_services.
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'hosting');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const records = Array.isArray(body?.records) ? body.records : body?.record ? [body.record] : [];
    if (records.length === 0) {
      return NextResponse.json({ error: 'Sin registros para guardar.' }, { status: 400 });
    }

    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const { error } = await supabase
        .from('hosting_services')
        .upsert(records.slice(i, i + chunkSize));
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando hosting' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/hosting?id=...
 */
export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'hosting');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'ID de servicio obligatorio.' }, { status: 400 });
  }

  const { error } = await supabase.from('hosting_services').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
