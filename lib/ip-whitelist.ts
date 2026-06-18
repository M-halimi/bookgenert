import { NextRequest } from 'next/server';

const DEFAULT_WHITELIST: string[] = [
  '105.75.8.106',
];

function getWhitelist(): string[] {
  if (process.env.WHITELIST_IPS) {
    return process.env.WHITELIST_IPS.split(',').map(ip => ip.trim());
  }
  return DEFAULT_WHITELIST;
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

export function isWhitelisted(ip: string): boolean {
  return getWhitelist().includes(ip);
}
