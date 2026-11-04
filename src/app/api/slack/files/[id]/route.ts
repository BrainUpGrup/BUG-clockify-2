import { NextRequest, NextResponse } from 'next/server';
import { slackApi, getBotInstallation } from '@/lib/slack/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    const url = req.nextUrl.searchParams.get('url');
    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    let slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      try {
        const install = await getBotInstallation();
        slackToken = install?.token;
      } catch {
        slackToken = undefined;
      }
    }

    let downloadUrl: string | null | undefined = url;

    // Si no vino la URL directa por parámetro, consultar a la API de Slack info del archivo
    if (!downloadUrl && slackToken && fileId) {
      try {
        const fileInfo = await slackApi<{
          ok: boolean;
          file?: {
            name: string;
            url_private_download?: string;
            url_private?: string;
            mimetype?: string;
          };
        }>('files.info', { file: fileId }, slackToken);

        if (fileInfo.ok && fileInfo.file) {
          downloadUrl = fileInfo.file.url_private_download || fileInfo.file.url_private;
        }
      } catch (err) {
        console.warn('Error obteniendo info de archivo en Slack:', err);
      }
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Archivo no encontrado o no se ha especificado la URL de descarga' },
        { status: 404 }
      );
    }

    // Si la URL es una data URL en base64 (modo local/simulado)
    if (downloadUrl.startsWith('data:')) {
      const [header, base64Data] = downloadUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const buffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Content-Length': String(buffer.byteLength),
          'Content-Disposition': isDownload
            ? `attachment; filename="adjunto_${fileId}"`
            : 'inline',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    // Petición autenticada a Slack con el Bearer Token
    const res = await fetch(downloadUrl, {
      headers: slackToken ? { Authorization: `Bearer ${slackToken}` } : {},
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error de Slack al recuperar el archivo: ${res.statusText}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = res.headers.get('content-length');
    const body = res.body;

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    if (isDownload) {
      responseHeaders['Content-Disposition'] = `attachment; filename="slack_file_${fileId}"`;
    } else {
      responseHeaders['Content-Disposition'] = 'inline';
    }

    return new NextResponse(body as any, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('Error en proxy de archivos Slack:', err);
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor en el proxy de archivos' },
      { status: 500 }
    );
  }
}
