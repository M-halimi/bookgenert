import { AIProvider, AIGenerationOptions } from '../types';

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaTag {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models?: OllamaTag[];
}

interface OllamaErrorBody {
  error: string;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private defaultModel: string;
  private maxRetries: number;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3';
    this.maxRetries = 3;
    this.timeoutMs = 120000;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    return this.generateWithOptions(prompt, system, {});
  }

  async generateWithOptions(
    userPrompt: string,
    systemPrompt?: string,
    options?: AIGenerationOptions
  ): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    const timeout = options?.timeout ?? this.timeoutMs;
    const retries = options?.retries ?? this.maxRetries;

    const fullPrompt = systemPrompt
      ? `[System Instruction]\n${systemPrompt}\n[/System Instruction]\n\n${userPrompt}`
      : userPrompt;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.defaultModel,
            prompt: fullPrompt,
            stream: false,
            options: {
              temperature: options?.temperature ?? 0.7,
              num_predict: options?.maxTokens ?? 4096,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text().catch(() => 'unknown error');
          throw new Error(
            `Ollama API error (${res.status}): ${errBody.slice(0, 500)}`
          );
        }

        const data: OllamaGenerateResponse | OllamaErrorBody = await res.json();

        if ('error' in data) {
          throw new Error(`Ollama error: ${data.error}`);
        }

        if (!data.response) {
          throw new Error('Ollama returned empty response');
        }

        const duration = data.total_duration
          ? `${(data.total_duration / 1e9).toFixed(2)}s`
          : 'unknown';
        console.log(
          `[Ollama] ${data.model} | ${data.eval_count || 0} tokens | ${duration}`
        );

        return data.response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (lastError.name === 'AbortError') {
          console.error(
            `[Ollama] Request timed out (${timeout}ms) on attempt ${attempt}/${retries}`
          );
        } else if (
          lastError.message.includes('fetch') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('ERR_CONNECTION')
        ) {
          console.error(
            `[Ollama] Connection failed on attempt ${attempt}/${retries}: ${lastError.message}`
          );
        } else {
          console.error(
            `[Ollama] Attempt ${attempt}/${retries} failed: ${lastError.message}`
          );
        }

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw new Error(
      `Ollama failed after ${retries} retries: ${lastError?.message || 'Unknown error'}`
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data: OllamaTagsResponse = await res.json();
      return data.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
