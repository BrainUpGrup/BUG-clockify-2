import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const job = await subtitulosClient.approveJob(params.id);
    return NextResponse.json(job, { status: 202 });
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al aprobar la revisión' },
      { status }
    );
  }
}
