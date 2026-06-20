interface HuggingFaceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface HuggingFaceOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class HuggingFaceProvider {
  private apiKey: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
    this.defaultModel =
      process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
    this.timeoutMs = 120000;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generate(
    messages: HuggingFaceMessage[],
    options?: HuggingFaceOptions
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'HuggingFace not configured: missing HUGGINGFACE_API_KEY'
      );
    }

    const url = `https://api-inference.huggingface.co/models/${this.defaultModel}`;

    const systemMsg = messages.find((m) => m.role === 'system');
    const userMsgs = messages.filter((m) => m.role !== 'system');

    const conversationHistory = userMsgs
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = systemMsg
      ? `[System]\n${systemMsg.content}\n[/System]\n\n${conversationHistory}\n\nAssistant:`
      : `${conversationHistory}\n\nAssistant:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.timeoutMs
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
            return_full_text: false,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => 'unknown');
        const isRetryable = res.status === 429 || res.status >= 500;
        throw Object.assign(
          new Error(
            `[HuggingFace] ${res.status}: ${errBody.slice(0, 300)}`
          ),
          { status: res.status, retryable: isRetryable }
        );
      }

      const data: { generated_text?: string }[] | { error?: string } =
        await res.json();

      if ('error' in data) {
        throw Object.assign(
          new Error(`[HuggingFace] ${data.error}`),
          { status: 0, retryable: true }
        );
      }

      const content = Array.isArray(data) ? data[0]?.generated_text : null;

      if (!content) {
        throw Object.assign(
          new Error('[HuggingFace] Empty response from API'),
          { status: 0, retryable: true }
        );
      }

      return content.trim();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw Object.assign(
          new Error(
            `[HuggingFace] Request timed out after ${options?.timeout ?? this.timeoutMs}ms`
          ),
          { status: 0, retryable: true }
        );
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw Object.assign(
          new Error(`[HuggingFace] Network error: ${err.message}`),
          { status: 0, retryable: true }
        );
      }
      throw err;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured();
  }

  getModel(): string {
    return this.defaultModel;
  }
}
