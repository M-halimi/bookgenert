import { NextRequest, NextResponse } from 'next/server';
import { generateEpisodes } from '@/lib/groq';
import { getRateLimiter } from '@/lib/rate-limiter';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';

const inFlight = new Map<string, Promise<NextResponse>>();

function dedupKey(title: string, author?: string): string {
  return `${title}::${author || ''}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const ip = getClientIP(request);
    const whitelisted = isWhitelisted(ip);
    console.log('IP:', ip, 'whitelisted:', whitelisted);

    if (!whitelisted) {
      const limiter = getRateLimiter(5, 60000);
      const rateCheck = limiter.check(ip);

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
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000);

          const episodes = await generateEpisodes(title, author);
          clearTimeout(timeout);

          return NextResponse.json(episodes);
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

    const episodes = await generateEpisodes(title, author, true);
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate book';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
