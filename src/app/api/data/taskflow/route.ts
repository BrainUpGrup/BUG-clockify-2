import { NextRequest, NextResponse } from 'next/server';
import { requireHubAppAccess } from '@/lib/server-hub-permissions';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TaskflowResource = 'items' | 'lists' | 'postits';

const RESOURCE_TABLE: Record<TaskflowResource, { table: string; orderCol: string; ascending: boolean }> = {
  items: { table: 'taskflow_items', orderCol: 'date', ascending: true },
  lists: { table: 'taskflow_lists', orderCol: 'created_at', ascending: true },
  postits: { table: 'taskflow_postits', orderCol: 'created_at', ascending: false },
};

function parseResource(val: string | null): TaskflowResource | null {
  if (val === 'items' || val === 'lists' || val === 'postits') return val;
  return null;
}

/**
 * GET /api/data/taskflow?resource=items|lists|postits
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'taskflow');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const resource = parseResource(req.nextUrl.searchParams.get('resource'));
  if (!resource) {
    return NextResponse.json({ error: 'Parámetro resource inválido.' }, { status: 400 });
  }

  const cfg = RESOURCE_TABLE[resource];
  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .order(cfg.orderCol, { ascending: cfg.ascending });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rows: data || [] });
}

/**
 * POST /api/data/taskflow
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'taskflow');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const resource = parseResource(body?.resource ?? null);
    if (!resource) {
      return NextResponse.json({ error: 'Parámetro resource inválido.' }, { status: 400 });
    }

    const records = Array.isArray(body?.records) ? body.records : body?.record ? [body.record] : [];
    if (records.length === 0) {
      return NextResponse.json({ error: 'Sin registros para guardar.' }, { status: 400 });
    }

    const cfg = RESOURCE_TABLE[resource];
    const chunkSize = 40;
    for (let i = 0; i < records.length; i += chunkSize) {
      const { error } = await supabase.from(cfg.table).upsert(records.slice(i, i + chunkSize));
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando TaskFlow' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/taskflow?resource=items|lists|postits&id=...
 */
export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireHubAppAccess(req, 'taskflow');
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const resource = parseResource(req.nextUrl.searchParams.get('resource'));
  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!resource || !id) {
    return NextResponse.json({ error: 'Parámetros resource e id son obligatorios.' }, { status: 400 });
  }

  const cfg = RESOURCE_TABLE[resource];
  const { error } = await supabase.from(cfg.table).delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
