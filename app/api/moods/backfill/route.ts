import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { books } = await request.json();

    if (!Array.isArray(books) || books.length === 0) {
      return NextResponse.json({ error: 'books array is required' }, { status: 400 });
    }

    const { classifyByMetadata } = await import('@/lib/mood-classifier');
    const moodsLib = await import('@/lib/moods');
    const { MOODS, MOOD_SCORE_THRESHOLD } = moodsLib;
    const { computeSeedMapping } = await import('@/lib/mood-seed');

    const seedMap = computeSeedMapping();
    const moodBooks: Record<string, { slug: string; title: string; score: number }[]> = {};

    for (const mood of MOODS) {
      moodBooks[mood.id] = [];
    }

    const processed = new Set<string>();

    for (const book of books) {
      if (!book.slug || processed.has(book.slug)) continue;
      processed.add(book.slug);

      let moods = [] as { mood: string; score: number }[];

      if (seedMap[book.slug]) {
        moods = seedMap[book.slug].moods;
      } else {
        moods = classifyByMetadata({
          title: book.title,
          author: book.author,
          category: book.category,
          description: book.description,
        }).filter(m => m.score >= MOOD_SCORE_THRESHOLD);
      }

      if (moods.length === 0) {
        moods = classifyByMetadata({ title: book.title, category: book.category })
          .map(m => ({ ...m, score: Math.min(100, m.score + 10) }))
          .filter(m => m.score >= MOOD_SCORE_THRESHOLD);
      }

      for (const sm of moods) {
        if (sm.score >= MOOD_SCORE_THRESHOLD) {
          moodBooks[sm.mood].push({ slug: book.slug, title: book.title, score: sm.score });
        }
      }
    }

    const underfilled = MOODS.filter(m => (moodBooks[m.id]?.length || 0) < 20);

    for (const mood of underfilled) {
      const mid = mood.id;
      const needed = 20 - (moodBooks[mid]?.length || 0);
      if (needed <= 0) continue;

      const candidates = books
        .filter(b => !moodBooks[mid].some(mb => mb.slug === b.slug))
        .map(b => {
          const meta = classifyByMetadata({ title: b.title, category: b.category });
          const match = meta.find(m => m.mood === mid);
          return { slug: b.slug, title: b.title, score: match?.score || 0 };
        })
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

      for (const candidate of candidates) {
        if (moodBooks[mid].length >= 20) break;
        moodBooks[mid].push(candidate);
      }
    }

    const counts: Record<string, number> = {};
    for (const mood of MOODS) {
      counts[mood.id] = moodBooks[mood.id]?.length || 0;
    }

    return NextResponse.json({
      counts,
      underfilled: underfilled.map(m => ({ id: m.id, label: m.label, count: moodBooks[m.id]?.length || 0 })),
      totalClassified: processed.size,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Backfill failed', details: String(err) }, { status: 500 });
  }
}
