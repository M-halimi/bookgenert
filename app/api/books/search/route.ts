import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchBooks } from '@/lib/db/books';
import { getCachedData, setCachedData, cacheKeyFor } from '@/lib/db/cache';
import { searchBooks as searchOpenLibrary } from '@/lib/openlibrary';
import { searchGoogleBooks } from '@/lib/googlebooks';

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

  // 1. Check cache for external results
  const cacheKey = cacheKeyFor('search', `${q}:${category ?? ''}:${moodId ?? ''}`);
  const cached = await getCachedData<{ source: string; total: number }>(cacheKey);

  // 2. Search database first
  const dbResults = await searchBooks(q, { category, moodId, limit, offset });

  // 3. If DB has enough results, return them
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

  // 4. Fallback to external APIs if not enough results
  const needed = limit - dbResults.books.length;
  try {
    const [openLibBooks, googleBooks] = await Promise.all([
      searchOpenLibrary(q).catch(() => []),
      searchGoogleBooks(q).catch(() => []),
    ]);

    const externalBooks = [...openLibBooks, ...googleBooks]
      .slice(0, needed)
      .filter((b) => !dbResults.books.some((db) => db.title.toLowerCase() === b.title.toLowerCase()));

    // Store new books in database
    let storedCount = 0;
    for (const ext of externalBooks) {
      const slug = ext.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);

      const existing = await prisma.book.findUnique({ where: { slug } });
      if (existing) continue;

      let authorId: string | undefined;
      if (ext.author) {
        const authorSlug = ext.author.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const author = await prisma.author.upsert({
          where: { name: ext.author },
          update: {},
          create: { name: ext.author, slug: authorSlug },
        });
        authorId = author.id;
      }

      await prisma.book.create({
        data: {
          slug,
          title: ext.title,
          description: 'description' in ext ? (ext as { description?: string }).description ?? null : null,
          coverImage: ext.coverUrl,
          category: 'category' in ext ? (ext as { category?: string }).category ?? category ?? null : category ?? null,
          source: ext.source ?? 'openlibrary',
          externalId: ext.id,
          authorId: authorId ?? null,
        },
      });
      storedCount++;
    }

    // Refresh from DB
    const refreshed = await searchBooks(q, { category, moodId, limit, offset });

    // Cache the result
    await setCachedData(cacheKey, { source: 'external', total: refreshed.total }, 'search', 1800);

    return NextResponse.json({
      source: storedCount > 0 ? 'external+stored' : 'database',
      books: refreshed.books,
      total: refreshed.total,
      limit: refreshed.limit,
      offset: refreshed.offset,
      newBooksStored: storedCount,
    });
  } catch {
    // Return whatever we have from DB
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
