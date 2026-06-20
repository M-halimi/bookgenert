export interface AIProvider {
  generate(prompt: string, system?: string): Promise<string>;
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  model: string;
  priority: number;
  available: boolean;
}

export interface HealthCheckResult {
  ollama: boolean;
  groq: boolean;
  gemini: boolean;
  openrouter: boolean;
  cloudflare: boolean;
  huggingface: boolean;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export type AIProviderName =
  | 'ollama'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'cloudflare'
  | 'huggingface'
  | 'cache'
  | 'none';

export interface AIProviderStatus {
  name: AIProviderName;
  available: boolean;
  latencyMs: number;
  error: string | null;
}

export interface ProviderError {
  provider: AIProviderName;
  message: string;
  type: ProviderErrorType;
  status: number;
}

export type ProviderErrorType =
  | 'rate_limit'
  | 'token_limit'
  | 'payload_too_large'
  | 'timeout'
  | 'network'
  | 'auth'
  | 'not_found'
  | 'server_error'
  | 'empty_response'
  | 'unknown';

export interface RouterAttempt {
  provider: AIProviderName;
  attempt: number;
  success: boolean;
  latencyMs: number;
  error: ProviderError | null;
}

export interface RouterResult {
  content: string;
  provider: AIProviderName;
  model: string;
  latencyMs: number;
  attempts: RouterAttempt[];
}

export interface BookOutline {
  title: string;
  description: string;
  category: string;
  tagline: string;
  chapters: ChapterOutline[];
}

export interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  estimatedWords: number;
}

export interface GeneratedChapter {
  number: number;
  title: string;
  content: string;
  summary: string;
  keyTakeaway: string;
  wordCount: number;
}

export interface GeneratedBook {
  outline: BookOutline;
  chapters: GeneratedChapter[];
  fullContent: string;
  provider: string;
  model: string;
  generationTimeMs: number;
}
