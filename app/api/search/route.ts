import { NextRequest, NextResponse } from 'next/server';
import { expandQuery } from '@/lib/queryExpander';
import { searchGoogleBooks } from '@/lib/googlebooks';
import { searchArchive } from '@/lib/archive';
import { mergeAndRank, type RawBook } from '@/lib/searchAggregator';
import { searchBooks } from '@/lib/openlibrary';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const expanded = expandQuery(query);
    const queriesToRun = expanded.expanded_queries.slice(0, 4);

    const results = await Promise.allSettled(
      queriesToRun.map(async (q) => {
        const [ol, gb, ia] = await Promise.allSettled([
          searchBooks(q),
          searchGoogleBooks(q),
          searchArchive(q),
        ]);

        const olBooks = ol.status === 'fulfilled' ? ol.value.map(b => ({
          ...b, source: 'openlibrary' as const,
        })) : [];

        const gbBooks = gb.status === 'fulfilled' ? gb.value : [];
        const iaBooks = ia.status === 'fulfilled' ? ia.value : [];

        return [...olBooks, ...gbBooks, ...iaBooks];
      })
    );

    const allRaw: RawBook[] = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<RawBook[]>).value);

    if (allRaw.length === 0) {
      const fallbackResults = await searchGoogleBooks(query);
      const fallbackIA = await searchArchive(query);
      allRaw.push(...fallbackResults, ...fallbackIA);
    }

    const ranked = mergeAndRank(query, [allRaw]);

    const books = ranked.slice(0, 20).map(b => ({
      id: b.id,
      title: b.title,
      titleAr: b.title,
      titleFr: b.title,
      author: b.author,
      coverUrl: b.coverUrl ?? null,
      publishYear: b.publishYear ?? null,
      description: b.description ?? null,
      category: b.category ?? null,
      source: b.source ?? 'openlibrary',
    }));

    const bestMatch = books[0]
      ? {
          title: books[0].title,
          author: books[0].author,
          description: books[0].description,
          source: books[0].source,
          confidence_score: ranked[0]?.confidence_score || 0,
        }
      : null;

    return NextResponse.json({
      original_query: query,
      expanded_queries: expanded.expanded_queries,
      books,
      best_match: bestMatch,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        original_query: query,
        expanded_queries: [query],
        books: [],
        best_match: null,
        error: 'Failed to search books',
      },
      { status: 500 }
    );
  }
}
