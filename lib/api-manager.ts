import { RateLimiter } from './rate-limiter';

type ApiFormat = 'openai' | 'cloudflare' | 'gemini' | 'ollama';

interface ProviderConfig {
  name: string;
  key: string;
  baseUrl: string;
  models: string[];
  priority: number;
  format: ApiFormat;
  cooldownPeriodMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
}

interface ApiRequestMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApiCompletionRequest {
  messages: ApiRequestMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface ApiCompletionResponse {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
}

type HealthStatus = 'active' | 'throttled' | 'cooldown' | 'failed';

interface ProviderHealth {
  status: HealthStatus;
  failureCount: number;
  successCount: number;
  totalLatencyMs: number;
  lastFailureAt: number | null;
  cooldownUntil: number | null;
  lastUsedAt: number | null;
  consecutiveFailures: number;
  avgLatencyMs: number;
}

interface ApiLogEntry {
  timestamp: string;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  error: string | null;
  fallbackChain: string[];
  retries: number;
}

class ApiError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

const MAX_LOG_SIZE = 1000;

class ApiManager {
  private providers: ProviderConfig[];
  private health: Map<string, ProviderHealth>;
  private logs: ApiLogEntry[];
  private loadBalanceMode: boolean;
  private rateLimiter: RateLimiter;

  constructor(loadBalanceMode = false) {
    this.providers = this.discoverProviders();
    this.health = new Map();
    this.logs = [];
    this.loadBalanceMode = loadBalanceMode;
    this.rateLimiter = new RateLimiter(10, 60000);

    for (const p of this.providers) {
      this.health.set(p.name, {
        status: 'active',
        failureCount: 0,
        successCount: 0,
        totalLatencyMs: 0,
        lastFailureAt: null,
        cooldownUntil: null,
        lastUsedAt: null,
        consecutiveFailures: 0,
        avgLatencyMs: 0,
      });
    }

    if (this.providers.length === 0) {
      console.warn('[ApiManager] No AI providers configured');
    }
  }

  private discoverProviders(): ProviderConfig[] {
    const configs: ProviderConfig[] = [];

    if (process.env.OLLAMA_URL || process.env.OLLAMA_MODEL) {
      configs.push({
        name: 'ollama',
        key: '',
        baseUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, ''),
        models: [process.env.OLLAMA_MODEL || 'llama3'],
        priority: 0,
        format: 'ollama',
        cooldownPeriodMs: 30000,
        maxRetries: 2,
      });
    }

