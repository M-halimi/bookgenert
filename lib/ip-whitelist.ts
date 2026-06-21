import { NextRequest } from 'next/server';

const DEFAULT_WHITELIST: string[] = [
  '::1',
  '::ffff:127.0.0.1',
  '127.0.0.1',
  'localhost',
];

function getWhitelist(): string[] {
  if (process.env.WHITELIST_IPS) {
    return process.env.WHITELIST_IPS.split(',').map(ip => ip.trim());
  }
  return DEFAULT_WHITELIST;
}

export function isWhitelisted(ip: string): boolean {
  if (ip === 'unknown' || ip === '') return false;
  return getWhitelist().includes(ip);
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
