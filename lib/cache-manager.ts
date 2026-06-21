/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { findExactOrSimilarBook, saveBookEmbedding } from '@/lib/embeddings';
import { slugify } from '@/lib/utils';
import type { BookEpisodes } from '@/lib/groq';

export interface CacheCheckResult {
  hit: boolean;
  data?: BookEpisodes & {
    id: string;
    slug: string;
    chapters?: any[];
    finalSummary?: string;
    mainConcepts?: any;
    keyLessons?: any;
    keyInsights?: any;
    implementationGuide?: string;
  };
  similarity?: number;
  cachedBookId?: string;
}

export async function checkBookCache(
  title: string,
  author?: string
): Promise<CacheCheckResult> {
  const cacheKey = `book:${slugify(title)}:${slugify(author || '')}`;

  const cacheEntry = await prisma.bookCache.findUnique({
    where: { cacheKey },
  });

  if (cacheEntry && cacheEntry.expiresAt > new Date()) {
    await prisma.bookCache.update({
      where: { id: cacheEntry.id },
      data: { hitCount: { increment: 1 } },
    });

    return {
      hit: true,
      data: cacheEntry.data as any,
      cachedBookId: cacheEntry.bookId || undefined,
    };
  }

  const book = await prisma.book.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      generationStatus: 'completed',
    },
    include: {
      chapters: { orderBy: { chapterNumber: 'asc' } },
      embedding: true,
    },
  });

  if (book && book.episodes) {
    const chapters = book.chapters.map(ch => ({
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
    }));

    const result: any = { ...(book.episodes as Record<string, unknown>) };
    result.id = book.id;
    result.slug = book.slug;
    result.chapters = chapters;
    result.finalSummary = book.finalSummary;
    result.mainConcepts = book.mainConcepts;
    result.keyLessons = book.keyLessons;
    result.keyInsights = book.keyInsights;
    result.implementationGuide = book.implementationGuide;
    result.description = book.description;
    result.coverPrompt = book.coverPrompt;

    await updateCacheEntry(cacheKey, title, book.id, result);

    return { hit: true, data: result, cachedBookId: book.id };
  }

  const similar = await findExactOrSimilarBook(title);
  if (similar) {
    const similarBook = await prisma.book.findUnique({
      where: { id: similar.bookId },
      include: {
        chapters: { orderBy: { chapterNumber: 'asc' } },
      },
    });

    if (similarBook && similarBook.episodes) {
      const chapters = similarBook.chapters.map(ch => ({
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
      }));

      const result: any = { ...(similarBook.episodes as Record<string, unknown>) };
      result.id = similarBook.id;
      result.slug = similarBook.slug;
      result.chapters = chapters;
      result.finalSummary = similarBook.finalSummary;
      result.mainConcepts = similarBook.mainConcepts;
      result.keyLessons = similarBook.keyLessons;
      result.keyInsights = similarBook.keyInsights;
      result.implementationGuide = similarBook.implementationGuide;
      result.description = similarBook.description;
      result.coverPrompt = similarBook.coverPrompt;

      await updateCacheEntry(cacheKey, title, similarBook.id, result);

      return {
        hit: true,
        data: result,
        similarity: similar.similarity,
        cachedBookId: similar.bookId,
      };
    }
  }

  return { hit: false };
}

