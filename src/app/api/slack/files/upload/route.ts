import { NextRequest, NextResponse } from 'next/server';
import { slackApi, getBotInstallation } from '@/lib/slack/client';
import { ChatAttachment } from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getFileType(mimeType: string, fileName: string): 'image' | 'video' | 'file' {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.svg')
  ) {
    return 'image';
  }

  if (
    mime.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.webm') ||
    name.endsWith('.avi') ||
    name.endsWith('.mkv')
  ) {
    return 'video';
  }

  return 'file';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const channelId = (formData.get('channelId') as string) || '';
    const title = (formData.get('title') as string) || '';
    const posterUrl = (formData.get('posterUrl') as string) || '';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No se ha adjuntado ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = getFileType(file.type, file.name);

    // Obtener token del Bot: soporta token directo en .env o instalación en Supabase
    let slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      try {
        const install = await getBotInstallation();
        slackToken = install?.token;
      } catch {
        slackToken = undefined;
      }
    }

    // 1. MODO REAL: Si existe un token de Slack configurado
    if (slackToken) {
      try {
        // Paso A: Pedir URL de subida externa a Slack
        const getUrlRes = await slackApi<{
          ok: boolean;
          upload_url?: string;
          file_id?: string;
          error?: string;
        }>(
          'files.getUploadURLExternal',
          {
            filename: file.name,
            length: buffer.byteLength,
          },
          slackToken
        );

        if (getUrlRes.ok && getUrlRes.upload_url && getUrlRes.file_id) {
          // Paso B: Subir los bytes del archivo directamente a la URL de almacenamiento de Slack
          const uploadRes = await fetch(getUrlRes.upload_url, {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: buffer,
          });

          if (!uploadRes.ok) {
            throw new Error(`Error en subida binaria a Slack: ${uploadRes.statusText}`);
          }

          // Paso C: Confirmar a Slack la finalización de la subida
          const completeParams: Record<string, unknown> = {
            files: JSON.stringify([{ id: getUrlRes.file_id, title: title || file.name }]),
          };
          if (channelId && !channelId.startsWith('chan-') && !channelId.startsWith('mock-')) {
            completeParams.channel_id = channelId;
          }

          const completeRes = await slackApi<{
            ok: boolean;
            files?: Array<{
              id: string;
              title: string;
              url_private?: string;
              url_private_download?: string;
            }>;
            error?: string;
          }>('files.completeUploadExternal', completeParams, slackToken);

          const uploadedFile = completeRes.files?.[0];
          const fileId = uploadedFile?.id || getUrlRes.file_id;
          const privateUrl = uploadedFile?.url_private_download || uploadedFile?.url_private || '';

          const attachment: ChatAttachment = {
            id: fileId,
            name: file.name,
            size: buffer.byteLength,
            type: fileType,
            url: `/api/slack/files/${fileId}?url=${encodeURIComponent(privateUrl)}`,
            poster_url: posterUrl || undefined,
            mime_type: file.type,
          };

          return NextResponse.json({ ok: true, attachment, provider: 'slack' });
        }
      } catch (slackErr) {
        console.warn('Slack file upload failed, falling back to simulated mode:', slackErr);
      }
    }

    // 2. MODO SIMULADO / LOCAL: Si aún no se han configurado credenciales reales de Slack
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64}`;

    const attachment: ChatAttachment = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: buffer.byteLength,
      type: fileType,
      url: dataUrl,
      poster_url: posterUrl || undefined,
      mime_type: file.type,
    };

    return NextResponse.json({
      ok: true,
      attachment,
      provider: 'local_fallback',
      notice: 'Subida procesada en modo local. Configura SLACK_BOT_TOKEN en .env.local para enviar directamente a Slack.',
    });
  } catch (err: any) {
    console.error('Error procesando adjunto:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error interno al procesar el archivo adjunto' },
      { status: 500 }
    );
  }
}