    if (process.env.GROQ_API_KEY) {
      configs.push({
        name: 'groq',
        key: process.env.GROQ_API_KEY,
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: ['llama-3.3-70b-versatile'],
        priority: 1,
        format: 'openai',
        cooldownPeriodMs: 60000,
        maxRetries: 2,
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      configs.push({
        name: 'openrouter',
        key: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: [
          'google/gemini-2.0-flash-exp:free',
          'meta-llama/llama-3.2-3b-instruct:free',
          'cohere/command-r7b-12-2024:free',
        ],
        priority: 2,
        format: 'openai',
        cooldownPeriodMs: 60000,
        maxRetries: 2,
        headers: {
          'HTTP-Referer': 'https://bookflix.app',
          'X-Title': 'BookFlix',
        },
      });
    }

    const cfKey = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY;
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (cfKey && cfAccount) {
      configs.push({
        name: 'cloudflare',
        key: cfKey,
        baseUrl: `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run`,
        models: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
        priority: 3,
        format: 'cloudflare',
        cooldownPeriodMs: 120000,
        maxRetries: 1,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      configs.push({
        name: 'openai',
        key: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4o-mini'],
        priority: 4,
        format: 'openai',
        cooldownPeriodMs: 60000,
        maxRetries: 2,
      });
    }

    if (process.env.GEMINI_API_KEY) {
      configs.push({
        name: 'gemini',
        key: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        priority: 5,
        format: 'gemini',
        cooldownPeriodMs: 60000,
        maxRetries: 2,
      });
    }

    configs.sort((a, b) => a.priority - b.priority);
    return configs;
  }

  private getProviderHealth(name: string): ProviderHealth {
    return this.health.get(name) || {
      status: 'active',
      failureCount: 0,
      successCount: 0,
      totalLatencyMs: 0,
      lastFailureAt: null,
      cooldownUntil: null,
      lastUsedAt: null,
      consecutiveFailures: 0,
      avgLatencyMs: 0,
    };
  }

  private isHealthy(name: string): boolean {
    const h = this.getProviderHealth(name);

    if (h.status === 'active') return true;

    if ((h.status === 'cooldown' || h.status === 'failed') && h.lastFailureAt) {
      if (Date.now() - h.lastFailureAt >= 120000) {
        h.status = 'active';
        h.consecutiveFailures = 0;
        h.cooldownUntil = null;
        return true;
      }
      return false;
    }

    return false;
  }

  private recordSuccess(name: string, latencyMs: number): void {
    const h = this.getProviderHealth(name);
    h.successCount++;
    h.totalLatencyMs += latencyMs;
    h.lastUsedAt = Date.now();
    h.avgLatencyMs = h.totalLatencyMs / h.successCount;
    h.consecutiveFailures = 0;
    h.status = 'active';
  }

  private recordFailure(name: string, retryable: boolean): void {
    const h = this.getProviderHealth(name);
    h.failureCount++;
    h.lastFailureAt = Date.now();
    h.consecutiveFailures++;

    if (retryable && h.consecutiveFailures >= 3) {
      h.status = 'cooldown';
      h.cooldownUntil = Date.now() + 120000;
    } else if (!retryable) {
      h.status = 'failed';
    }
  }

  private async executeProvider(
    provider: ProviderConfig,
    request: ApiCompletionRequest,
    signal?: AbortSignal
  ): Promise<ApiCompletionResponse> {
    const start = Date.now();

    if (provider.format === 'ollama') {
      return this.executeOllama(provider, request, start, signal);
    }
    if (provider.format === 'gemini') {
      return this.executeGemini(provider, request, start, signal);
    }
    if (provider.format === 'cloudflare') {
      return this.executeCloudflare(provider, request, start, signal);
    }
    return this.executeOpenAI(provider, request, start, signal);
  }

  private async executeOpenAI(
    provider: ProviderConfig,
    request: ApiCompletionRequest,
    start: number,
    signal?: AbortSignal
  ): Promise<ApiCompletionResponse> {
    const model = request.model || provider.models[0] || 'llama-3.3-70b-versatile';

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
      ...provider.headers,
    };

    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      const isRetryable = res.status === 429 || res.status >= 500;
      throw new ApiError(
        `[${provider.name}] ${res.status}: ${errBody.slice(0, 200)}`,
        res.status,
        isRetryable
      );
    }

    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new ApiError(`[${provider.name}] Empty response`, 0, true);
    }

    return { content, provider: provider.name, model, latencyMs: Date.now() - start };
  }