export async function saveGeneratedBook(
  title: string,
  author: string | undefined,
  data: BookEpisodes & {
    description?: string;
    coverPrompt?: string;
    chapters?: any[];
    generationTimeMs?: number;
    aiModelUsed?: string;
    aiProvider?: string;
  }
): Promise<{ bookId: string; slug: string }> {
  const slug = slugify(title);
  const cacheKey = `book:${slug}:${slugify(author || '')}`;

  const book = await prisma.book.upsert({
    where: { slug },
    update: {
      title,
      description: typeof data.description === 'string' ? data.description : null,
      tagline: data.tagline?.en || null,
      titleI18n: (data.title || { en: title }) as any,
      descriptionI18n: (typeof data.description === 'string' ? { en: data.description } : null) as any,
      taglineI18n: (data.tagline || null) as any,
      category: data.category || null,
      episodes: data as any,
      mainConcepts: (data.mainConcepts || null) as any,
      keyLessons: (data.keyLessons || null) as any,
      keyInsights: (data.keyInsights || null) as any,
      implementationGuide: data.implementationGuide?.en || null,
      generationTimeMs: data.generationTimeMs || null,
      aiModelUsed: data.aiModelUsed || null,
      aiProvider: data.aiProvider || null,
      generationStatus: 'completed',
      cacheHit: false,
    },
    create: {
      slug,
      title,
      description: typeof data.description === 'string' ? data.description : null,
      tagline: data.tagline?.en || null,
      titleI18n: (data.title || { en: title }) as any,
      descriptionI18n: (typeof data.description === 'string' ? { en: data.description } : null) as any,
      taglineI18n: (data.tagline || null) as any,
      category: data.category || null,
      episodes: data as any,
      mainConcepts: (data.mainConcepts || null) as any,
      keyLessons: (data.keyLessons || null) as any,
      keyInsights: (data.keyInsights || null) as any,
      implementationGuide: data.implementationGuide?.en || null,
      generationTimeMs: data.generationTimeMs || null,
      aiModelUsed: data.aiModelUsed || null,
      aiProvider: data.aiProvider || null,
      generationStatus: 'completed',
      cacheHit: false,
    },
  });

  const chapters = data.chapters || data.episodes || [];
  if (chapters.length > 0) {
    const chapterData = chapters.map((ch: any, idx: number) => ({
      bookId: book.id,
      chapterNumber: ch.number || idx + 1,
      title: ch.title || {},
      content: ch.content || {},
      hook: ch.hook || null,
      keyTakeaway: ch.keyTakeaway || null,
      keyIdeas: ch.keyIdeas || null,
      actionableTips: ch.actionableTips || null,
      importantQuotes: ch.importantQuotes || null,
      practicalExamples: ch.practicalExamples || null,
      cliffhanger: ch.cliffhanger || null,
      summary: ch.summary || null,
      wordCount: ch.wordCount || null,
    }));

    for (const ch of chapterData) {
      await prisma.bookChapter.upsert({
        where: {
          bookId_chapterNumber: { bookId: book.id, chapterNumber: ch.chapterNumber },
        },
        update: ch,
        create: ch,
      });
    }
  }

  if (data.finalSummary) {
    await prisma.bookSummary.upsert({
      where: { bookId: book.id },
      update: {
        shortSummary: (data.description || data.finalSummary) as any,
        detailedSummary: data.finalSummary as any,
        mainConcepts: (data.mainConcepts || null) as any,
        keyLessons: (data.keyLessons || null) as any,
        importantInsights: (data.keyInsights || null) as any,
        implementationGuide: (data.implementationGuide || null) as any,
        keyTakeaways: (data.keyLessons || null) as any,
      },
      create: {
        bookId: book.id,
        shortSummary: (data.description || data.finalSummary) as any,
        detailedSummary: data.finalSummary as any,
        mainConcepts: (data.mainConcepts || null) as any,
        keyLessons: (data.keyLessons || null) as any,
        importantInsights: (data.keyInsights || null) as any,
        implementationGuide: (data.implementationGuide || null) as any,
        keyTakeaways: (data.keyLessons || null) as any,
      },
    });
  }

  await saveBookEmbedding(book.id, title, [data.category || '', ...(data.tagline?.en?.split(' ') || [])]);

  await updateCacheEntry(cacheKey, title, book.id, { ...data, id: book.id, slug: book.slug });

  return { bookId: book.id, slug: book.slug };
}

async function updateCacheEntry(
  cacheKey: string,
  title: string,
  bookId: string,
  data: any
): Promise<void> {
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  try {
    await prisma.bookCache.upsert({
      where: { cacheKey },
      update: { data: data as any, bookId, expiresAt, hitCount: { increment: 1 } },
      create: { cacheKey, title, data: data as any, bookId, contentType: 'book', source: 'ai', expiresAt },
    });
  } catch (err) {
    console.warn('[CacheManager] Failed to update cache entry:', err);
  }
}

export async function createGenerationJob(
  title: string,
  author?: string,
  category?: string,
  aiProvider?: string,
  aiModel?: string
): Promise<string> {
  const job = await prisma.bookGenerationJob.create({
    data: {
      title,
      author: author || null,
      category: category || null,
      aiProvider: aiProvider || null,
      aiModel: aiModel || null,
      status: 'pending',
      progress: 0,
      totalSteps: 10,
    },
  });
  return job.id;
}

export async function updateGenerationJob(
  jobId: string,
  data: {
    status?: string;
    progress?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const update: any = {};
  if (data.status) update.status = data.status;
  if (data.progress !== undefined) update.progress = data.progress;
  if (data.errorMessage) update.errorMessage = data.errorMessage;

  if (data.status === 'processing' && !data.errorMessage) {
    update.startedAt = new Date();
  }
  if (data.status === 'completed') {
    update.completedAt = new Date();
  }

  await prisma.bookGenerationJob.update({ where: { id: jobId }, data: update });
}

export async function trackAnalytics(
  eventType: string,
  data: {
    bookId?: string;
    userId?: string;
    category?: string;
    value?: number;
    metadata?: any;
  }
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        bookId: data.bookId || null,
        userId: data.userId || null,
        category: data.category || null,
        value: data.value || null,
        metadata: data.metadata || null,
      },
    });
  } catch (err) {
    console.warn('[Analytics] Failed to track event:', err);
  }
}
