import { NextRequest, NextResponse } from 'next/server';
import { getBookByIdOrSlug } from '@/services/bookService';
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

  const book = await getBookByIdOrSlug(id);

  if (book) {
    return NextResponse.json({ source: 'database', book });
  }

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
  } catch (err) {
    console.error('[BookDetail] External fetch failed for', id, err);
  }

  return NextResponse.json(
    { error: 'Book not found', id },
    { status: 404 },
  );
}
