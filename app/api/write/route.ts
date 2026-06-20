import { NextRequest, NextResponse } from 'next/server';
import { generateWrittenBook } from '@/lib/groq';
import { RateLimiter } from '@/lib/rate-limiter';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';
import { saveGeneratedBook, createGenerationJob, updateGenerationJob, trackAnalytics } from '@/lib/cache-manager';

const writeLimiter = new RateLimiter(3, 60000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, title, category, style, audience, length } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const ip = getClientIP(request);
    const whitelisted = isWhitelisted(ip);

    if (!whitelisted) {
      const rateCheck = writeLimiter.check(ip);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait before writing another book.',
            retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
          },
          { status: 429 }
        );
      }
    }

    const startTime = Date.now();
    const jobId = await createGenerationJob(title);
    await updateGenerationJob(jobId, { status: 'processing', progress: 1 });

    try {
      const { book, provider, model } = await generateWrittenBook(
        { topic, title, category, style, audience, length }
      );

      const generationTime = Date.now() - startTime;

      const { bookId, slug } = await saveGeneratedBook(title, undefined, {
        ...book,
        description: `A ${style || 'conversational'} book about ${topic}, written for ${audience || 'general readers'}.`,
        generationTimeMs: generationTime,
        aiModelUsed: `${provider} (${model})`,
        aiProvider: provider,
        category: category || book.category,
      });

      await updateGenerationJob(jobId, { status: 'completed', progress: 10 });

      await trackAnalytics('book_written', {
        bookId,
        category: category || book.category,
        value: generationTime,
        metadata: { topic, title, style, audience, length, aiProvider: provider, aiModel: model },
      });

      return NextResponse.json({
        ...book,
        _bookId: bookId,
        _slug: slug,
        _generationTime: generationTime,
      });
    } catch (error) {
      await updateGenerationJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  } catch (error) {
    console.error('Book writing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to write book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
