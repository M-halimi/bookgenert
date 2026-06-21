import { NextRequest, NextResponse } from 'next/server';
import { getBookContent } from '@/services/bookService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const book = await getBookContent(slug);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDbError = message.includes("Can't reach database") ||
      message.includes('Authentication') ||
      message.includes('connect ECONNREFUSED') ||
      message.includes('getaddrinfo') ||
      message.includes('Prisma');
    const dbUrl = (process.env.DATABASE_URL || '').replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@');
    console.error('Book content fetch error:', {
      error: message,
      slug,
      isDbError,
      database_url: isDbError ? dbUrl : undefined,
      node_env: process.env.NODE_ENV,
    });
    return NextResponse.json(
      {
        error: isDbError
          ? 'Database connection unavailable. Check DATABASE_URL configuration in Vercel Dashboard.'
          : 'Failed to fetch book content',
        _debug: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}