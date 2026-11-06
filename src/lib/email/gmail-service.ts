import nodemailer from 'nodemailer';
import { HostingAlert, HostingService } from '@/types/hosting';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface CoordinatorRecipient {
  email: string;
  full_name?: string;
  role: string;
}

export interface GmailConfigStatus {
  isConfigured: boolean;
  senderEmail: string | null;
  fromName: string;
}

/**
 * Comprueba el estado de configuración de Gmail en variables de entorno del servidor.
 */
export function getGmailConfigStatus(): GmailConfigStatus {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.GMAIL_FROM_NAME || 'Brain Up Notificaciones';

  return {
    isConfigured: Boolean(user && pass && user.trim() !== '' && pass.trim() !== ''),
    senderEmail: user ? user.trim() : null,
    fromName,
  };
}

/**
 * Obtiene la lista estricta de emails de coordinadores activos desde Supabase y/o variable de entorno.
 * Garantiza que NUNCA se envíen avisos de coordinación a empleados rasos.
 */
export async function getCoordinatorRecipients(): Promise<CoordinatorRecipient[]> {
  const recipientsMap = new Map<string, CoordinatorRecipient>();

  // 1. Añadir emails definidos estáticamente en variable de entorno (si existen)
  const envEmails = process.env.GMAIL_COORDINATOR_EMAILS;
  if (envEmails) {
    envEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@'))
      .forEach((email) => {
        recipientsMap.set(email, {
          email,
          full_name: 'Coordinador Autorizado',
          role: 'coordinator',
        });
      });
  }

  // 2. Consultar perfiles en Supabase con rol 'coordinator' o 'admin'
  try {
    const supabase = createServerSupabaseClient();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status')
      .in('role', ['coordinator', 'admin'])
      .eq('status', 'active');

    if (!error && profiles && profiles.length > 0) {
      profiles.forEach((p) => {
        if (p.email && p.email.includes('@')) {
          const cleanEmail = p.email.trim().toLowerCase();
          recipientsMap.set(cleanEmail, {
            email: cleanEmail,
            full_name: p.full_name || 'Coordinador Brain Up',
            role: p.role,
          });
        }
      });
    }
  } catch (err) {
    console.warn('Advertencia al consultar coordinadores en Supabase:', err);
  }

  // 3. Fallback de desarrollo si no hay base de datos conectada ni variables
  if (recipientsMap.size === 0) {
    const fallbackEmail = process.env.GMAIL_USER || 'coordinacion@brainupgrup.com';
    recipientsMap.set(fallbackEmail.toLowerCase(), {
      email: fallbackEmail.toLowerCase(),
      full_name: 'Equipo de Coordinación',
      role: 'coordinator',
    });
  }

  return Array.from(recipientsMap.values());
}

/**
 * Inicializa el transporte de Nodemailer para Gmail SMTP.
 */
