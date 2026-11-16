import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { isValidPinFormat } from '@/lib/files-portal/security';
import {
  resetSimulatorDatabase,
  simListPortalAccesses,
  simMarkBriefingStatus,
  simUpsertPortalAccess,
} from '@/lib/files-portal/simulator-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files-hub/portal-access
 * Lista configuraciones de acceso al Portal Cliente (solo Coordinadora / Admin).
 */
export async function GET(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (profile.role !== 'coordinator' && profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Acceso restringido a coordinación.' }, { status: 403 });
  }

  const accesses = await simListPortalAccesses();
  return NextResponse.json({
    ok: true,
    portalAccesses: accesses.map((a) => ({ ...a, pin_hash: undefined })),
  });
}

/**
 * POST /api/files-hub/portal-access
 * Gestiona acciones de coordinación sobre el Portal Cliente y Briefings:
 *  - upsert_access: crear/actualizar PIN, activar/desactivar o regenerar enlace de empresa
 *  - mark_briefing: cambiar estado de un briefing recibido ('new' | 'reviewed' | 'archived')
 *  - reset_demo: restablece el entorno de demostración del simulador
 */
export async function POST(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (profile.role !== 'coordinator' && profile.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Solo coordinación o dirección puede gestionar el Portal Cliente.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = body?.action || 'upsert_access';

    if (action === 'reset_demo') {
      await resetSimulatorDatabase();
      return NextResponse.json({ ok: true, message: 'Simulador restablecido al estado demo inicial.' });
    }

    if (action === 'mark_briefing') {
      const { briefingId, status } = body as {
        briefingId?: string;
        status?: 'new' | 'reviewed' | 'archived';
      };
      if (!briefingId || !status) {
        return NextResponse.json({ ok: false, error: 'Faltan briefingId o status.' }, { status: 400 });
      }
      const updated = await simMarkBriefingStatus(briefingId, status, profile.id);
      if (!updated) {
        return NextResponse.json({ ok: false, error: 'Briefing no encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, briefing: updated });
    }

    // Por defecto: upsert_access
    const { companyId, companyName, pin, isEnabled, regenerateToken } = body as {
      companyId?: string;
      companyName?: string;
      pin?: string;
      isEnabled?: boolean;
      regenerateToken?: boolean;
    };

    if (!companyId || !pin) {
      return NextResponse.json(
        { ok: false, error: 'Debes indicar la empresa y un PIN numérico de 4 a 6 dígitos.' },
        { status: 400 }
      );
    }

    if (!isValidPinFormat(pin)) {
      return NextResponse.json(
        { ok: false, error: 'El PIN debe contener entre 4 y 6 dígitos numéricos.' },
        { status: 400 }
      );
    }

    const updated = await simUpsertPortalAccess({
      companyId,
      companyName: companyName || 'Empresa Cliente',
      pin: pin.trim(),
      isEnabled,
      regenerateToken,
      createdBy: profile.id,
    });

    return NextResponse.json({
      ok: true,
      portalAccess: { ...updated, pin_hash: undefined },
    });
  } catch (err: any) {
    console.error('Error en POST /api/files-hub/portal-access:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error gestionando acceso de cliente.' },
      { status: 500 }
    );
  }
}

