interface CloudflareMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CloudflareOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

interface CloudflareResult {
  response?: string;
  answer?: string;
}

interface CloudflareError {
  errors?: { message: string }[];
}

export class CloudflareProvider {
  private accountId: string;
  private apiToken: string;
  private defaultModel: string;
  private timeoutMs: number;
  private credentialsValid: boolean | null;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken =
      process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || '';
    this.defaultModel =
      process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    this.timeoutMs = 120000;
    this.credentialsValid = null;
  }

  isConfigured(): boolean {
    return !!this.accountId && !!this.apiToken;
  }

  async validateCredentials(): Promise<boolean> {
    if (this.credentialsValid !== null) return this.credentialsValid;
    if (!this.isConfigured()) {
      this.credentialsValid = false;
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models`,
        {
          headers: { 'Authorization': `Bearer ${this.apiToken}` },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      this.credentialsValid = res.ok;
      return this.credentialsValid;
    } catch {
      this.credentialsValid = false;
      return false;
    }
  }

  async generate(
    messages: CloudflareMessage[],
    options?: CloudflareOptions
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudflare not configured: missing CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN'
      );
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.defaultModel}`;

    const body: Record<string, unknown> = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }
    if (options?.temperature) {
      body.temperature = options.temperature;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let details = '';
        try {
          const errData: CloudflareError = await res.json();
          details = errData.errors?.[0]?.message || '';
        } catch {
          details = await res.text().catch(() => 'unknown');
        }
        const isRetryable = res.status === 429 || res.status >= 500;
        throw Object.assign(
          new Error(
            `[Cloudflare] ${res.status}${details ? `: ${details.slice(0, 300)}` : ''}`
          ),
          { status: res.status, retryable: isRetryable }
        );
      }

      const data: { result?: CloudflareResult; success?: boolean } = await res.json();
      const content = data.result?.response || data.result?.answer;

      if (!content) {
        throw Object.assign(
          new Error('[Cloudflare] Empty response from API'),
          { status: 0, retryable: true }
        );
      }

      return content;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw Object.assign(
          new Error(`[Cloudflare] Request timed out after ${options?.timeout ?? this.timeoutMs}ms`),
          { status: 0, retryable: true }
        );
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw Object.assign(
          new Error(`[Cloudflare] Network error: ${err.message}`),
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
