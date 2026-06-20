import { NextRequest, NextResponse } from 'next/server';
import { generateLocalizedEpisodes } from '@/lib/groq';

export const maxDuration = 300;
import { getCache } from '@/lib/ai/cache';
import { getRouterState } from '@/lib/ai/router-state';
import { RateLimiter } from '@/lib/rate-limiter';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';
import { saveGeneratedBook, trackAnalytics } from '@/lib/cache-manager';
import { validateBook, ensureChapterCount, normalizeChapter } from '@/lib/validation';
import type { LangCode } from '@/lib/groq';

const ipLimiter = new RateLimiter(5, 60000);

const VALID_LANGS = ['ar', 'fr', 'en', 'de'];

const GRACEFUL_ERROR_RESPONSE = {
  title: null,
  author: null,
  category: null,
  tagline: null,
  description: null,
  coverPrompt: null,
  episodes: [],
  finalSummary: null,
  mainConcepts: null,
  keyLessons: [],
  keyInsights: [],
  implementationGuide: null,
  deepExplanation: null,
  relatedBooks: null,
  _generationTime: null,
  _provider: null,
  _model: null,
  _error: null,
  _partial: true,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let body: { title?: string; author?: string; lang?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ...GRACEFUL_ERROR_RESPONSE, _error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { title, author, lang } = body;
    const language: LangCode = lang && VALID_LANGS.includes(lang) ? lang as LangCode : 'en';

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { ...GRACEFUL_ERROR_RESPONSE, _error: 'Title is required' },
        { status: 400 }
      );
    }

    const ip = getClientIP(request);
    const whitelisted = isWhitelisted(ip);

    if (!whitelisted) {
      const rateCheck = ipLimiter.check(ip);
      if (!rateCheck.allowed) {
        const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          {
            ...GRACEFUL_ERROR_RESPONSE,
            _error: `Too many requests. Retry in ${retryAfter}s.`,
            _retryAfter: retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
    }

    return executeGeneration(title, author, language, startTime);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[Generate] Unhandled error:', message);
    return NextResponse.json(
      {
        ...GRACEFUL_ERROR_RESPONSE,
        _error: 'Generation failed. Please try again.',
        _debug: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 200 }
    );
  }
}

async function executeGeneration(
  title: string,
  author: string | undefined,
  language: LangCode,
  startTime: number,
): Promise<NextResponse> {
  try {
    const providerStatus = getRouterState().getStatus();
    const hasBlacklisted = Object.keys(providerStatus.blacklisted).length > 0;
    const hasCooldowns = Object.keys(providerStatus.cooldowns).length > 0;

    if (hasBlacklisted || hasCooldowns) {
      console.log(
        `[Generate] Router state: ${JSON.stringify({
          blacklisted: Object.keys(providerStatus.blacklisted),
          cooldowns: Object.keys(providerStatus.cooldowns),
        })}`
      );
    }

    const result = await generateLocalizedEpisodes(title, author, language);

    const generationTime = Date.now() - startTime;

    if (!result.book) {
      const cache = getCache();
      cache.set(
        [{ role: 'user' as const, content: title }],
        `generate_${title}`,
        '',
        false,
      );

      return NextResponse.json(
        {
          ...GRACEFUL_ERROR_RESPONSE,
          _error: 'Generation returned no content.',
          _provider: result.provider,
          _model: result.model,
          _generationTime: generationTime,
        },
        { status: 200 },
      );
    }

    let book = ensureChapterCount(result.book);
    book = {
      ...book,
      episodes: book.episodes.map((ep, i) => normalizeChapter(ep, i + 1)),
    };

    const validation = validateBook(book);
    if (!validation.valid) {
      console.warn('[Generate] Validation warnings:', validation.errors);
    }

    const { bookId, slug } = await saveGeneratedBook(title, author, {
      ...book,
      description: book.description || `AI-generated summary of ${title}`,
      generationTimeMs: generationTime,
      aiModelUsed: `${result.provider} (${result.model})`,
      aiProvider: `${result.provider}`,
      category: book.category || 'General',
    });

    const isFallback = result.provider === 'local-fallback';

    await trackAnalytics('book_generated', {
      bookId,
      category: book.category || 'General',
      value: generationTime,
      metadata: {
        title,
        author: author || '',
        language,
        aiProvider: result.provider,
        aiModel: result.model,
        generationTimeMs: generationTime,
        fallbackUsed: isFallback,
        chaptersCount: book.episodes.length,
        validationErrors: validation.valid ? 0 : validation.errors.length,
      },
    });

    return NextResponse.json({
      ...book,
      _bookId: bookId,
      _slug: slug,
      _language: language,
      _generationTime: generationTime,
      _provider: result.provider,
      _model: result.model,
      _error: null,
      _partial: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Generate] Generation failed:', message);

    const routerState = getRouterState().getStatus();
    const blacklistedList = Object.keys(routerState.blacklisted);
    const cooldownList = Object.keys(routerState.cooldowns);

    return NextResponse.json(
      {
        ...GRACEFUL_ERROR_RESPONSE,
        _error: message,
        _generationTime: Date.now() - startTime,
        _providerStatus: {
          blacklisted: blacklistedList,
          cooldowns: cooldownList,
        },
        _debug: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 200 },
    );
  }
}
