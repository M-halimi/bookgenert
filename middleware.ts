import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './lib/auth';
import { routing } from './lib/i18n/routing';

const PROTECTED_PATHS = [
  '/api/seed/',
  '/api/moods/backfill',
  '/api/admin/',
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

    if (!localeCookie || !routing.locales.includes(localeCookie as any)) {
      const acceptLang = request.headers.get('accept-language') || '';
      const preferred = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase() || '';
      const detected = routing.locales.includes(preferred as any) ? preferred : routing.defaultLocale;

      const response = NextResponse.next();
      response.cookies.set('NEXT_LOCALE', detected, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      return response;
    }

    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const apiKey = request.headers.get('x-api-key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json(
      { error: 'Valid x-api-key header required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
