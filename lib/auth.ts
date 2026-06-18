import { NextResponse } from 'next/server';

const API_SECRET_KEY = process.env.API_SECRET_KEY;

export function getApiSecretKey(): string {
  return API_SECRET_KEY || '';
}

export function validateApiKey(key: string | null): boolean {
  if (!API_SECRET_KEY) return true;
  if (!key) return false;
  return key === API_SECRET_KEY;
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  );
}
