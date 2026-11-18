import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';
import { simReviewWorkFile } from '@/lib/files-portal/simulator-store';
import { generateFileCorrectionEmailHtml, sendDirectEmail } from '@/lib/email/gmail-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/files-hub/internal/review
 * Acción exclusiva de Coordinadora o Superadmin para:
 *  - Solicitar correcciones (con motivo obligatorio + notificación al trabajador + email)
 *  - Validar solo para entorno interno
 *  - Validar y publicar en el Área Cliente de esa empresa
 *  - Publicar posteriormente un archivo ya validado
 */
export async function POST(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse || !user || !profile) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (profile.role !== 'coordinator' && profile.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Solo la coordinadora o dirección puede validar o rechazar archivos.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { workFileId, action, reason } = body as {
      workFileId?: string;
      action?: 'request_changes' | 'validate_internal' | 'validate_and_publish' | 'publish_only';
      reason?: string;
    };

    if (!workFileId || !action) {
      return NextResponse.json(
        { ok: false, error: 'Faltan parámetros obligatorios (workFileId, action).' },
        { status: 400 }
      );
    }

    const result = await simReviewWorkFile({
      workFileId,
      action,
      reviewerId: profile.id,
      reviewerName: profile.full_name || user.email || 'Coordinación Brain Up',
      reason,
    });

    // Si se solicitaron cambios, disparar correo automático al trabajador (con fallback simulado si Gmail no está en .env)
    let emailDelivery: { sent: boolean; simulated?: boolean; recipient?: string } | null = null;
    if (action === 'request_changes' && reason) {
      let workerEmail = '';
      try {
        const supabase = createDataSupabaseClient();
        const { data } = supabase
          ? await supabase
            .from('profiles')
            .select('email')
            .eq('id', result.file.uploaded_by)
            .single()
          : { data: null };
        if (data?.email) workerEmail = data.email;
      } catch {
        // Ignorar si es ID de demostración
      }

      if (!workerEmail) {
        workerEmail = 'equipo@brainupgrup.com';
      }

      const { html, text } = generateFileCorrectionEmailHtml({
        workerName: result.file.uploaded_by_name,
        reviewerName: profile.full_name || user.email || 'Coordinación',
        companyName: result.file.company_name || 'Cliente',
        fileTitle: result.file.title,
        fileName: result.file.file_name,
        reason: reason.trim(),
      });

      const emailRes = await sendDirectEmail({
        to: workerEmail,
        subject: `Corrección requerida: ${result.file.title}`,
        html,
        text,
      });

      emailDelivery = {
        sent: emailRes.success,
        simulated: emailRes.simulated,
        recipient: emailRes.recipient,
      };
    }

    return NextResponse.json({
      ok: true,
      file: result.file,
      deliverable: result.deliverable || null,
      notification: result.notification || null,
      emailDelivery,
    });
  } catch (err: any) {
    console.error('Error en POST /api/files-hub/internal/review:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error procesando la revisión del archivo.' },
      { status: 400 }
    );
  }
}

