import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sanitizeUrl(url: string): string {
  return url.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@');
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error: string | null;
  details: Record<string, unknown>;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    console.log(`[Prisma] Health check OK (${latencyMs}ms)`);
    return { ok: true, latencyMs, error: null, details: {} };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const dbUrl = process.env.DATABASE_URL || 'not set';
    const sanitizedUrl = sanitizeUrl(dbUrl);
    const directUrl = process.env.DIRECT_URL || 'not set';
    const sanitizedDirect = sanitizeUrl(directUrl);

    console.error(`[Prisma] Health check FAILED (${latencyMs}ms):`, {
      error: message,
      database_url: sanitizedUrl,
      direct_url: sanitizedDirect,
      node_env: process.env.NODE_ENV,
    });

    return {
      ok: false,
      latencyMs,
      error: message,
      details: {
        database_url: sanitizedUrl,
        direct_url: sanitizedDirect,
        node_env: process.env.NODE_ENV,
      },
    };
  }
}
