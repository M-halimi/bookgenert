import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export type BookWithMoods = Prisma.BookGetPayload<{
  include: {
    author: true;
    moods: { include: { mood: true } };
  };
}>;

export type BookWithAuthor = Prisma.BookGetPayload<{
  include: { author: true };
}>;

export interface CreateBookInput {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  summary?: string | null;
  tagline?: string | null;
  coverImage?: string | null;
  category?: string | null;
  language?: string;
  pageCount?: number | null;
  publishYear?: number | null;
  source?: string;
  externalId?: string | null;
  episodes?: unknown;
  authorId?: string | null;
}

export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: {
      author: true,
      moods: { include: { mood: true } },
    },
  });
}

export async function getBookBySlug(slug: string) {
  return prisma.book.findUnique({
    where: { slug },
    include: {
      author: true,
      moods: { include: { mood: true } },
    },
  });
}

export async function searchBooks(query: string, options?: {
  category?: string;
  moodId?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, moodId, limit = 20, offset = 0 } = options ?? {};

  const where: Prisma.BookWhereInput = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { author: { name: { contains: query, mode: 'insensitive' } } },
    ],
  };

  if (category && category !== 'All') {
    where.category = category;
  }

  if (moodId) {
    where.moods = { some: { moodId } };
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        author: true,
        moods: { include: { mood: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total, limit, offset };
}

export async function getBooksByMood(moodId: string, options?: {
  limit?: number;
  offset?: number;
  minScore?: number;
}) {
  const { limit = 20, offset = 0, minScore = 70 } = options ?? {};

  const where: Prisma.BookMoodWhereInput = {
    moodId,
    score: { gte: minScore },
  };

  const [bookMoods, total] = await Promise.all([
    prisma.bookMood.findMany({
      where,
      include: {
        book: {
          include: { author: true, moods: { include: { mood: true } } },
        },
      },
      orderBy: { score: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.bookMood.count({ where }),
  ]);

  return {
    books: bookMoods.map((bm) => ({ ...bm.book, moodScore: bm.score })),
    total,
    limit,
    offset,
  };
}

export async function upsertBook(data: CreateBookInput) {
  const base = {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle ?? null,
    description: data.description ?? null,
    summary: data.summary ?? null,
    tagline: data.tagline ?? null,
    coverImage: data.coverImage ?? null,
    category: data.category ?? null,
    language: data.language ?? 'en',
    pageCount: data.pageCount ?? null,
    publishYear: data.publishYear ?? null,
    source: data.source ?? 'manual',
    externalId: data.externalId ?? null,
    episodes: data.episodes ?? undefined,
  };

  return prisma.book.upsert({
    where: { slug: data.slug },
    update: {
      ...base,
      ...(data.authorId ? { author: { connect: { id: data.authorId } } } : {}),
    },
    create: {
      ...base,
      ...(data.authorId ? { author: { connect: { id: data.authorId } } } : {}),
    },
    include: {
      author: true,
      moods: { include: { mood: true } },
    },
  });
}

export async function upsertBooks(data: CreateBookInput[]) {
  const results = [];
  for (const book of data) {
    const result = await upsertBook(book);
    results.push(result);
  }
  return results;
}

export async function assignMoodToBook(
  bookId: string,
  moodId: string,
  score: number,
  source: string = 'ai',
) {
  return prisma.bookMood.upsert({
    where: { bookId_moodId: { bookId, moodId } },
    update: { score, source },
    create: { bookId, moodId, score, source },
  });
}

export async function bulkAssignMoods(
  bookId: string,
  moods: Array<{ moodId: string; score: number }>,
  source: string = 'ai',
) {
  const operations = moods
    .filter((m) => m.score >= 70)
    .map((m) => ({
      where: { bookId_moodId: { bookId, moodId: m.moodId } },
      update: { score: m.score, source },
      create: { bookId, moodId: m.moodId, score: m.score, source },
    }));

  const results = [];
  for (const op of operations) {
    const result = await prisma.bookMood.upsert(op);
    results.push(result);
  }

  if (moods.length > 0) {
    await prisma.book.update({
      where: { id: bookId },
      data: { moodAnalyzed: true },
    });
  }

  return results;
}

export async function getBooksNeedingMoodAnalysis(limit = 50) {
  return prisma.book.findMany({
    where: { moodAnalyzed: false, description: { not: null } },
    take: limit,
    include: { author: true },
  });
}

export async function getPopularBooks(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, limit = 20, offset = 0 } = options ?? {};

  const where: Prisma.BookWhereInput = {};
  if (category && category !== 'All') {
    where.category = category;
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        author: true,
        moods: { include: { mood: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total, limit, offset };
}

export async function seedBookFromExternal(data: {
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  category: string;
  source: string;
  externalId: string;
  slug: string;
  publishYear?: number | null;
  pageCount?: number | null;
  language?: string;
}) {
  const author = await prisma.author.upsert({
    where: { name: data.author },
    update: {},
    create: {
      name: data.author,
      slug: data.author.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    },
  });

  return upsertBook({
    slug: data.slug,
    title: data.title,
    description: data.description,
    coverImage: data.coverUrl,
    category: data.category,
    source: data.source,
    externalId: data.externalId,
    publishYear: data.publishYear ?? undefined,
    pageCount: data.pageCount ?? undefined,
    language: data.language ?? 'en',
    authorId: author.id,
  });
}

export async function deleteBook(id: string) {
  return prisma.book.delete({ where: { id } });
}
