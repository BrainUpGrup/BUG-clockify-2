import { NextRequest, NextResponse } from 'next/server';
import { subtitulosClient, SubtitulosApiError } from '@/lib/subtitulos-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jobs = await subtitulosClient.listJobs();
    return NextResponse.json(jobs);
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al listar trabajos de subtítulos' },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const job = await subtitulosClient.createJob(formData);
    return NextResponse.json(job, { status: 202 });
  } catch (error: any) {
    const status = error instanceof SubtitulosApiError ? error.status : 500;
    return NextResponse.json(
      { error: error.message || 'Error al crear trabajo de subtitulado' },
      { status }
    );
  }
}
