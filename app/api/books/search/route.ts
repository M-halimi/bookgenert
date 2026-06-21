import { NextRequest, NextResponse } from 'next/server';
import { searchBooks, upsertBook } from '@/services/bookService';
import { getCachedData, setCachedData, cacheKeyFor } from '@/lib/db/cache';
import { searchBooks as searchOpenLibrary } from '@/lib/openlibrary';
import { searchGoogleBooks } from '@/lib/googlebooks';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category') || undefined;
  const moodId = searchParams.get('mood') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  if (!q) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 },
    );
  }

  const cacheKey = cacheKeyFor('search', `${q}:${category ?? ''}:${moodId ?? ''}`);
  const cached = await getCachedData<{ source: string; total: number }>(cacheKey);

  const dbResults = await searchBooks(q, { category, moodId, limit, offset });

  if (dbResults.total >= limit) {
    return NextResponse.json({
      source: 'database',
      books: dbResults.books,
      total: dbResults.total,
      limit: dbResults.limit,
      offset: dbResults.offset,
      cached: !!cached,
    });
  }

  const needed = limit - dbResults.books.length;
  try {
    const [openLibBooks, googleBooks] = await Promise.all([
      searchOpenLibrary(q).catch(() => []),
      searchGoogleBooks(q).catch(() => []),
    ]);

    const externalBooks = [...openLibBooks, ...googleBooks]
      .slice(0, needed)
      .filter((b) => !dbResults.books.some((db) => db.title.toLowerCase() === b.title.toLowerCase()));

    let storedCount = 0;
    for (const ext of externalBooks) {
      const slug = slugify(ext.title).slice(0, 100) || ext.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

      let authorId: string | undefined;
      if (ext.author) {
        const { prisma } = await import('@/lib/prisma');
        const authorSlug = slugify(ext.author);
        const author = await prisma.author.upsert({
          where: { name: ext.author },
          update: {},
          create: { name: ext.author, slug: authorSlug },
        });
        authorId = author.id;
      }

      await upsertBook({
        slug,
        title: ext.title,
        description: 'description' in ext ? (ext as { description?: string }).description ?? null : null,
        coverImage: ext.coverUrl,
        category: 'category' in ext ? (ext as { category?: string }).category ?? category ?? null : category ?? null,
        source: ext.source ?? 'openlibrary',
        externalId: ext.id,
        authorId: authorId ?? null,
      });
      storedCount++;
    }

    const refreshed = await searchBooks(q, { category, moodId, limit, offset });

    await setCachedData(cacheKey, { source: 'external', total: refreshed.total }, 'search', 1800);

    return NextResponse.json({
      source: storedCount > 0 ? 'external+stored' : 'database',
      books: refreshed.books,
      total: refreshed.total,
      limit: refreshed.limit,
      offset: refreshed.offset,
      newBooksStored: storedCount,
    });
  } catch (err) {
    console.error('[BookSearch] External fetch failed:', err);
    return NextResponse.json({
      source: 'database',
      books: dbResults.books,
      total: dbResults.total,
      limit: dbResults.limit,
      offset: dbResults.offset,
      error: 'External search failed, showing database results',
    });
  }
}