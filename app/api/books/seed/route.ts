import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedBookFromExternal } from '@/lib/db/books';
import { syncMoodsToDb } from '@/lib/db/moods';
import { fetchSeedBooks } from '@/lib/seed/fetcher';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!validateApiKey(apiKey)) {
    return unauthorizedResponse('Valid API key required for seeding');
  }

  const body = await request.json().catch(() => ({}));
  const source = (body.source as string) || 'all';

  const sources: ('googlebooks' | 'openlibrary')[] =
    source === 'googlebooks' ? ['googlebooks'] :
    source === 'openlibrary' ? ['openlibrary'] :
    ['googlebooks', 'openlibrary'];

  try {
    const seedResult = await fetchSeedBooks({ sources });

    await syncMoodsToDb();

    let stored = 0;
    let skipped = 0;

    for (const sBook of seedResult.books) {
      const slug = sBook.id;
      const existing = await prisma.book.findUnique({ where: { slug } });
      if (existing) {
        skipped++;
        continue;
      }

      await seedBookFromExternal({
        title: sBook.title,
        author: sBook.author,
        description: sBook.description,
        coverUrl: sBook.coverUrl,
        category: sBook.category,
        source: sBook.source,
        externalId: slug,
        slug,
        publishYear: sBook.publishYear,
        pageCount: sBook.pageCount,
        language: sBook.language,
      });
      stored++;
    }

    return NextResponse.json({
      success: true,
      total: seedResult.total,
      stored,
      skipped,
      source,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Seed failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!validateApiKey(apiKey)) {
    return unauthorizedResponse('Valid API key required');
  }

  const totalBooks = await prisma.book.count();
  const totalAuthors = await prisma.author.count();
  const totalMoods = await prisma.mood.count();
  const totalBookMoods = await prisma.bookMood.count();
  const totalCache = await prisma.apiCache.count();

  return NextResponse.json({
    database: {
      books: totalBooks,
      authors: totalAuthors,
      moods: totalMoods,
      moodAssignments: totalBookMoods,
      cacheEntries: totalCache,
    },
    status: totalBooks > 0 ? 'seeded' : 'empty',
  });
}
