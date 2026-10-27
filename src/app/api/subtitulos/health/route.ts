import { NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await subtitulosClient.getHealth();
    return NextResponse.json(health);
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 503;
    return NextResponse.json(
      {
        status: 'unreachable',
        error: error.message || 'La API de subtítulos no está disponible',
      },
      { status }
    );
  }
}
