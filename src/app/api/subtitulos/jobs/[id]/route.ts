import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
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

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
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
