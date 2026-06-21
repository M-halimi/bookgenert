import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  try {
    const where: Record<string, unknown> = {
      generationStatus: 'completed',
      episodes: { not: null },
    };
    if (category) where.category = category;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          tagline: true,
          coverImage: true,
          category: true,
          language: true,
          authorId: true,
          source: true,
          generationStatus: true,
          createdAt: true,
          author: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.book.count({ where }),
    ]);

    const mapped = books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      description: b.description,
      tagline: b.tagline,
      coverUrl: b.coverImage,
      category: b.category,
      language: b.language,
      author: b.author?.name || 'AI Generated',
      source: b.source,
      generatedAt: b.createdAt.toISOString(),
    }));

    return NextResponse.json({
      books: mapped,
      total,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDbError = message.includes('Can\'t reach database') ||
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
