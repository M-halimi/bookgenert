import { prisma } from '@/lib/prisma';

const DEFAULT_TTL_SECONDS = 3600;

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const entry = await prisma.apiCache.findUnique({
      where: { cacheKey: key },
    });

    if (!entry) return null;
    if (entry.expiresAt < new Date()) {
      await prisma.apiCache.delete({ where: { id: entry.id } });
      return null;
    }

    return entry.data as unknown as T;
  } catch {
    return null;
  }
}

export async function setCachedData(
  key: string,
  data: unknown,
  source: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
) {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.apiCache.upsert({
      where: { cacheKey: key },
      update: { data: data as never, source, expiresAt },
      create: { cacheKey: key, data: data as never, source, expiresAt },
    });
  } catch {
    // cache write failure is non-critical
  }
}

export async function clearExpiredCache() {
  try {
    const { count } = await prisma.apiCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  } catch {
    return 0;
  }
}

export async function clearCacheBySource(source: string) {
  try {
    const { count } = await prisma.apiCache.deleteMany({
      where: { source },
    });
    return count;
  } catch {
    return 0;
  }
}

export function cacheKeyFor(source: string, query: string): string {
  return `${source}:${query.toLowerCase().trim()}`;
}
