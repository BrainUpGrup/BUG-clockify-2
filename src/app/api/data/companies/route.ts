import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser, requireRole, isManagerRole } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeQuotaActivities(
  raw: unknown
): Array<{ id: string; title: string; hours: number | null }> {
  if (!Array.isArray(raw)) return [];
  const result: Array<{ id: string; title: string; hours: number | null }> = [];
  for (let i = 0; i < Math.min(raw.length, 30); i++) {
    const item = raw[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const title = String(item.title ?? '').trim().slice(0, 140);
    if (!title) continue;
    const rawHours = item.hours;
    let parsedHours: number | null = null;
    if (rawHours !== null && rawHours !== undefined && String(rawHours).trim() !== '') {
      const num = Number(String(rawHours).replace(',', '.'));
      if (Number.isFinite(num) && num > 0 && num <= 999) {
        parsedHours = Math.round(num * 100) / 100;
      }
    }
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().slice(0, 64)
        : `act_${Date.now()}_${i}`;
    result.push({ id, title, hours: parsedHours });
  }
  return result;
}

/**
 * GET /api/data/companies
 * Lista empresas autenticadas. Solo coordinadores/admins ven empresas archivadas si piden `?includeInactive=1`.
 */
export async function GET(req: NextRequest) {
  const { profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !profile) return errorResponse!;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const includeInactive =
    req.nextUrl.searchParams.get('includeInactive') === '1' && isManagerRole(profile.role);

  let query = supabase.from('companies').select('*').order('name');
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, companies: data || [] });
}

/**
 * POST /api/data/companies
 * Alta individual o importación masiva CSV (exclusivo Coordinador / Super Admin).
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireRole(
    req,
    ['coordinator', 'admin'],
    'Solo coordinación o administración puede crear empresas.'
  );
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();

    // Importación CSV por lotes
    if (body?.action === 'batch_import' && Array.isArray(body.companies)) {
      const replaceAll = Boolean(body.replaceAll);
      const imported = body.companies as Array<Record<string, any>>;

      if (replaceAll) {
        const [{ data: allComps }, { data: entryLinks }] = await Promise.all([
          supabase.from('companies').select('id'),
          supabase.from('time_entries').select('company_id'),
        ]);
        const protectedIds = new Set((entryLinks || []).map((e) => e.company_id));
        const idsToDelete = (allComps || [])
          .map((c) => c.id)
          .filter((id) => !protectedIds.has(id));
        if (idsToDelete.length > 0) {
          await supabase.from('companies').delete().in('id', idsToDelete);
        }
      }

      const { data: currentDbCompanies } = await supabase.from('companies').select('*');
      const currentByName = new Map<string, any>();
      (currentDbCompanies || []).forEach((c) => currentByName.set(String(c.name).trim().toLowerCase(), c));

      const toInsert: Record<string, any>[] = [];
      const toUpdate: { id: string; payload: Record<string, any> }[] = [];

      for (const item of imported) {
        const name = String(item?.name || '').trim();
        if (!name) continue;
        const clientType = item.client_type === 'puntual' ? 'puntual' : 'cuota';
        const payload = {
          name,
          client_type: clientType,
          monthly_hours_quota: clientType === 'cuota' ? Number(item.monthly_hours_quota) || 15 : null,
          cif: item.cif || null,
          contact_name: item.contact_name || null,
          contact_email: item.contact_email || null,
          account_manager: item.account_manager || 'Alejandro Ramos',
          is_active: typeof item.is_active === 'boolean' ? item.is_active : true,
        };
        const existing = currentByName.get(name.toLowerCase());
        if (existing && !replaceAll) {
          toUpdate.push({ id: existing.id, payload });
        } else {
          toInsert.push(payload);
        }
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('companies').insert(toInsert);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }

      for (const u of toUpdate) {
        await supabase.from('companies').update(u.payload).eq('id', u.id);
      }

      const { data: refreshed, error: refErr } = await supabase.from('companies').select('*').order('name');
      if (refErr) {
        return NextResponse.json({ error: refErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, companies: refreshed || [] });
    }

    // Alta individual
    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'El nombre de la empresa es obligatorio.' }, { status: 400 });
    }

    const clientType = body.client_type === 'puntual' ? 'puntual' : 'cuota';
    const quota = clientType === 'cuota' ? Number(body.monthly_hours_quota) || 15 : null;

    const { data, error } = await supabase
      .from('companies')
      .insert({
        name,
        client_type: clientType,
        monthly_hours_quota: quota,
        cif: body.cif || null,
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, company: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error creando empresa' }, { status: 500 });
  }
}

/**
 * PATCH /api/data/companies
 * Actualización de empresa/cuota/logo/estado (exclusivo Coordinador / Super Admin).
 */
