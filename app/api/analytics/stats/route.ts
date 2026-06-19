import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '30d';

  const now = new Date();
  let startDate: Date;
  switch (timeframe) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0);
  }

  try {
    const [
      totalBooks,
      cacheHits,
      totalGenerations,
      analyticsEvents,
      topCategoriesRaw,
      chaptersCount,
      generationJobs,
      recentEvents,
    ] = await Promise.all([
      prisma.book.count({
        where: { generationStatus: 'completed' },
      }),
      prisma.analyticsEvent.count({
        where: { eventType: 'book_cache_hit', createdAt: { gte: startDate } },
      }),
      prisma.analyticsEvent.count({
        where: {
          eventType: { in: ['book_generated', 'book_written'] },
          createdAt: { gte: startDate },
        },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { book: { select: { title: true, slug: true } } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['category'],
        _count: { id: true },
        where: {
          category: { not: null },
          createdAt: { gte: startDate },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.bookChapter.count({
        where: { book: { generationStatus: 'completed' } },
      }),
      prisma.bookGenerationJob.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { book: { select: { title: true, slug: true } } },
      }),
    ]);

    // Compute average generation time from completed jobs
    const completedJobs = generationJobs.filter(j => j.status === 'completed' && j.createdAt && j.completedAt);
    const avgGenerationTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const start = j.startedAt || j.createdAt;
          const end = j.completedAt!;
          return sum + (end.getTime() - start.getTime());
        }, 0) / completedJobs.length
      : 0;

    // Per-provider metrics
    const providerCount = new Map<string, { count: number; totalLatency: number; successes: number; failures: number }>();
    for (const event of analyticsEvents) {
      if (event.metadata && typeof event.metadata === 'object' && 'aiProvider' in (event.metadata as Record<string, unknown>)) {
        const meta = event.metadata as Record<string, unknown>;
        const p = typeof meta.aiProvider === 'string' ? meta.aiProvider : 'unknown';
        const prev = providerCount.get(p) || { count: 0, totalLatency: 0, successes: 0, failures: 0 };
        prev.count++;
        prev.successes++;
        providerCount.set(p, prev);
      }
    }
    // Also count failures from generation jobs with error
    for (const job of generationJobs) {
      if (job.status === 'failed' && job.aiProvider) {
        const prev = providerCount.get(job.aiProvider) || { count: 0, totalLatency: 0, successes: 0, failures: 0 };
        prev.count++;
        prev.failures++;
        providerCount.set(job.aiProvider, prev);
      }
    }
    const providerMetrics = Array.from(providerCount.entries()).map(([provider, stats]) => ({
      provider,
      totalCalls: stats.count,
      successes: stats.successes,
      failures: stats.failures,
      avgLatency: stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0,
      successRate: stats.count > 0 ? Math.round((stats.successes / stats.count) * 100) : 0,
    }));

    // Fallback usage count (events where metadata has fallbackChain)
    let fallbackCount = 0;
    const fallbackEvents = analyticsEvents.filter(e => {
      if (e.metadata && typeof e.metadata === 'object') {
        const meta = e.metadata as Record<string, unknown>;
        return meta.fallbackUsed === true;
      }
      return false;
    });
    fallbackCount = fallbackEvents.length;

    // Compute cache savings (each cache hit saves one AI call)
    const cacheSavings = cacheHits * 1; // Each cache hit = 1 saved generation

    // Top categories
    const topCategories = topCategoriesRaw
      .filter(c => c.category)
      .map(c => ({ category: c.category!, count: c._count.id }));

    // Most viewed books - count from analytics events by bookId
    const bookViewCounts = new Map<string, { title: string; count: number; slug: string }>();
    for (const event of analyticsEvents) {
      if (event.bookId && event.book?.title) {
        const existing = bookViewCounts.get(event.bookId);
        if (existing) {
          existing.count++;
        } else {
          bookViewCounts.set(event.bookId, {
            title: event.book.title,
            count: 1,
            slug: event.book.slug || event.book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100),
          });
        }
      }
    }
    const topBooks = Array.from(bookViewCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent activity
    const recentActivity = recentEvents.map(e => ({
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      book: e.book?.title || undefined,
      bookSlug: e.book?.slug || (e.book?.title
        ? e.book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
        : undefined),
    }));

    // Generation trend (daily counts)
    const trendMap = new Map<string, number>();
    for (const job of generationJobs) {
      const day = job.createdAt.toISOString().slice(0, 10);
      trendMap.set(day, (trendMap.get(day) || 0) + 1);
    }
    const generationTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalBooks,
      totalChapters: chaptersCount,
      cacheHits,
      cacheSavings,
      totalGenerations,
      avgGenerationTime,
      providerMetrics,
      fallbackCount,
      topCategories,
      topBooks,
      recentActivity,
      generationTrend,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({
      totalBooks: 0,
      totalChapters: 0,
      cacheHits: 0,
      cacheSavings: 0,
      totalGenerations: 0,
      avgGenerationTime: 0,
      providerMetrics: [],
      fallbackCount: 0,
      topCategories: [],
      topBooks: [],
      recentActivity: [],
      generationTrend: [],
    });
  }
}
