import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/api-auth';
import { 
  getGmailConfigStatus, 
  getCoordinatorRecipients, 
  sendCoordinatorEmail, 
  generateHostingAlertsEmailHtml, 
  generateSingleServiceAlertEmailHtml 
} from '@/lib/email/gmail-service';
import { HostingAlert, HostingService } from '@/types/hosting';

/**
 * GET /api/notifications/email
 * Devuelve el estado de la conexión con Gmail y la lista de coordinadores destinatarios.
 */
export async function GET(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  const configStatus = getGmailConfigStatus();
  const coordinators = await getCoordinatorRecipients();

  return NextResponse.json({
    status: 'ok',
    gmail: {
      isConfigured: configStatus.isConfigured,
      senderEmail: configStatus.senderEmail,
      fromName: configStatus.fromName,
    },
    coordinators: coordinators.map((c) => ({
      email: c.email,
      name: c.full_name,
      role: c.role,
    })),
  });
}

/**
 * POST /api/notifications/email
 * Envía avisos y alertas por correo vía Gmail EXCLUSIVAMENTE a los coordinadores.
 */
export async function POST(req: NextRequest) {
  const { user, profile, errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  // Verificación estricta de rol: solo coordinadores o administradores pueden disparar avisos
  if (profile?.role !== 'coordinator' && profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Solo los coordinadores pueden enviar notificaciones al equipo.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action || 'hosting_batch';

    // 1. Envío de prueba de conexión Gmail
    if (action === 'test') {
      const subject = 'Verificación de Conexión de Notificaciones Gmail';
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #F8F6FC; border-radius: 12px; border: 1px solid #D8CFF0;">
          <h2 style="color: #191654; margin-top: 0;">Conexión Exitosa con Gmail</h2>
          <p style="color: #4A4A4A; font-size: 14px;">
            Este es un correo de prueba emitido desde la <strong>Suite Corporativa Brain Up Grup</strong> para verificar que las alertas se entregan correctamente al equipo de coordinación.
          </p>
          <div style="padding: 10px 14px; background-color: #FFFFFF; border-left: 4px solid #8E0E75; border-radius: 4px; font-size: 13px; color: #1F2937;">
            Disparado por: <strong>${profile?.full_name || user?.email}</strong> &middot; Rol: ${profile?.role}
          </div>
        </div>
      `;
      const text = 'Conexión exitosa con Gmail. Este es un correo de prueba de Brain Up Grup.';

      const result = await sendCoordinatorEmail({ subject, html, text });
      return NextResponse.json(result);
    }

    // 2. Envío de resumen agrupado de alertas de Hosting & Dominios
    if (action === 'hosting_batch') {
      const alerts: HostingAlert[] = body.alerts || [];
      const stageLabel: string = body.stageLabel || 'Todas las etapas';

      if (!Array.isArray(alerts) || alerts.length === 0) {
        return NextResponse.json(
          { error: 'No se suministraron alertas para enviar.' },
          { status: 400 }
        );
      }

      const { html, text } = generateHostingAlertsEmailHtml(alerts, stageLabel);
      const subject = `Resumen de Alertas de Vencimiento (${alerts.length} servicios) · ${stageLabel}`;

      const result = await sendCoordinatorEmail({ subject, html, text });
      return NextResponse.json(result);
    }

    // 3. Envío de alerta individual para un servicio crítico
    if (action === 'hosting_single') {
      const service: HostingService = body.service;
      const daysRemaining: number = body.daysRemaining ?? 0;

      if (!service || !service.name) {
        return NextResponse.json(
          { error: 'Faltan datos del servicio para enviar la notificación.' },
          { status: 400 }
        );
      }

      const { html, text } = generateSingleServiceAlertEmailHtml(service, daysRemaining);
      const subject = `Alerta Crítica: ${service.name} (${daysRemaining < 0 ? `${Math.abs(daysRemaining)}d caducado` : `${daysRemaining}d restantes`})`;

      const result = await sendCoordinatorEmail({ subject, html, text });
      return NextResponse.json(result);
    }

    // 4. Mensaje personalizado a coordinadores
    if (action === 'custom') {
      const subject: string = body.subject || 'Aviso de la Suite Brain Up';
      const message: string = body.message || '';

      if (!message.trim()) {
        return NextResponse.json(
          { error: 'El mensaje no puede estar vacío.' },
          { status: 400 }
        );
      }

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #F8F6FC; border-radius: 12px; border: 1px solid #D8CFF0;">
          <h2 style="color: #191654; margin-top: 0;">${subject}</h2>
          <p style="color: #4A4A4A; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #D8CFF0; margin: 20px 0;" />
          <div style="font-size: 12px; color: #8E0E75; font-weight: bold;">
            Enviado por: ${profile?.full_name || user?.email}
          </div>
        </div>
      `;

      const result = await sendCoordinatorEmail({ subject, html, text: message });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error procesando envío de email:', err);
    return NextResponse.json(
      { error: err?.message || 'Error interno al procesar el envío de correo.' },
      { status: 500 }
    );
  }
}
