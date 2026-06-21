import { NextRequest, NextResponse } from 'next/server';
import { fetchSeedBooks } from '@/lib/seed/fetcher';
import { generateAISeedBooks } from '@/lib/seed/ai-generator';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const apiKey = request.headers.get('x-api-key');
  const whitelisted = isWhitelisted(ip);
  const authenticated = validateApiKey(apiKey);

  if (!whitelisted && !authenticated) {
    return unauthorizedResponse('Seed endpoint requires whitelisted IP or valid API key');
  }

  const sourceParam = request.nextUrl.searchParams.get('source') || 'external';
  const type = request.nextUrl.searchParams.get('type') || 'metadata';

  if (type === 'ai') {
    const topicsParam = request.nextUrl.searchParams.get('topics');
    const topics = topicsParam ? topicsParam.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    try {
      const result = await generateAISeedBooks(topics);
      const successCount = result.filter(r => r.success).length;
      const failCount = result.filter(r => !r.success).length;
      return NextResponse.json({
        type: 'ai',
        total: result.length,
        success: successCount,
        failed: failCount,
        books: result,
      });
    } catch (error) {
      console.error('AI seed error:', error);
      return NextResponse.json(
        { error: 'AI seed failed', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  const sources = sourceParam === 'external' || sourceParam === 'all'
    ? ['googlebooks' as const, 'openlibrary' as const]
    : [sourceParam as 'googlebooks' | 'openlibrary'];

  try {
    const result = await fetchSeedBooks({ sources });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
