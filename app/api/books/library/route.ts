import { NextRequest, NextResponse } from 'next/server';
import { getLibrary } from '@/services/bookService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? undefined;
  const lang = searchParams.get('lang') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  try {
    const result = await getLibrary({ category, limit, offset, lang });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDbError = message.includes("Can't reach database") ||
      message.includes('Authentication') ||
      message.includes('connect ECONNREFUSED') ||
      message.includes('getaddrinfo') ||
      message.includes('Prisma');
    const dbUrl = (process.env.DATABASE_URL || '').replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@');
    console.error('Library fetch error:', {
      error: message,
      isDbError,
      database_url: isDbError ? dbUrl : undefined,
      node_env: process.env.NODE_ENV,
    });
    return NextResponse.json(
      {
        error: isDbError
          ? 'Database connection unavailable. Check DATABASE_URL configuration in Vercel Dashboard.'
          : 'Failed to fetch library',
        _debug: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
