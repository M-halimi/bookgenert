/**
 * Provider state tracker.
 *
 * Tracks:
 * - blacklistedAt: providers with auth/config errors (401, 404) — auto-expires after 30 min
 * - cooldownUntil: providers temporarily disabled due to rate limits (429)
 * - modelRotations: OpenRouter models that have failed 404, for dynamic fallback
 */

import { AIProviderName } from './types';

const BLACKLIST_TTL = 2 * 60 * 1000;

interface BlacklistEntry {
  reason: string;
  blacklistedAt: number;
  expiresAt: number;
  type: 'auth' | 'not_found' | 'disabled';
}

interface CooldownEntry {
  cooldownUntil: number;
  reason: string;
  retryAfter: number;
}

class RouterState {
  private blacklist: Map<AIProviderName, BlacklistEntry>;
  private cooldowns: Map<AIProviderName, CooldownEntry>;
  private failedModels: Map<string, number>;

  constructor() {
    this.blacklist = new Map();
    this.cooldowns = new Map();
    this.failedModels = new Map();
  }

  isBlacklisted(name: AIProviderName): boolean {
    const entry = this.blacklist.get(name);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.blacklist.delete(name);
      console.log(`[RouterState] UNBLACKLISTED ${name} (TTL expired)`);
      return false;
    }
    return true;
  }

  blacklistProvider(name: AIProviderName, reason: string, type: 'auth' | 'not_found' | 'disabled'): void {
    const expiresAt = Date.now() + BLACKLIST_TTL;
    this.blacklist.set(name, {
      reason,
      blacklistedAt: Date.now(),
      expiresAt,
      type,
    });
    console.error(
      `[RouterState] BLACKLISTED ${name} for ${BLACKLIST_TTL / 60000}min | type=${type} | reason="${reason}"`
    );
  }

  getBlacklistReason(name: AIProviderName): string | null {
    return this.blacklist.get(name)?.reason ?? null;
  }

  isOnCooldown(name: AIProviderName): boolean {
    const entry = this.cooldowns.get(name);
    if (!entry) return false;
    if (Date.now() >= entry.cooldownUntil) {
      this.cooldowns.delete(name);
      return false;
    }
    return true;
  }

  getCooldownRemaining(name: AIProviderName): number {
    const entry = this.cooldowns.get(name);
    if (!entry) return 0;
    const remaining = entry.cooldownUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  setCooldown(name: AIProviderName, retryAfterMs: number, reason: string): void {
    this.cooldowns.set(name, {
      cooldownUntil: Date.now() + retryAfterMs,
      reason,
      retryAfter: retryAfterMs,
    });
    console.warn(
      `[RouterState] COOLDOWN ${name} | ${retryAfterMs}ms | reason="${reason}"`
    );
  }

  recordFailedModel(provider: AIProviderName, model: string): void {
    const key = `${provider}::${model}`;
    this.failedModels.set(key, (this.failedModels.get(key) || 0) + 1);
    console.warn(
      `[RouterState] MODEL_FAILED ${provider}/${model} | ` +
      `count=${this.failedModels.get(key)}`
    );
  }

  hasModelFailed(provider: AIProviderName, model: string, maxFailures: number = 1): boolean {
    const key = `${provider}::${model}`;
    return (this.failedModels.get(key) || 0) >= maxFailures;
  }

  reset(): void {
    this.blacklist.clear();
    this.cooldowns.clear();
    this.failedModels.clear();
  }

  getStatus(): {
    blacklisted: Record<string, { reason: string; type: string }>;
    cooldowns: Record<string, { remainingMs: number; reason: string }>;
  } {
    const blacklisted: Record<string, { reason: string; type: string }> = {};
    this.blacklist.forEach((entry, name) => {
      blacklisted[name] = { reason: entry.reason, type: entry.type };
    });
    const cooldownEntries: Record<string, { remainingMs: number; reason: string }> = {};
    this.cooldowns.forEach((entry, name) => {
      const remaining = entry.cooldownUntil - Date.now();
      if (remaining > 0) {
        cooldownEntries[name] = { remainingMs: remaining, reason: entry.reason };
      }
    });
    return { blacklisted, cooldowns: cooldownEntries };
  }
}

let stateInstance: RouterState | null = null;

export function getRouterState(): RouterState {
  if (!stateInstance) {
    stateInstance = new RouterState();
  }
  return stateInstance;
}

export function resetRouterState(): void {
  stateInstance = null;
}

export type { RouterState };
