import {
  AIProviderName,
  ProviderError,
  RouterAttempt,
  RouterResult,
} from './types';
import { getCache } from './cache';
import { getRouterState } from './router-state';
import { CloudflareProvider } from './providers/cloudflare';
import { HuggingFaceProvider } from './providers/huggingface';

interface RouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RouterOptions {
  messages: RouterMessage[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

interface ProviderHandler {
  name: AIProviderName;
  model: string;
  isConfigured: () => boolean;
  isHealthy?: () => Promise<boolean>;
  execute: (
    messages: RouterMessage[],
    options: RouterOptions
  ) => Promise<string>;
}

const MAX_RETRIES = 2;
const BASE_DELAY = 1000;
const MAX_TOKENS_SAFE = 8192;

const GROQ_MAX_INPUT_TOKENS = 6000;
const OPENROUTER_MAX_INPUT_TOKENS = 32000;

function jitter(delayMs: number): number {
  return delayMs + Math.random() * delayMs * 0.5;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateMessagesTokenCount(messages: RouterMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokenCount(m.content), 0);
}

function compressPrompt(messages: RouterMessage[], maxInputTokens: number): RouterMessage[] {
  const totalTokens = estimateMessagesTokenCount(messages);
  if (totalTokens <= maxInputTokens) return messages;

  return messages.map((m) => {
    if (m.role !== 'system') return m;
    const tokenCount = estimateTokenCount(m.content);
    if (tokenCount <= maxInputTokens * 0.5) return m;

    const budget = Math.floor(maxInputTokens * 0.5 * 4);
    const lines = m.content.split('\n');
    const kept: string[] = [];
    let keptChars = 0;

    const priorityLines = lines.filter((l) =>
      l.includes('Output STRICT JSON') ||
      l.includes('Return ONLY valid JSON') ||
      l.includes('episodes') ||
      l.includes('"content"') ||
      l.includes('ABSOLUTE RULES') ||
      l.includes('CRITICAL RULES') ||
      l.includes('BOOK STRUCTURE')
    );

    for (const line of priorityLines) {
      if (keptChars + line.length + 1 <= budget) {
        kept.push(line);
        keptChars += line.length + 1;
      }
    }

    if (keptChars < budget) {
      for (const line of lines) {
        if (kept.includes(line)) continue;
        if (keptChars + line.length + 1 <= budget) {
          kept.push(line);
          keptChars += line.length + 1;
        } else {
          break;
        }
      }
    }

    return { ...m, content: kept.join('\n') };
  });
}

function classifyError(err: unknown, provider: AIProviderName): ProviderError {
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number }).status ?? 0;
  const lowerMsg = message.toLowerCase();

  if (status === 413 || lowerMsg.includes('request too large') || lowerMsg.includes('payload too large')) {
    return { provider, message, type: 'payload_too_large', status };
  }
  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('quota') || lowerMsg.includes('too many requests')) {
    return { provider, message, type: 'rate_limit', status };
  }
  if (
    lowerMsg.includes('token limit') ||
    lowerMsg.includes('max tokens') ||
    lowerMsg.includes('context length') ||
    lowerMsg.includes('maximum context')
  ) {
    return { provider, message, type: 'token_limit', status };
  }
  if (
    status === 0 &&
    (lowerMsg.includes('timeout') || lowerMsg.includes('abort'))
  ) {
    return { provider, message, type: 'timeout', status };
  }
  if (
    status === 0 &&
    (lowerMsg.includes('fetch') ||
      lowerMsg.includes('econnrefused') ||
      lowerMsg.includes('network') ||
      lowerMsg.includes('enotfound') ||
      lowerMsg.includes('econnreset'))
  ) {
    return { provider, message, type: 'network', status };
  }
  if (status === 401 || status === 403 || lowerMsg.includes('unauthorized') || lowerMsg.includes('forbidden') || lowerMsg.includes('authentication')) {
    return { provider, message, type: 'auth', status };
  }
  if (status === 404 || lowerMsg.includes('not found') || lowerMsg.includes('no endpoints')) {
    return { provider, message, type: 'not_found', status };
  }
  if (status >= 500) {
    return { provider, message, type: 'server_error', status };
  }
  if (lowerMsg.includes('empty response')) {
    return { provider, message, type: 'empty_response', status };
  }
  if (lowerMsg.includes('model not') || lowerMsg.includes('does not exist')) {
    return { provider, message, type: 'not_found', status };
  }

  return { provider, message, type: 'unknown', status };
}

