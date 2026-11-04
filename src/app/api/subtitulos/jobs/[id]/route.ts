import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';
import { requireActiveUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  try {
    const job = await subtitulosClient.getJob(params.id);
    return NextResponse.json(job);
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado del trabajo' },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  try {
    await subtitulosClient.deleteJob(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el trabajo' },
      { status }
    );
  }
}
