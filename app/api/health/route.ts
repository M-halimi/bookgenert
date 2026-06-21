import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/prisma';

export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  const providerStatus: Record<string, string> = {
    groq: process.env.GROQ_API_KEY ? 'configured' : 'missing',
    openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'missing',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    cloudflare: process.env.CLOUDFLARE_ACCOUNT_ID && (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY) ? 'configured' : 'missing',
    huggingface: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'missing',
  };

  const envStatus = {
    database_url: (process.env.DATABASE_URL || '').replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@'),
    direct_url: process.env.DIRECT_URL ? 'set' : 'missing',
    node_env: process.env.NODE_ENV || 'not set',
    vercel_env: process.env.VERCEL_ENV || 'not set',
  };

  const statusCode = dbHealth.ok ? 200 : 503;

  return NextResponse.json(
    {
      status: dbHealth.ok ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        ok: dbHealth.ok,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },
      aiProviders: providerStatus,
      environment: envStatus,
      uptime: process.uptime(),
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
