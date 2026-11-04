import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';
import { requireActiveUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
    filename: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  try {
    const upstreamRes = await subtitulosClient.fetchFileResponse(params.id, params.filename);

    const headers = new Headers();
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition =
      upstreamRes.headers.get('content-disposition') ||
      `attachment; filename="${params.filename}"`;
    const contentLength = upstreamRes.headers.get('content-length');

    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    return new Response(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al descargar el archivo' },
      { status }
    );
  }
}
