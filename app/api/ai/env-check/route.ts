import { NextResponse } from 'next/server';
import { getCache } from '@/lib/ai/cache';
import { getRouterState } from '@/lib/ai/router-state';
import { getApiManager } from '@/lib/api-manager';

function mask(s: string | undefined): string {
  return s ? '***SET***' : 'NOT SET';
}

export async function GET() {
  try {
    const envVars = {
    groq: {
      key: mask(process.env.GROQ_API_KEY),
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile (default)',
      configured: !!process.env.GROQ_API_KEY,
      keyPrefix: process.env.GROQ_API_KEY
        ? process.env.GROQ_API_KEY.startsWith('gsk_')
          ? 'gsk_ (valid format)'
          : 'unknown format'
        : 'n/a',
    },
    cloudflare: {
      token: mask(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY),
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'NOT SET',
      configured: !!(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY) && !!process.env.CLOUDFLARE_ACCOUNT_ID,
      tokenPrefix: process.env.CLOUDFLARE_API_TOKEN
        ? process.env.CLOUDFLARE_API_TOKEN.startsWith('cfk_')
          ? 'cfk_ API Token (valid format)'
          : process.env.CLOUDFLARE_API_TOKEN.startsWith('cfut_')
            ? 'cfut_ API Key (may not work with Workers AI)'
            : 'unknown format'
        : process.env.CLOUDFLARE_API_KEY
          ? process.env.CLOUDFLARE_API_KEY.startsWith('cfk_')
            ? 'cfk_ API Token (valid format)'
            : process.env.CLOUDFLARE_API_KEY.startsWith('cfut_')
              ? 'cfut_ API Key (may not work with Workers AI)'
              : 'unknown format'
          : 'n/a',
    },
    openrouter: {
      key: mask(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free (default)',
      configured: !!process.env.OPENROUTER_API_KEY,
      keyPrefix: process.env.OPENROUTER_API_KEY
        ? process.env.OPENROUTER_API_KEY.startsWith('sk-or-')
          ? 'sk-or- (valid format)'
          : 'unknown format'
        : 'n/a',
    },
    huggingface: {
      key: mask(process.env.HUGGINGFACE_API_KEY),
      configured: !!process.env.HUGGINGFACE_API_KEY,
    },
    ollama: {
      url: process.env.OLLAMA_URL || 'http://localhost:11434 (default)',
      model: process.env.OLLAMA_MODEL || 'llama3 (default)',
      configured: !!process.env.OLLAMA_URL || !!process.env.OLLAMA_MODEL,
    },
  };

  const routerState = getRouterState().getStatus();
  const cacheStats = getCache().getStats();

  const apiManager = getApiManager();
  const apiManagerStatus = apiManager.getProviderStatus();

  return NextResponse.json({
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    providers: envVars,
    routerState: {
      blacklisted: routerState.blacklisted,
      cooldowns: routerState.cooldowns,
    },
    cache: cacheStats,
    apiManagerProviders: Object.fromEntries(
      Array.from(Object.entries(apiManagerStatus)).map(([name, health]) => [
        name,
        {
          status: health.status,
          consecutiveFailures: health.consecutiveFailures,
          lastFailureAt: health.lastFailureAt
            ? new Date(health.lastFailureAt).toISOString()
            : null,
        },
      ])
    ),
    advice: getAdvice(envVars),
  });
  } catch (err) {
    console.error('[EnvCheck] Failed:', err);
    return NextResponse.json({ error: 'Environment check failed' }, { status: 500 });
  }
}

function getAdvice(envVars: Record<string, { configured: boolean; keyPrefix?: string }>): string[] {
  const advice: string[] = [];

  if (!envVars.groq.configured) {
    advice.push('GROQ_API_KEY is not set. Add it to .env.local and restart the server.');
  } else if (envVars.groq.keyPrefix === 'unknown format') {
    advice.push('GROQ_API_KEY has an unusual format. Expected gsk_...');
  }

  if (envVars.cloudflare.configured && envVars.cloudflare.keyPrefix?.includes('cfut_')) {
    advice.push(
      'CLOUDFLARE_API_KEY has cfut_ prefix (API Key). Workers AI needs a cfk_ API Token. ' +
      'Generate one at Cloudflare Dashboard → API Tokens → Create Token → Workers AI.'
    );
  }

  if (!envVars.ollama.configured) {
    advice.push('OLLAMA_URL/OLLAMA_MODEL not configured. Install Ollama: https://ollama.com');
  }

  if (Object.keys(envVars).filter((k) => envVars[k].configured).length === 0) {
    advice.push('No AI providers configured at all. The app cannot generate books.');
  }

  if (envVars.groq.configured && !envVars.cloudflare.configured && !envVars.openrouter.configured) {
    advice.push('Only Groq is configured. If Groq hits rate limits, no fallback is available.');
  }

  return advice;
}
