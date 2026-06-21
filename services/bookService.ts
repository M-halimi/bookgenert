import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { checkBookCache, saveGeneratedBook, trackAnalytics } from '@/lib/cache-manager';
import { getCache } from '@/lib/ai/cache';
import { findExactOrSimilarBook, saveBookEmbedding } from '@/lib/embeddings';
import type { BookEpisodes } from '@/lib/groq';
import type { Prisma } from '@prisma/client';

export type BookWithRelations = Prisma.BookGetPayload<{
  include: {
    author: true;
    chapters: { orderBy: { chapterNumber: 'asc' } };
    bookSummary: true;
    embedding: true;
    moods: { include: { mood: true } };
  };
}>;

export type BookListItem = Prisma.BookGetPayload<{
  include: {
    author: { select: { name: true } };
  };
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

export interface BookSearchOptions {
  category?: string;
  moodId?: string;
  limit?: number;
  offset?: number;
}

export interface BookContent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  coverPrompt: string | null;
  category: string | null;
  author: string;
  episodes: Record<string, unknown> | null;
  chapters: Array<{
    number: number;
    title: unknown;
    content: unknown;
    hook: unknown;
    keyTakeaway: unknown;
    keyIdeas: unknown;
    actionableTips: unknown;
    importantQuotes: unknown;
    practicalExamples: unknown;
    cliffhanger: unknown;
    summary: unknown;
    wordCount: number | null;
  }>;
  finalSummary: string | null;
  mainConcepts: unknown;
  keyLessons: unknown;
  keyInsights: unknown;
  implementationGuide: string | null;
  summary: unknown;
  generationStatus: string;
  createdAt: string;
}

async function findBook(where: Prisma.BookWhereUniqueInput) {
  return prisma.book.findUnique({
    where,
    include: {
      author: true,
      moods: { include: { mood: true } },
    },
  });
}

export async function getBookById(id: string) {
  return findBook({ id });
}

export async function getBookBySlug(slug: string) {
  return findBook({ slug });
}

export async function getBookByIdOrSlug(idOrSlug: string) {
  let book = await getBookBySlug(idOrSlug);
  if (!book) book = await getBookById(idOrSlug);
  return book;
}

export async function getBookContent(slug: string): Promise<BookContent | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    include: {
      chapters: { orderBy: { chapterNumber: 'asc' } },
      bookSummary: true,
      embedding: true,
      author: { select: { name: true } },
    },
  });

  if (!book) return null;

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    description: book.description,
    tagline: book.tagline,
    coverImage: book.coverImage,
    coverPrompt: book.coverPrompt,
    category: book.category,
    author: book.author?.name || 'AI Generated',
    episodes: book.episodes as Record<string, unknown> | null,
    chapters: book.chapters.map((ch) => ({
      number: ch.chapterNumber,
      title: ch.title,
      content: ch.content,
      hook: ch.hook,
      keyTakeaway: ch.keyTakeaway,
      keyIdeas: ch.keyIdeas,
      actionableTips: ch.actionableTips,
      importantQuotes: ch.importantQuotes,
      practicalExamples: ch.practicalExamples,
      cliffhanger: ch.cliffhanger,
      summary: ch.summary,
      wordCount: ch.wordCount,
    })),
    finalSummary: book.finalSummary,
    mainConcepts: book.mainConcepts,
    keyLessons: book.keyLessons,
    keyInsights: book.keyInsights,
    implementationGuide: book.implementationGuide,
    summary: book.bookSummary,
    generationStatus: book.generationStatus,
    createdAt: book.createdAt.toISOString(),
  };
}

export async function searchBooks(query: string, options?: BookSearchOptions) {
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

export async function getLibrary(options: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, limit = 50, offset = 0 } = options;

  const where: Prisma.BookWhereInput = {
    generationStatus: 'completed',
  };
  if (category) where.category = category;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        tagline: true,
        coverImage: true,
        category: true,
        language: true,
        authorId: true,
        source: true,
        generationStatus: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.book.count({ where }),
  ]);

  const mapped = books.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: b.description,
    tagline: b.tagline,
    coverUrl: b.coverImage,
    category: b.category,
    language: b.language,
    author: b.author?.name || 'AI Generated',
    source: b.source,
    generatedAt: b.createdAt.toISOString(),
  }));

  return { books: mapped, total, limit, offset };
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
    total, limit, offset,
  };
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

export async function upsertBook(data: CreateBookInput) {
  const base: Prisma.BookCreateInput = {
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

  const updateData: Prisma.BookUpdateInput = {
    ...base,
    ...(data.authorId ? { author: { connect: { id: data.authorId } } } : {}),
  };
  const createData: Prisma.BookCreateInput = {
    ...base,
    ...(data.authorId ? { author: { connect: { id: data.authorId } } } : {}),
  };

  return prisma.book.upsert({
    where: { slug: data.slug },
    update: updateData,
    create: createData,
    include: {
      author: true,
      moods: { include: { mood: true } },
    },
  });
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
      slug: slugify(data.author),
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

export async function assignMoodToBook(
  bookId: string,
  moodId: string,
  score: number,
  source = 'ai',
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
  source = 'ai',
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

export async function deleteBook(id: string) {
  return prisma.book.delete({ where: { id } });
}

export async function checkCache(title: string, author?: string) {
  return checkBookCache(title, author);
}

export async function generateAndSave(
  title: string,
  author: string | undefined,
  data: BookEpisodes & {
    description?: string;
    coverPrompt?: string;
    chapters?: unknown[];
    generationTimeMs?: number;
    aiModelUsed?: string;
    aiProvider?: string;
  },
) {
  return saveGeneratedBook(title, author, data);
}

export async function findSimilar(title: string) {
  return findExactOrSimilarBook(title);
}

export {
  saveBookEmbedding,
  trackAnalytics,
  getCache,
};
