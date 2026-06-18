import { prisma } from '@/lib/prisma';
import { MOODS } from '@/lib/moods';
import type { ScoredMood } from '@/lib/moods';

export async function syncMoodsToDb() {
  for (const mood of MOODS) {
    await prisma.mood.upsert({
      where: { id: mood.id },
      update: {
        label: mood.label,
        emoji: mood.emoji,
        description: mood.description,
        color: mood.color,
        keywords: mood.keywords,
        relatedMoods: mood.relatedMoods,
        aiRules: mood.aiRules,
      },
      create: {
        id: mood.id,
        label: mood.label,
        emoji: mood.emoji,
        description: mood.description,
        color: mood.color,
        keywords: mood.keywords,
        relatedMoods: mood.relatedMoods,
        aiRules: mood.aiRules,
      },
    });
  }
}

export async function getAllMoods() {
  const moods = await prisma.mood.findMany({
    orderBy: { label: 'asc' },
    include: {
      _count: { select: { books: true } },
    },
  });

  return moods.map((m) => ({
    ...m,
    bookCount: m._count.books,
    _count: undefined,
  }));
}

export async function getMoodById(id: string) {
  return prisma.mood.findUnique({
    where: { id },
    include: {
      _count: { select: { books: true } },
    },
  });
}

export async function getMoodCounts() {
  const moods = await prisma.mood.findMany({
    select: {
      id: true,
      label: true,
      emoji: true,
      color: true,
      _count: { select: { books: true } },
    },
  });

  const counts: Record<string, { label: string; emoji: string; color: string; count: number }> = {};
  for (const m of moods) {
    counts[m.id] = {
      label: m.label,
      emoji: m.emoji,
      color: m.color,
      count: m._count.books,
    };
  }
  return counts;
}

export async function getBooksForMood(
  moodId: string,
  options?: { limit?: number; offset?: number; minScore?: number },
) {
  const { limit = 20, offset = 0, minScore = 70 } = options ?? {};

  const [bookMoods, total] = await Promise.all([
    prisma.bookMood.findMany({
      where: { moodId, score: { gte: minScore } },
      include: {
        book: {
          include: { author: true },
        },
      },
      orderBy: { score: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.bookMood.count({
      where: { moodId, score: { gte: minScore } },
    }),
  ]);

  return {
    books: bookMoods.map((bm) => ({ ...bm.book, moodScore: bm.score })),
    total,
    limit,
    offset,
  };
}

export async function saveMoodClassification(
  bookId: string,
  moods: ScoredMood[],
  source: string = 'ai',
) {
  const results = [];

  for (const sm of moods) {
    if (sm.score >= 70) {
      const result = await prisma.bookMood.upsert({
        where: { bookId_moodId: { bookId, moodId: sm.mood } },
        update: { score: sm.score, source },
        create: { bookId, moodId: sm.mood, score: sm.score, source },
      });
      results.push(result);
    }
  }

  await prisma.book.update({
    where: { id: bookId },
    data: { moodAnalyzed: true },
  });

  return results;
}

export async function getMoodStats() {
  const [totalBooks, totalBookMoods, moodsWithCounts] = await Promise.all([
    prisma.book.count(),
    prisma.bookMood.groupBy({
      by: ['moodId'],
      _avg: { score: true },
      _count: true,
    }),
    prisma.mood.findMany({
      select: {
        id: true,
        label: true,
        emoji: true,
        color: true,
        _count: { select: { books: true } },
      },
    }),
  ]);

  const moodMap: Record<string, {
    label: string;
    emoji: string;
    color: string;
    bookCount: number;
    avgScore: number | null;
  }> = {};

  for (const m of moodsWithCounts) {
    moodMap[m.id] = {
      label: m.label,
      emoji: m.emoji,
      color: m.color,
      bookCount: m._count.books,
      avgScore: null,
    };
  }

  for (const bm of totalBookMoods) {
    if (moodMap[bm.moodId]) {
      moodMap[bm.moodId].avgScore = Math.round(bm._avg.score ?? 0);
    }
  }

  return {
    totalBooks,
    totalClassifications: totalBookMoods.reduce((sum, g) => sum + g._count, 0),
    moods: moodMap,
  };
}
