import { NextRequest, NextResponse } from 'next/server';
import { getBookBySlug, getBookById } from '@/lib/db/books';
import { getCachedData, setCachedData, cacheKeyFor } from '@/lib/db/cache';
import { getBookDetails } from '@/lib/openlibrary';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
  }

  // 1. Try database by slug first, then by UUID
  let book = await getBookBySlug(id);
  if (!book) {
    book = await getBookById(id);
  }

  if (book) {
    return NextResponse.json({ source: 'database', book });
  }

  // 2. Fallback to external API
  const cacheKey = cacheKeyFor('book-detail', id);
  const cached = await getCachedData<{ source: string }>(cacheKey);

  if (cached) {
    return NextResponse.json({ source: 'cache', book: cached });
  }

  try {
    const external = await getBookDetails(id);
    if (external) {
      await setCachedData(cacheKey, { source: 'external', ...external }, 'openlibrary', 3600);
      return NextResponse.json({
        source: 'external',
        book: {
          slug: id,
          title: external.title,
          author: external.author,
          coverImage: external.coverUrl,
          publishYear: external.publishYear,
        },
      });
    }
  } catch {
    // External fetch failed
  }

  return NextResponse.json(
    { error: 'Book not found', id },
    { status: 404 },
  );
}
