import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEpisodes } from '@/lib/groq';
import { RateLimiter } from '@/lib/rate-limiter';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';
import { checkBookCache, saveGeneratedBook, createGenerationJob, updateGenerationJob, trackAnalytics } from '@/lib/cache-manager';

const ipLimiter = new RateLimiter(5, 60000);

const inFlight = new Map<string, Promise<NextResponse>>();

function dedupKey(title: string, author?: string): string {
  return `${title}::${author || ''}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author, skipCache } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const ip = getClientIP(request);
    const whitelisted = isWhitelisted(ip);

    if (!whitelisted) {
      const rateCheck = ipLimiter.check(ip);

      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait before generating another book.',
            retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      const key = dedupKey(title, author);
      const pending = inFlight.get(key);
      if (pending) return pending;

      const promise = (async (): Promise<NextResponse> => {
        const startTime = Date.now();
        try {
          // Create a generation job for progress tracking
          const jobId = await createGenerationJob(title, author);
          await updateGenerationJob(jobId, { status: 'processing', progress: 1 });

          // Check cache unless skipCache is explicitly true
          if (!skipCache) {
            await updateGenerationJob(jobId, { progress: 2 });
            const cached = await checkBookCache(title, author);
            if (cached.hit && cached.data) {
              await updateGenerationJob(jobId, { status: 'completed', progress: 10 });

              await trackAnalytics('book_cache_hit', {
                bookId: cached.cachedBookId,
                category: cached.data.category,
                value: 1,
                metadata: { title, similarity: cached.similarity },
              });

              return NextResponse.json({
                ...cached.data,
                _cached: true,
                _cacheSimilarity: cached.similarity,
                _bookId: cached.cachedBookId,
                _slug: cached.data.slug,
              });
            }
          }

          await updateGenerationJob(jobId, { progress: 3 });

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 120000);

          const { book: episodes, provider, model } = await generateEpisodes(title, author);
          clearTimeout(timeout);

          await prisma.bookGenerationJob.update({
            where: { id: jobId },
            data: { aiProvider: provider, aiModel: model },
          }).catch(() => {});

          await updateGenerationJob(jobId, { progress: 8 });

          const generationTime = Date.now() - startTime;

          // Save to database
          const { bookId, slug } = await saveGeneratedBook(title, author, {
            ...episodes,
            generationTimeMs: generationTime,
            aiModelUsed: `${provider} (${model})`,
            aiProvider: provider,
          });

          await updateGenerationJob(jobId, { status: 'completed', progress: 10 });

          await trackAnalytics('book_generated', {
            bookId,
            category: episodes.category,
            value: generationTime,
            metadata: { title, author, aiProvider: provider, aiModel: model, fallbackUsed: false },
          });

          return NextResponse.json({
            ...episodes,
            _bookId: bookId,
            _slug: slug,
            _generationTime: generationTime,
          });
        } catch (error) {
          console.error('Generation error:', error);
          const message = error instanceof Error ? error.message : 'Failed to generate book';
          return NextResponse.json(
            { error: message },
            { status: 500 }
          );
        } finally {
          inFlight.delete(key);
        }
      })();

      inFlight.set(key, promise);
      return promise;
    }

    const { book: episodes, provider, model } = await generateEpisodes(title, author, true);
    const { bookId, slug } = await saveGeneratedBook(title, author, {
      ...episodes,
      aiModelUsed: `${provider} (${model})`,
      aiProvider: provider,
    });

    return NextResponse.json({
      ...episodes,
      _bookId: bookId,
      _slug: slug,
    });
  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate book';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