function createGmailTransporter() {
  const { isConfigured, senderEmail } = getGmailConfigStatus();
  if (!isConfigured || !senderEmail) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Maquetación HTML corporativa "La Abuela" para el resumen de alertas de Hosting & Dominios.
 * Cumple DM-01 (Cero emojis), DM-13 (Paleta corporativa: #191654, #8E0E75, #F8F6FC, #D8CFF0).
 */
export function generateHostingAlertsEmailHtml(
  alerts: HostingAlert[],
  stageLabel: string = 'Todas las etapas'
): { html: string; text: string } {
  const criticalCount = alerts.filter((a) => a.daysRemaining <= 7 && a.daysRemaining >= 0).length;
  const expiredCount = alerts.filter((a) => a.daysRemaining < 0).length;
  const upcomingCount = alerts.length - criticalCount - expiredCount;

  const rowsHtml = alerts
    .slice(0, 30) // Limitar a las 30 más urgentes para legibilidad de correo
    .map((a) => {
      const isExpired = a.daysRemaining < 0;
      const isCritical = a.daysRemaining >= 0 && a.daysRemaining <= 7;
      const isWarning = a.daysRemaining > 7 && a.daysRemaining <= 15;

      const badgeBg = isExpired ? '#DC2626' : isCritical ? '#D97706' : isWarning ? '#EA580C' : '#8E0E75';
      const statusText = isExpired
        ? `${Math.abs(a.daysRemaining)} días caducado`
        : a.daysRemaining === 0
        ? 'Caduca hoy'
        : `${a.daysRemaining} días restantes`;

      return `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 14px; font-weight: 700; color: #1F2937; font-size: 13px;">
            ${a.service.name}
            <div style="font-size: 11px; color: #6B7280; font-weight: 400; margin-top: 2px;">
              Tipo: ${a.service.service_type} &middot; Prov: ${a.service.provider || 'Cdmon'}
            </div>
          </td>
          <td style="padding: 12px 14px; color: #4B5563; font-size: 12px; font-weight: 600;">
            ${a.service.client_name || 'Sin asignar'}
          </td>
          <td style="padding: 12px 14px; color: #374151; font-size: 12px; font-family: monospace;">
            ${a.service.expiration_date.split('-').reverse().join('/')}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #FFFFFF; background-color: ${badgeBg};">
              ${statusText}
            </span>
          </td>
          <td style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 700; color: ${a.service.auto_renew ? '#059669' : '#DC2626'};">
            ${a.service.auto_renew ? 'Activada' : 'Desactivada'}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Alerta de Vencimientos - Brain Up Hosting</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6FC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F6FC; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="max-width: 680px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #D8CFF0; overflow: hidden; box-shadow: 0 4px 12px rgba(25, 22, 84, 0.06);">
          
          <!-- Encabezado Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #191654 0%, #8E0E75 100%); padding: 24px 28px; color: #FFFFFF;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #E9D5FF; margin-bottom: 4px;">
                      Brain Up Grup &middot; Suite Corporativa
                    </div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #FFFFFF;">
                      Centro de Notificaciones &amp; Renovaciones
                    </h1>
                    <div style="font-size: 12px; color: #F3E8FF; margin-top: 6px;">
                      Filtro aplicado: <strong style="color: #FFFFFF;">${stageLabel}</strong> &middot; Notificaci&oacute;n confidencial para Coordinadores
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF;">
                      Solo Coordinaci&oacute;n
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Resumen de Métricas -->
          <tr>
            <td style="padding: 20px 28px; background-color: #FAF8FE; border-bottom: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px; border-right: 1px solid #E5E7EB;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #6B7280; letter-spacing: 0.5px;">Total Avisos</div>
                    <div style="font-size: 22px; font-weight: 900; color: #191654; margin-top: 4px;">${alerts.length}</div>
                  </td>
                  <td align="center" style="padding: 8px; border-right: 1px solid #E5E7EB;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #DC2626; letter-spacing: 0.5px;">Caducados</div>
                    <div style="font-size: 22px; font-weight: 900; color: #DC2626; margin-top: 4px;">${expiredCount}</div>
                  </td>
                  <td align="center" style="padding: 8px; border-right: 1px solid #E5E7EB;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #D97706; letter-spacing: 0.5px;">En &le; 7 d&iacute;as</div>
                    <div style="font-size: 22px; font-weight: 900; color: #D97706; margin-top: 4px;">${criticalCount}</div>
                  </td>
                  <td align="center" style="padding: 8px;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #8E0E75; letter-spacing: 0.5px;">En Agenda</div>
                    <div style="font-size: 22px; font-weight: 900; color: #8E0E75; margin-top: 4px;">${upcomingCount}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tabla de Servicios -->
          <tr>
            <td style="padding: 24px 28px;">
              <h2 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #1F2937;">
                Detalle de Servicios con Alerta Activa (${alerts.length})
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F8F6FC; border-bottom: 2px solid #D8CFF0; text-align: left;">
                    <th style="padding: 10px 14px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px;">Dominio / Servicio</th>
                    <th style="padding: 10px 14px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px;">Cliente</th>
                    <th style="padding: 10px 14px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px;">Vencimiento</th>
                    <th style="padding: 10px 14px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px; text-align: center;">Estado</th>
                    <th style="padding: 10px 14px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4B5563; letter-spacing: 0.5px; text-align: center;">Auto-Renovaci&oacute;n</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              ${alerts.length > 30 ? '<p style="font-size: 11px; color: #6B7280; font-style: italic; margin-top: 8px; text-align: center;">Mostrando las 30 alertas m&aacute;s urgentes. Accede al panel para revisar la totalidad de servicios.</p>' : ''}
            </td>
          </tr>

          <!-- Pie de Correo -->
          <tr>
            <td style="padding: 20px 28px; background-color: #F8F6FC; border-top: 1px solid #D8CFF0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                Este correo autom&aacute;tico ha sido emitido por el sistema <strong>Brain Up Clockify &amp; Hosting</strong> y est&aacute; dirigido exclusivamente a los coordinadores de la agencia.
              </p>
              <div style="margin-top: 10px; font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                Brain Up Grup &middot; Departamento de Sistemas &middot; Cero Emojis &middot; Confidencial
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
BRAIN UP GRUP - SUITE CORPORATIVA
CENTRO DE NOTIFICACIONES & RENOVACIONES
Dirigido exclusivamente a Coordinadores (${stageLabel})

Total Alertas: ${alerts.length}
Caducados: ${expiredCount} | Críticos en <= 7 días: ${criticalCount}

Listado:
${alerts.map((a) => `- ${a.service.name} (${a.service.client_name || 'Sin cliente'}): ${a.daysRemaining} días restantes (Vence: ${a.service.expiration_date})`).join('\n')}

Accede a la plataforma para gestionar renovaciones y notificaciones de clientes.
  `.trim();

  return { html, text };
}

/**
 * Maquetación HTML para una alerta urgente individual de un Hosting/Dominio.
 */
export function generateSingleServiceAlertEmailHtml(
  service: HostingService,
  daysRemaining: number
): { html: string; text: string } {
  const isExpired = daysRemaining < 0;
  const isCritical = daysRemaining >= 0 && daysRemaining <= 7;
  const badgeColor = isExpired ? '#DC2626' : isCritical ? '#D97706' : '#8E0E75';
  const statusLabel = isExpired
    ? `${Math.abs(daysRemaining)} DÍAS CADUCADO`
    : daysRemaining === 0
    ? 'CADUCA HOY'
    : `${daysRemaining} DÍAS RESTANTES`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Alerta Crítica: ${service.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6FC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F6FC; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #D8CFF0; overflow: hidden; box-shadow: 0 4px 12px rgba(25, 22, 84, 0.06);">
          
          <!-- Encabezado -->
          <tr>
            <td style="background: linear-gradient(135deg, #191654 0%, #8E0E75 100%); padding: 24px 28px; color: #FFFFFF;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #E9D5FF; margin-bottom: 4px;">
                Alerta Cr&iacute;tica de Coordinaci&oacute;n
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #FFFFFF;">
                ${service.name}
              </h1>
              <div style="font-size: 12px; color: #F3E8FF; margin-top: 6px;">
                Cliente asignado: <strong style="color: #FFFFFF;">${service.client_name || 'No asignado'}</strong>
              </div>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 28px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 900; letter-spacing: 0.5px; color: #FFFFFF; background-color: ${badgeColor};">
                  ${statusLabel}
                </span>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden;">
                <tr style="background-color: #F8F6FC; border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #4B5563;">Tipo de Servicio</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #1F2937;">${service.service_type}</td>
                </tr>
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #4B5563;">Proveedor</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #1F2937;">${service.provider || 'Cdmon'}</td>
                </tr>
                <tr style="background-color: #F8F6FC; border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #4B5563;">Fecha de Vencimiento</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #1F2937; font-family: monospace;">${service.expiration_date.split('-').reverse().join('/')}</td>
                </tr>
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #4B5563;">Ciclo de Renovaci&oacute;n</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #1F2937;">${service.renewal_cycle}</td>
                </tr>
                <tr style="background-color: #F8F6FC;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #4B5563;">Auto-Renovaci&oacute;n</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: ${service.auto_renew ? '#059669' : '#DC2626'};">${service.auto_renew ? 'Activada' : 'Desactivada'}</td>
                </tr>
              </table>

              ${service.notes ? `
                <div style="margin-top: 16px; padding: 12px 16px; border-radius: 8px; background-color: #FAF8FE; border: 1px solid #D8CFF0; font-size: 12px; color: #4B5563;">
                  <strong>Notas:</strong> ${service.notes}
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="padding: 18px 28px; background-color: #F8F6FC; border-top: 1px solid #D8CFF0; text-align: center; font-size: 11px; color: #6B7280;">
              Notificaci&oacute;n interna para el equipo de coordinaci&oacute;n &middot; Brain Up Grup
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
ALERTA CRÍTICA DE COORDINACIÓN - BRAIN UP HOSTING
Servicio: ${service.name}
Cliente: ${service.client_name || 'No asignado'}
Estado: ${statusLabel}
Fecha de Vencimiento: ${service.expiration_date}
Proveedor: ${service.provider || 'Cdmon'}
Ciclo: ${service.renewal_cycle}
Auto-renovación: ${service.auto_renew ? 'Activada' : 'Desactivada'}
  `.trim();

  return { html, text };
}

/**
 * Envía un correo electrónico asegurando que se destine EXCLUSIVAMENTE a los coordinadores.
 */
export async function sendCoordinatorEmail({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string;
  text: string;
}): Promise<{
  success: boolean;
  recipients: string[];
  simulated?: boolean;
  messageId?: string;
  error?: string;
}> {
  const coordinatorRecipients = await getCoordinatorRecipients();
  const emails = coordinatorRecipients.map((c) => c.email);

  if (emails.length === 0) {
    return {
      success: false,
      recipients: [],
      error: 'No se encontraron cuentas de coordinador válidas en el sistema.',
    };
  }

  const { isConfigured, senderEmail, fromName } = getGmailConfigStatus();

  // Si no está configurado en variables de entorno, registramos simulación exitosa para desarrollo
  if (!isConfigured || !senderEmail) {
    console.info('[GMAIL SIMULACIÓN] Notificación lista para coordinadores:', {
      to: emails,
      subject,
      sender: `${fromName} <simulated@brainupgrup.com>`,
      notice: 'Credenciales GMAIL_USER y GMAIL_APP_PASSWORD no configuradas en .env.local',
    });

    return {
      success: true,
      simulated: true,
      recipients: emails,
    };
  }

  try {
    const transporter = createGmailTransporter();
    if (!transporter) {
      throw new Error('No se pudo inicializar el transporte Gmail.');
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${senderEmail}>`,
      to: emails[0], // Primer destinatario
      bcc: emails.slice(1), // Resto en copia oculta para privacidad estricta
      subject: `[Brain Up Coordinación] ${subject}`,
      text,
      html,
    });

    return {
      success: true,
      recipients: emails,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error('Error enviando correo a coordinadores vía Gmail:', err);
    return {
      success: false,
      recipients: emails,
      error: err?.message || 'Error desconocido al conectar con Gmail SMTP.',
    };
  }
}