function getBackoff(error: ProviderError, attempt: number): number {
  if (error.type === 'rate_limit' && error.status === 429) {
    const match = error.message.match(/retry-after[=: ]+(\d+)/i);
    if (match) return parseInt(match[1], 10) * 1000;
    const match2 = error.message.match(/try again in (\d+)s/i);
    if (match2) return parseInt(match2[1], 10) * 1000;
  }
  return jitter(BASE_DELAY * Math.pow(2, attempt));
}

function shouldRetry(error: ProviderError, attempt: number): boolean {
  if (attempt >= MAX_RETRIES) return false;
  if (error.type === 'auth') return false;
  if (error.type === 'not_found') return false;
  if (error.type === 'token_limit') return false;
  if (error.type === 'payload_too_large') return false;
  if (error.type === 'empty_response') return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpenAICompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: RouterMessage[],
  options: RouterOptions,
  providerName: AIProviderName,
  extraHeaders?: Record<string, string>
): Promise<string> {
  const safeMaxTokens = Math.min(options.maxTokens ?? MAX_TOKENS_SAFE, MAX_TOKENS_SAFE);
  return fetchCompletion(
    baseUrl,
    {
      model,
      messages,
      max_tokens: safeMaxTokens,
      temperature: options.temperature ?? 0.7,
    },
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    providerName,
    options.timeout ?? 180000
  );
}

async function fetchCompletion(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  providerName: AIProviderName,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      throw Object.assign(
        new Error(`[${providerName}] ${res.status}: ${errBody.slice(0, 400)}`),
        { status: res.status }
      );
    }

    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw Object.assign(
        new Error(`[${providerName}] Empty response`),
        { status: 0 }
      );
    }

    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw Object.assign(
        new Error(`[${providerName}] Request timed out after ${timeoutMs}ms`),
        { status: 0 }
      );
    }
    if (err instanceof TypeError && (
      err.message.includes('fetch') ||
      err.message.includes('network')
    )) {
      throw Object.assign(
        new Error(`[${providerName}] Network error: ${err.message}`),
        { status: 0 }
      );
    }
    throw err;
  }
}

const OPENROUTER_STABLE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-nemo',
  'cohere/command-r7b-12-2024',
];

async function validateCloudflareCredentials(): Promise<boolean> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY;
  if (!accountId || !apiToken) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models`,
      {
        headers: { 'Authorization': `Bearer ${apiToken}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

const providerRateLimits = new Map<AIProviderName, number>();

function checkProviderRateLimit(name: AIProviderName, minIntervalMs: number): boolean {
  const lastCall = providerRateLimits.get(name);
  const now = Date.now();
  if (lastCall && (now - lastCall) < minIntervalMs) {
    return false;
  }
  providerRateLimits.set(name, now);
  return true;
}

