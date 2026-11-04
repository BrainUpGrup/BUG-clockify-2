import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';
import { requireActiveUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  try {
    const job = await subtitulosClient.retryJob(params.id);
    return NextResponse.json(job, { status: 202 });
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al reintentar el trabajo' },
      { status }
    );
  }
}
