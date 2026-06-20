/**
 * In-memory LRU cache for AI responses.
 *
 * Strategy:
 * - Successful responses: TTL = 1 hour
 * - Failed/error responses (negative cache): TTL = 30 seconds
 *   (prevents hammering broken providers during transient failures)
 * - Max 500 entries, LRU eviction
 * - Cache key = SHA-256 hash of messages JSON + model name
 */

interface CacheEntry {
  content: string;
  ttl: number;
  createdAt: number;
  hitCount: number;
}

const DEFAULT_SUCCESS_TTL = 60 * 60 * 1000;
const NEGATIVE_TTL = 30 * 1000;
const MAX_ENTRIES = 500;

export class AIResponseCache {
  private cache: Map<string, CacheEntry>;
  private hits: number;
  private misses: number;

  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  private generateKey(messages: { role: string; content: string }[], model: string): string {
    const input = JSON.stringify({ messages, model });
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `ai_cache_${Math.abs(hash).toString(36)}`;
  }

  get(
    messages: { role: string; content: string }[],
    model: string
  ): { hit: boolean; content: string | null } {
    const key = this.generateKey(messages, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return { hit: false, content: null };
    }

    if (Date.now() > entry.createdAt + entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return { hit: false, content: null };
    }

    entry.hitCount++;
    this.cache.set(key, entry);
    this.hits++;
    return { hit: true, content: entry.content };
  }

  set(
    messages: { role: string; content: string }[],
    model: string,
    content: string,
    success: boolean
  ): void {
    const key = this.generateKey(messages, model);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    while (this.cache.size >= MAX_ENTRIES) {
      const firstKey = this.cache.keys().next();
      if (firstKey.done) break;
      this.cache.delete(firstKey.value);
    }

    this.cache.set(key, {
      content,
      ttl: success ? DEFAULT_SUCCESS_TTL : NEGATIVE_TTL,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  invalidate(model?: string): void {
    if (!model) {
      this.cache.clear();
      return;
    }
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(model)) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }
}

let cacheInstance: AIResponseCache | null = null;

export function getCache(): AIResponseCache {
  if (!cacheInstance) {
    cacheInstance = new AIResponseCache();
  }
  return cacheInstance;
}

export function resetCache(): void {
  cacheInstance = null;
}