function discoverHandlers(): ProviderHandler[] {
  const handlers: ProviderHandler[] = [];
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    handlers.push({
      name: 'groq',
      model: groqModel,
      isConfigured: () => !!process.env.GROQ_API_KEY,
      execute: (messages, options) => {
        const compressed = compressPrompt(messages, GROQ_MAX_INPUT_TOKENS);
        return getOpenAICompletion(
          'https://api.groq.com/openai/v1/chat/completions',
          groqKey,
          groqModel,
          compressed,
          { ...options, maxTokens: Math.min(options.maxTokens ?? MAX_TOKENS_SAFE, MAX_TOKENS_SAFE) },
          'groq'
        );
      },
    });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const primaryModel = process.env.OPENROUTER_MODEL || OPENROUTER_STABLE_MODELS[0];
    const modelQueue = [
      primaryModel,
      ...OPENROUTER_STABLE_MODELS.filter((m) => m !== primaryModel),
    ];

    for (const orModel of modelQueue) {
      const routerState = getRouterState();
      if (routerState.hasModelFailed('openrouter', orModel)) continue;

      handlers.push({
        name: 'openrouter',
        model: orModel,
        isConfigured: () => true,
        execute: (messages, options) => {
          if (!checkProviderRateLimit('openrouter', 2000)) {
            throw Object.assign(
              new Error(`[OpenRouter] Rate limit throttled — waiting between requests`),
              { status: 429 }
            );
          }
          const compressed = compressPrompt(messages, OPENROUTER_MAX_INPUT_TOKENS);
          return getOpenAICompletion(
            'https://openrouter.ai/api/v1/chat/completions',
            openRouterKey,
            orModel,
            compressed,
            options,
            'openrouter',
            {
              'HTTP-Referer': 'https://bookflix.app',
              'X-Title': 'BookFlix',
            }
          );
        },
      });
    }
  }

  const cfProvider = new CloudflareProvider();
  if (cfProvider.isConfigured()) {
    // Try gemma-4-26b first (newer, more capable model)
    const gemmaProvider = new CloudflareProvider('@cf/google/gemma-4-26b-a4b-it');
    if (gemmaProvider.getModel() !== cfProvider.getModel()) {
      handlers.push({
        name: 'cloudflare',
        model: gemmaProvider.getModel(),
        isConfigured: () => gemmaProvider.isConfigured(),
        isHealthy: async () => validateCloudflareCredentials(),
        execute: async (messages, options) => {
          const healthy = await validateCloudflareCredentials();
          if (!healthy) {
            throw Object.assign(
              new Error('[Cloudflare] Invalid API credentials — skipping provider'),
              { status: 401 }
            );
          }
          return gemmaProvider.generate(messages, options);
        },
      });
    }

    // Fallback to configured/default model
    handlers.push({
      name: 'cloudflare',
      model: cfProvider.getModel(),
      isConfigured: () => cfProvider.isConfigured(),
      isHealthy: async () => validateCloudflareCredentials(),
      execute: async (messages, options) => {
        const healthy = await validateCloudflareCredentials();
        if (!healthy) {
          throw Object.assign(
            new Error('[Cloudflare] Invalid API credentials — skipping provider'),
            { status: 401 }
          );
        }
        return cfProvider.generate(messages, options);
      },
    });
  }

  const hfProvider = new HuggingFaceProvider();
  if (hfProvider.isConfigured()) {
    handlers.push({
      name: 'huggingface',
      model: hfProvider.getModel(),
      isConfigured: () => hfProvider.isConfigured(),
      execute: (messages, options) => hfProvider.generate(messages, options),
    });
  }

  return handlers;
}

