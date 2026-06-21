import { NextResponse } from 'next/server';
import { getApiManager } from '@/lib/api-manager';

export async function GET() {
  try {
    const api = getApiManager();
    const providerStatus = api.getProviderStatus();
    const logs = api.getLogs().slice(-50);

    const recentLogs = logs.filter(
      (l) => Date.now() - new Date(l.timestamp).getTime() < 300000
    );
    const errorRateNum =
      recentLogs.length > 0
        ? Math.round(
            (recentLogs.filter((l) => !l.success).length / recentLogs.length) * 100
          )
        : 0;

    return NextResponse.json({
      status: api.getActiveCount() > 0 ? 'healthy' : 'degraded',
      activeProviders: api.getActiveCount(),
      totalProviders: api.getTotalProviders(),
      errorRate: errorRateNum,
      formattedErrorRate: `${errorRateNum}%`,
      providers: providerStatus,
      recentRequests: recentLogs.length,
      totalLoggedRequests: logs.length,
    });
  } catch (err) {
    console.error('[Admin/Health] Failed:', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