export async function PATCH(req: NextRequest) {
  const { errorResponse } = await requireRole(
    req,
    ['coordinator', 'admin'],
    'Solo coordinación o administración puede modificar empresas.'
  );
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const updates = body?.updates || {};
    if (!id) {
      return NextResponse.json({ error: 'ID de empresa obligatorio.' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (typeof updates.name === 'string' && updates.name.trim()) payload.name = updates.name.trim();
    if (updates.client_type === 'cuota' || updates.client_type === 'puntual') {
      payload.client_type = updates.client_type;
      payload.monthly_hours_quota =
        updates.client_type === 'cuota' ? Number(updates.monthly_hours_quota) || 15 : null;
    } else if (updates.monthly_hours_quota !== undefined) {
      payload.monthly_hours_quota = updates.monthly_hours_quota;
    }
    if (updates.cif !== undefined) payload.cif = updates.cif || null;
    if (updates.contact_name !== undefined) payload.contact_name = updates.contact_name || null;
    if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email || null;
    if (typeof updates.is_active === 'boolean') payload.is_active = updates.is_active;

    const hasLogoUpdate = updates.logo_url !== undefined;
    const hasActivitiesUpdate = updates.quota_activities !== undefined;
    const sanitizedActivities = hasActivitiesUpdate
      ? sanitizeQuotaActivities(updates.quota_activities)
      : undefined;

    const fullPayload: Record<string, any> = {
      ...payload,
      ...(hasLogoUpdate ? { logo_url: updates.logo_url || null } : {}),
      ...(hasActivitiesUpdate ? { quota_activities: sanitizedActivities } : {}),
    };

    let { data, error } = await supabase
      .from('companies')
      .update(fullPayload)
      .eq('id', id)
      .select()
      .single();

    let missingLogoColumn = false;
    let missingQuotaActivitiesColumn = false;

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (hasLogoUpdate && msg.includes('logo_url')) missingLogoColumn = true;
      if (hasActivitiesUpdate && msg.includes('quota_activities')) missingQuotaActivitiesColumn = true;

      if (missingLogoColumn || missingQuotaActivitiesColumn) {
        const retryPayload: Record<string, any> = {
          ...payload,
          ...(hasLogoUpdate && !missingLogoColumn ? { logo_url: updates.logo_url || null } : {}),
          ...(hasActivitiesUpdate && !missingQuotaActivitiesColumn
            ? { quota_activities: sanitizedActivities }
            : {}),
        };
        const retry = await supabase
          .from('companies')
          .update(retryPayload)
          .eq('id', id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;

        // Segundo reintento por si faltaban ambas columnas opcionales
        if (error) {
          const msg2 = String(error.message || '').toLowerCase();
          if (hasLogoUpdate && msg2.includes('logo_url')) missingLogoColumn = true;
          if (hasActivitiesUpdate && msg2.includes('quota_activities')) {
            missingQuotaActivitiesColumn = true;
          }
          if (missingLogoColumn && missingQuotaActivitiesColumn) {
            const retry2 = await supabase
              .from('companies')
              .update(payload)
              .eq('id', id)
              .select()
              .single();
            data = retry2.data;
            error = retry2.error;
          }
        }
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      company: data,
      missingLogoColumn,
      missingQuotaActivitiesColumn,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error actualizando empresa' }, { status: 500 });
  }
}

/**
 * DELETE /api/data/companies?id=...
 * Eliminación definitiva de empresa y sus registros horarios (exclusivo Coordinador / Super Admin).
 */
export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireRole(
    req,
    ['coordinator', 'admin'],
    'Solo coordinación o administración puede eliminar empresas.'
  );
  if (errorResponse) return errorResponse;

  const supabase = createDataSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }

  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'ID de empresa obligatorio.' }, { status: 400 });
  }

  await supabase.from('time_entries').delete().eq('company_id', id);
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
