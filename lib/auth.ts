import { NextResponse } from 'next/server';

export function getApiSecretKey(): string {
  return process.env.API_SECRET_KEY || '';
}

export function validateApiKey(key: string | null): boolean {
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) return false;
  if (!key) return false;
  return key === secretKey;
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  );
}
