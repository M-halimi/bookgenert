import { OllamaProvider } from './providers/ollama';
import { getApiManager } from '../api-manager';
import {
  AIProvider,
  AIGenerationOptions,
  AIProviderStatus,
  AIProviderName,
  HealthCheckResult,
} from './types';

export class AIService implements AIProvider {
  private ollama: OllamaProvider;
  private checkedAvailability: boolean = false;
  private ollamaAvailableCache: boolean = false;

  constructor() {
    this.ollama = new OllamaProvider();
  }

  async generate(prompt: string, system?: string): Promise<string> {
    return this.generateWithFallback(prompt, system, {});
  }

  async generateWithFallback(
    prompt: string,
    system?: string,
    options?: AIGenerationOptions
  ): Promise<string> {
    const providers: { name: AIProviderName; execute: () => Promise<string> }[] = [
      {
        name: 'ollama',
        execute: () => this.ollama.generateWithOptions(prompt, system, options),
      },
      {
        name: 'groq',
        execute: async () => {
          const result = await getApiManager().complete({
            messages: [
              ...(system ? [{ role: 'system' as const, content: system }] : []),
              { role: 'user' as const, content: prompt },
            ],
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
          });
          return result.content;
        },
      },
      {
        name: 'gemini',
        execute: async () => {
          const result = await getApiManager().complete({
            messages: [
              ...(system ? [{ role: 'system' as const, content: system }] : []),
              { role: 'user' as const, content: prompt },
            ],
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
          });
          return result.content;
        },
      },
      {
        name: 'openrouter',
        execute: async () => {
          const result = await getApiManager().complete({
            messages: [
              ...(system ? [{ role: 'system' as const, content: system }] : []),
              { role: 'user' as const, content: prompt },
            ],
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
          });
          return result.content;
        },
      },
    ];

    const errors: { name: AIProviderName; error: string }[] = [];

    for (const provider of providers) {
      try {
        console.log(`[AIService] Trying provider: ${provider.name}`);
        const result = await provider.execute();
        console.log(
          `[AIService] Success with provider: ${provider.name}`
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[AIService] Provider ${provider.name} failed: ${message}`
        );
        errors.push({ name: provider.name, error: message });
      }
    }

    const errorSummary = errors
      .map((e) => `[${e.name}] ${e.error}`)
      .join(' | ');

    throw new Error(
      `All AI providers exhausted. Errors: ${errorSummary}`
    );
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const [ollamaStatus, groqStatus, geminiStatus, openrouterStatus, cloudflareStatus, huggingfaceStatus] =
      await Promise.all([
        this.checkOllama(),
        this.checkGroq(),
        this.checkGemini(),
        this.checkOpenRouter(),
        this.checkCloudflare(),
        this.checkHuggingFace(),
      ]);

    return {
      ollama: ollamaStatus,
      groq: groqStatus,
      gemini: geminiStatus,
      openrouter: openrouterStatus,
      cloudflare: cloudflareStatus,
      huggingface: huggingfaceStatus,
    };
  }

  async getProviderStatuses(): Promise<AIProviderStatus[]> {
    const checks: [AIProviderName, () => Promise<boolean>][] = [
      ['ollama', () => this.checkOllama()],
      ['groq', () => this.checkGroq()],
      ['cloudflare', () => this.checkCloudflare()],
      ['openrouter', () => this.checkOpenRouter()],
      ['huggingface', () => this.checkHuggingFace()],
      ['gemini', () => this.checkGemini()],
    ];

    const results: AIProviderStatus[] = [];

    for (const [name, checkFn] of checks) {
      const start = Date.now();
      try {
        const available = await checkFn();
        results.push({
          name,
          available,
          latencyMs: Date.now() - start,
          error: null,
        });
      } catch (err) {
        results.push({
          name,
          available: false,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  private async checkOllama(): Promise<boolean> {
    return this.ollama.isAvailable();
  }

  private async checkGroq(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY;
  }

  private async checkGemini(): Promise<boolean> {
    return !!process.env.GEMINI_API_KEY;
  }

  private async checkOpenRouter(): Promise<boolean> {
    return !!process.env.OPENROUTER_API_KEY;
  }

  private async checkCloudflare(): Promise<boolean> {
    return !!(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY) &&
           !!process.env.CLOUDFLARE_ACCOUNT_ID;
  }

  private async checkHuggingFace(): Promise<boolean> {
    return !!process.env.HUGGINGFACE_API_KEY;
  }

  getOllamaProvider(): OllamaProvider {
    return this.ollama;
  }
}

let serviceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!serviceInstance) {
    serviceInstance = new AIService();
  }
  return serviceInstance;
}

export function resetAIService(): void {
  serviceInstance = null;
}
