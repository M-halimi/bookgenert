import { NextResponse } from 'next/server';
import { getApiManager } from '@/lib/api-manager';

export async function GET() {
  const api = getApiManager();
  const providerStatus = api.getProviderStatus();
  const logs = api.getLogs().slice(-50);

  const recentLogs = logs.filter(
    (l) => Date.now() - new Date(l.timestamp).getTime() < 300000
  );
  const errorRate =
    recentLogs.length > 0
      ? Math.round(
          (recentLogs.filter((l) => !l.success).length / recentLogs.length) * 100
        )
      : 0;

  return NextResponse.json({
    status: api.getActiveCount() > 0 ? 'healthy' : 'degraded',
    activeProviders: api.getActiveCount(),
    totalProviders: api.getTotalProviders(),
    errorRate: `${errorRate}%`,
    providers: providerStatus,
    recentRequests: recentLogs.length,
    totalLoggedRequests: logs.length,
  });
}
