import { NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/service';
import { getApiManager } from '@/lib/api-manager';

export async function GET() {
  try {
    const service = getAIService();
    const apiManager = getApiManager();

    const [health, providerStatuses, apiLogs] = await Promise.all([
      service.healthCheck(),
      service.getProviderStatuses(),
      apiManager.getLogs().slice(-20),
    ]);

    const recentErrors = apiLogs.filter(
      (l) => !l.success && Date.now() - new Date(l.timestamp).getTime() < 300000
    );

    return NextResponse.json({
      ...health,
      _meta: {
        activeProviders: apiManager.getActiveCount(),
        totalProviders: apiManager.getTotalProviders(),
        providerDetails: providerStatuses,
        recentErrors: recentErrors.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AI Health] Check failed:', error);
    return NextResponse.json(
      {
        ollama: false,
        groq: false,
        gemini: false,
        openrouter: false,
        _meta: {
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
