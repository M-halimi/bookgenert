import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

const PROTECTED_PATHS = [
  '/api/seed/',
  '/api/moods/backfill',
  '/api/admin/',
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const apiKey = request.headers.get('x-api-key');
  if (validateApiKey(apiKey)) return NextResponse.next();

  return unauthorizedResponse('Valid x-api-key header required');
}

export const config = {
  matcher: '/api/:path*',
};