  private async executeCloudflare(
    provider: ProviderConfig,
    request: ApiCompletionRequest,
    start: number,
    signal?: AbortSignal
  ): Promise<ApiCompletionResponse> {
    const model = request.model || provider.models[0] || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

    const messages = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(`${provider.baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal: signal ?? AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      const isRetryable = res.status === 429 || res.status >= 500;
      throw new ApiError(
        `[${provider.name}] ${res.status}: ${errBody.slice(0, 200)}`,
        res.status,
        isRetryable
      );
    }

    const data: { result?: { response?: string; answer?: string } } = await res.json();
    const content = data.result?.response || data.result?.answer;

    if (!content) {
      throw new ApiError(`[${provider.name}] Empty response`, 0, true);
    }

    return { content, provider: provider.name, model, latencyMs: Date.now() - start };
  }

  private async executeGemini(
    provider: ProviderConfig,
    request: ApiCompletionRequest,
    start: number,
    signal?: AbortSignal
  ): Promise<ApiCompletionResponse> {
    const model = request.model || provider.models[0] || 'gemini-2.0-flash';
    const url = `${provider.baseUrl}/${model}:generateContent?key=${provider.key}`;

    const combinedContent = request.messages
      .map((m) => (m.role === 'system' ? `[System Instruction]\n${m.content}\n[/System Instruction]` : m.content))
      .join('\n\n');

    const body = {
      contents: [
        {
          parts: [{ text: combinedContent }],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      const isRetryable = res.status === 429 || res.status >= 500;
      throw new ApiError(
        `[${provider.name}] ${res.status}: ${errBody.slice(0, 200)}`,
        res.status,
        isRetryable
      );
    }

    const data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new ApiError(`[${provider.name}] Empty response`, 0, true);
    }

    return { content, provider: provider.name, model, latencyMs: Date.now() - start };
  }

  private async executeOllama(
    provider: ProviderConfig,
    request: ApiCompletionRequest,
    start: number,
    signal?: AbortSignal
  ): Promise<ApiCompletionResponse> {
    const model = request.model || provider.models[0] || 'llama3';
    const timeout = 180000;

    const combinedPrompt = request.messages
      .map((m) =>
        m.role === 'system'
          ? `[System Instruction]\n${m.content}\n[/System Instruction]`
          : m.content
      )
      .join('\n\n');

    const res = await fetch(`${provider.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: combinedPrompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
        },
      }),
      signal: signal ?? AbortSignal.timeout(timeout),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      const isRetryable = res.status === 429 || res.status >= 500;
      throw new ApiError(
        `[${provider.name}] ${res.status}: ${errBody.slice(0, 200)}`,
        res.status,
        isRetryable
      );
    }

    const data: { response?: string; error?: string } = await res.json();

    if (data.error) {
      throw new ApiError(`[${provider.name}] ${data.error}`, 0, true);
    }

    const content = data.response;

    if (!content) {
      throw new ApiError(`[${provider.name}] Empty response`, 0, true);
    }

