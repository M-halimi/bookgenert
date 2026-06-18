import { NextRequest, NextResponse } from 'next/server';
import { fetchSeedBooks } from '@/lib/seed/fetcher';
import { getClientIP, isWhitelisted } from '@/lib/ip-whitelist';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const whitelisted = isWhitelisted(ip);

  if (!whitelisted) {
    return NextResponse.json(
      { error: 'Seed endpoint is restricted to whitelisted IPs only' },
      { status: 403 }
    );
  }

  const sourceParam = request.nextUrl.searchParams.get('source') || 'all';
  const sources = sourceParam === 'all'
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