async function tryOllama(
  messages: RouterMessage[],
  options: RouterOptions
): Promise<string> {
  const ollamaUrl = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';

  try {
    const healthController = new AbortController();
    const healthTimeout = setTimeout(() => healthController.abort(), 3000);
    const healthRes = await fetch(`${ollamaUrl}/api/tags`, {
      signal: healthController.signal,
    });
    clearTimeout(healthTimeout);

    if (!healthRes.ok) {
      throw Object.assign(
        new Error('[Ollama] Health check failed — service not available'),
        { status: 0 }
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Health check')) throw err;
    throw Object.assign(
      new Error('[Ollama] Connection refused — is ollama serve running?'),
      { status: 0 }
    );
  }

  if (!checkProviderRateLimit('ollama', 1000)) {
    throw Object.assign(
      new Error('[Ollama] Rate limit throttled'),
      { status: 429 }
    );
  }

  const combinedPrompt = messages
    .map((m) =>
      m.role === 'system'
        ? `[System Instruction]\n${m.content}\n[/System Instruction]`
        : m.content
    )
    .join('\n\n');

  return fetchCompletion(
    `${ollamaUrl}/api/generate`,
    {
      model: ollamaModel,
      prompt: combinedPrompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: Math.min(options.maxTokens ?? MAX_TOKENS_SAFE, MAX_TOKENS_SAFE),
      },
    },
    { 'Content-Type': 'application/json' },
    'ollama' as AIProviderName,
    options.timeout ?? 180000
  );
}

function logSwitch(from: AIProviderName, to: AIProviderName, reason: string): void {
  console.log(
    `[AIRouter] Switching provider: ${from} \u2192 ${to} | Reason: ${reason}`
  );
}

function logAttempt(
  provider: AIProviderName,
  attempt: number,
  status: 'trying' | 'success' | 'failed' | 'skipped',
  detail?: string
): void {
  const icon =
    status === 'success' ? '\u2713' :
    status === 'failed' ? '\u2717' :
    status === 'skipped' ? '\u2014' : '\u2192';
  console.log(
    `[AIRouter] ${icon} ${provider} attempt ${attempt + 1}/${MAX_RETRIES}${detail ? ` | ${detail}` : ''}`
  );
}

export async function routeCompletion(
  options: RouterOptions
): Promise<RouterResult> {
  const startTime = Date.now();
  const attempts: RouterAttempt[] = [];
  const cache = getCache();
  const routerState = getRouterState();

  const cacheModelKey = options.messages.find(m => m.role === 'system')?.content?.slice(0, 50) || 'default';

  const cacheHit = cache.get(options.messages, cacheModelKey);
  if (cacheHit.hit && cacheHit.content) {
    console.log(
      `[AIRouter] \u2713 cache HIT | ${cacheHit.content.length} chars | ${cache.getStats().hitRate} hit rate`
    );
    return {
      content: cacheHit.content,
      provider: 'cache' as AIProviderName,
      model: 'cached',
      latencyMs: Date.now() - startTime,
      attempts: [],
    };
  }

  const handlers = discoverHandlers();

  if (handlers.length === 0) {
    console.warn('[AIRouter] No cloud AI providers configured');
    try {
      const ollamaContent = await tryOllama(options.messages, options);
      cache.set(options.messages, cacheModelKey, ollamaContent, true);
      return {
        content: ollamaContent,
        provider: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3',
        latencyMs: Date.now() - startTime,
        attempts: [],
      };
    } catch {
      return {
        content: '',
        provider: 'none' as AIProviderName,
        model: 'none',
        latencyMs: Date.now() - startTime,
        attempts,
      };
    }
  }

  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];

    if (routerState.isBlacklisted(handler.name)) {
      logAttempt(handler.name, 0, 'skipped', `blacklisted: ${routerState.getBlacklistReason(handler.name)}`);
      continue;
    }

    if (routerState.isOnCooldown(handler.name)) {
      const remaining = routerState.getCooldownRemaining(handler.name);
      logAttempt(handler.name, 0, 'skipped', `cooldown ${(remaining / 1000).toFixed(0)}s remaining`);
      continue;
    }

    if (handler.isHealthy) {
      try {
        const healthy = await handler.isHealthy();
        if (!healthy) {
          logAttempt(handler.name, 0, 'skipped', 'health check failed — invalid credentials');
          routerState.blacklistProvider(handler.name, 'Health check failed', 'auth');
          continue;
        }
      } catch {
        logAttempt(handler.name, 0, 'skipped', 'health check error — skipping');
        continue;
      }
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const attemptStart = Date.now();
      logAttempt(handler.name, attempt, 'trying');

      try {
        const content = await handler.execute(options.messages, options);

        attempts.push({
          provider: handler.name,
          attempt,
          success: true,
          latencyMs: Date.now() - attemptStart,
          error: null,
        });

        logAttempt(handler.name, attempt, 'success', `${Date.now() - attemptStart}ms`);

        cache.set(options.messages, cacheModelKey, content, true);

        return {
          content,
          provider: handler.name,
          model: handler.model,
          latencyMs: Date.now() - startTime,
          attempts,
        };
      } catch (err) {
        const error = classifyError(err, handler.name);

        attempts.push({
          provider: handler.name,
          attempt,
          success: false,
          latencyMs: Date.now() - attemptStart,
          error,
        });

        logAttempt(
          handler.name,
          attempt,
          'failed',
          `${error.type}: ${error.message.slice(0, 120)}`
        );

        if (error.type === 'payload_too_large') {
          if (attempt < MAX_RETRIES - 1) {
            const compressed = compressPrompt(options.messages, 3000);
            const compressedContent = await handler.execute(compressed, options);
            attempts.push({
              provider: handler.name,
              attempt: attempt + 1,
              success: true,
              latencyMs: Date.now() - attemptStart,
              error: null,
            });
            cache.set(options.messages, cacheModelKey, compressedContent, true);
            return {
              content: compressedContent,
              provider: handler.name,
              model: handler.model,
              latencyMs: Date.now() - startTime,
              attempts,
            };
          }
          break;
        }

        if (error.type === 'auth') {
          routerState.blacklistProvider(handler.name, error.message, 'auth');
          logAttempt(handler.name, attempt, 'skipped', 'permanently blacklisted (auth)');
          break;
        }

        if (error.type === 'not_found') {
          routerState.recordFailedModel(handler.name, handler.model);
          logAttempt(handler.name, attempt, 'skipped', `model/endpoint not found: ${handler.model}`);
          if (handler.name !== 'openrouter') {
            routerState.blacklistProvider(handler.name, error.message, 'not_found');
          }
          break;
        }

        if (error.type === 'rate_limit') {
          const backoffMs = getBackoff(error, attempt);
          routerState.setCooldown(handler.name, Math.min(backoffMs, 30000), error.message);
          logAttempt(handler.name, attempt, 'trying', `rate limited, waiting ${(backoffMs / 1000).toFixed(1)}s`);
          await delay(backoffMs);
          continue;
        }

        if (shouldRetry(error, attempt)) {
          const backoffMs = getBackoff(error, attempt);
          logAttempt(handler.name, attempt, 'trying', `retrying in ${(backoffMs / 1000).toFixed(1)}s`);
          await delay(backoffMs);
          continue;
        }

        break;
      }
    }

    if (i < handlers.length - 1) {
      const nextHandler = handlers.slice(i + 1).find(h =>
        !routerState.isBlacklisted(h.name) && !routerState.isOnCooldown(h.name)
      );
      if (nextHandler) {
        const lastError = attempts
          .filter((a) => a.provider === handler.name && !a.success)
          .map((a) => a.error?.type)
          .filter(Boolean)
          .pop();
        logSwitch(handler.name, nextHandler.name, lastError || 'max retries exceeded');
      }
    }
  }

  const totalMs = Date.now() - startTime;

  const triedProviders = new Set(attempts.map((a) => a.provider));
  const skippedProviders = handlers
    .map((h) => h.name)
    .filter((name) => !triedProviders.has(name));

  if (skippedProviders.length > 0) {
    const skippedList = Array.from(new Set(skippedProviders)).join(', ');
    console.warn(
      `[AIRouter] Providers never tried: [${skippedList}] — forcing retry with reset state`
    );
    routerState.reset();

    for (const handler of handlers) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const attemptStart = Date.now();
        logAttempt(handler.name, attempt, 'trying', 'force retry');

        try {
          const content = await handler.execute(options.messages, options);
          attempts.push({
            provider: handler.name,
            attempt,
            success: true,
            latencyMs: Date.now() - attemptStart,
            error: null,
          });
          logAttempt(handler.name, attempt, 'success', `${Date.now() - attemptStart}ms`);
          cache.set(options.messages, cacheModelKey, content, true);
          return {
            content,
            provider: handler.name,
            model: handler.model,
            latencyMs: Date.now() - startTime,
            attempts,
          };
        } catch (err) {
          const error = classifyError(err, handler.name);
          attempts.push({
            provider: handler.name,
            attempt,
            success: false,
            latencyMs: Date.now() - attemptStart,
            error,
          });
          logAttempt(handler.name, attempt, 'failed', `${error.type}: ${error.message.slice(0, 120)}`);

          if (!shouldRetry(error, attempt) || error.type === 'rate_limit') {
            break;
          }
          const backoffMs = getBackoff(error, attempt);
          await delay(backoffMs);
        }
      }
    }
  }

  console.error(
    `[AIRouter] All cloud providers failed after ${attempts.length} attempts (${totalMs}ms)`
  );

  cache.set(options.messages, cacheModelKey, '', false);

  try {
    const content = await tryOllama(options.messages, options);
    console.log('[AIRouter] \u2713 Fallback to Ollama succeeded');
    cache.set(options.messages, cacheModelKey, content, true);
    return {
      content,
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL || 'llama3',
      latencyMs: Date.now() - startTime,
      attempts,
    };
  } catch {
    console.warn('[AIRouter] Ollama fallback also failed');
  }

  console.warn('[AIRouter] All providers exhausted — returning empty result');
  return {
    content: '',
    provider: 'none' as AIProviderName,
    model: 'none',
    latencyMs: totalMs,
    attempts,
  };
}

export async function routeWithPartialSuccess(
  options: RouterOptions
): Promise<RouterResult> {
  const result = await routeCompletion(options);

  if (!result.content && result.attempts.length > 0) {
    const lastError = result.attempts
      .filter((a) => !a.success)
      .pop();
    console.warn(
      `[AIRouter] Returning empty result. Last attempt: ${lastError?.provider} | ${lastError?.error?.type ?? 'unknown'}`
    );
  }

  return result;
}

export type { RouterMessage, RouterOptions, RouterResult };
