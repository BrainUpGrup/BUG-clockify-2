import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';
import { SubtitulosCorrection } from '@/types/subtitulos';
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
    const reviewData = await subtitulosClient.getReview(params.id);
    return NextResponse.json(reviewData);
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al obtener la revisión del trabajo' },
      { status }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { errorResponse } = await requireActiveUser(req);
  if (errorResponse) return errorResponse;

  try {
    const corrections = (await req.json()) as SubtitulosCorrection[];
    const updatedJob = await subtitulosClient.updateReview(params.id, corrections);
    return NextResponse.json(updatedJob);
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al guardar la revisión' },
      { status }
    );
  }
}
