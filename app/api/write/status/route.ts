import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const job = await prisma.bookGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      title: job.title,
      status: job.status,
      progress: job.progress,
      totalSteps: job.totalSteps,
      errorMessage: job.errorMessage,
      estimatedCompletionAt: job.estimatedCompletionAt,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