    return { content, provider: provider.name, model, latencyMs: Date.now() - start };
  }

  private inFlight = new Map<string, Promise<ApiCompletionResponse>>();

  private dedupKey(request: ApiCompletionRequest): string {
    const lastMsg = request.messages[request.messages.length - 1]?.content?.slice(0, 100) || '';
    return `${request.model || 'default'}::${lastMsg}`;
  }

  async complete(
    request: ApiCompletionRequest,
    signal?: AbortSignal,
    whitelisted?: boolean
  ): Promise<ApiCompletionResponse> {
    const startTime = Date.now();

    if (signal?.aborted) {
      throw new ApiError('Request aborted before execution', 0, false);
    }

    if (!whitelisted) {
      const rateCheck = this.rateLimiter.check('api-manager');
      if (!rateCheck.allowed) {
        throw new ApiError(
          `Rate limited by global AI throttle. Try again in ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)}s.`,
          429,
          true
        );
      }

      const dKey = this.dedupKey(request);
      const inFlightReq = this.inFlight.get(dKey);
      if (inFlightReq) return inFlightReq;

      const promise = this.executeWithFallback(request, signal, startTime);
      this.inFlight.set(dKey, promise);
      promise.finally(() => this.inFlight.delete(dKey)).catch(() => {});
      return promise;
    }

    return this.executeWithFallback(request, signal, startTime);
  }

  private async executeWithFallback(
    request: ApiCompletionRequest,
    signal: AbortSignal | undefined,
    startTime: number
  ): Promise<ApiCompletionResponse> {
    const fallbackChain: string[] = [];
    let lastError: string | null = null;
    let lastStatus: number | null = null;
    let retries = 0;

    const availableProviders = this.loadBalanceMode
      ? this.getBalancedProviders()
      : this.providers.filter((p) => this.isHealthy(p.name));

    for (const provider of availableProviders) {
      if (!this.isHealthy(provider.name)) continue;

      fallbackChain.push(provider.name);

      for (let attempt = 1; attempt <= 1 + provider.maxRetries; attempt++) {
        try {
          const result = await this.executeProvider(provider, request, signal);

          this.recordSuccess(provider.name, result.latencyMs);
          this.log({
            provider: provider.name,
            model: result.model,
            latencyMs: result.latencyMs,
            success: true,
            error: null,
            fallbackChain: [...fallbackChain],
            retries,
          });

          return result;
        } catch (err) {
          retries++;
          const apiErr = err instanceof ApiError ? err : new ApiError(String(err), 0, true);
          lastError = apiErr.message;
          lastStatus = apiErr.status;

          if (apiErr.status === 429) {
            // Quota errors won't resolve with retries — skip to next provider
            if (apiErr.message.toLowerCase().includes('quota')) {
              this.recordFailure(provider.name, false);
              break;
            }
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          if (apiErr.retryable && attempt <= provider.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          this.recordFailure(provider.name, apiErr.retryable);
          break;
        }
      }
    }

    const elapsed = Date.now() - startTime;
    this.log({
      provider: fallbackChain[fallbackChain.length - 1] || 'none',
      model: 'unknown',
      latencyMs: elapsed,
      success: false,
      error: lastError || 'All providers exhausted',
      fallbackChain,
      retries,
    });

    const errorMsg = lastError
      ? lastError
      : lastStatus === 429
        ? 'Rate limited by all AI providers — too many requests. Wait and try again.'
        : 'All AI providers are currently unavailable. Check your API keys and network connection.';

    throw new ApiError(
      `All AI providers failed after ${retries} retries across [${fallbackChain.join(' -> ')}]: ${errorMsg}`,
      503,
      false
    );
  }

  private getBalancedProviders(): ProviderConfig[] {
    const scored = this.providers
      .filter((p) => this.isHealthy(p.name))
      .map((p) => {
        const h = this.getProviderHealth(p.name);
        const avgLatency = h.successCount > 0 ? h.totalLatencyMs / h.successCount : 5000;
        const reliability =
          h.successCount + h.failureCount > 0
            ? h.successCount / (h.successCount + h.failureCount)
            : 0.5;
        const score = reliability * 100 - avgLatency * 0.01 + (10 - p.priority) * 5;
        return { provider: p, score };
      })
      .sort((a, b) => b.score - a.score);

    // Rotate recently used providers to end
    const rotationIndex = scored.findIndex((s) => {
      const h = this.getProviderHealth(s.provider.name);
      return h.lastUsedAt !== null && Date.now() - h.lastUsedAt < 2000;
    });
    if (rotationIndex > 0) {
      const [item] = scored.splice(rotationIndex, 1);
      scored.push(item);
    }

    return scored.map((s) => s.provider);
  }

  private log(entry: Omit<ApiLogEntry, 'timestamp'>): void {
    const log: ApiLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.logs.push(log);
    if (this.logs.length > MAX_LOG_SIZE) this.logs.shift();

    const icon = entry.success ? '\u2713' : '\u2717';
    const chain = entry.fallbackChain.join('\u2192');
    console.error(
      `[ApiManager] ${icon} ${entry.provider} | ${entry.latencyMs}ms | retry:${entry.retries} | chain:[${chain}]${entry.error ? ` | ${entry.error}` : ''}`
    );
  }

  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  getProviderStatus(): Record<string, ProviderHealth> {
    const status: Record<string, ProviderHealth> = {};
    Array.from(this.health.entries()).forEach(([name, health]) => {
      status[name] = { ...health };
    });
    return status;
  }

  getActiveCount(): number {
    return this.providers.filter((p) => this.isHealthy(p.name)).length;
  }

  getTotalProviders(): number {
    return this.providers.length;
  }

  resetHealth(): void {
    for (const p of this.providers) {
      this.health.set(p.name, {
        status: 'active',
        failureCount: 0,
        successCount: 0,
        totalLatencyMs: 0,
        lastFailureAt: null,
        cooldownUntil: null,
        lastUsedAt: null,
        consecutiveFailures: 0,
        avgLatencyMs: 0,
      });
    }
  }
}

let instance: ApiManager | null = null;

export function getApiManager(loadBalanceMode = false): ApiManager {
  if (!instance) {
    instance = new ApiManager(loadBalanceMode);
  }
  return instance;
}

export function resetApiManager(): void {
  instance = null;
}

export type {
  ProviderConfig,
  ApiCompletionRequest,
  ApiCompletionResponse,
  ApiLogEntry,
  ProviderHealth,
  ApiRequestMessage,
};
export { ApiError, ApiManager };
