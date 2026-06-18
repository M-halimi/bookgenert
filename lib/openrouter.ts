const API_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;

const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'cohere/command-r7b-12-2024:free',
];

export async function completeWithOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; modelIndex?: number; singleShot?: boolean }
): Promise<string | null> {
  if (!API_KEY) {
    console.error('[OpenRouter] No API key configured');
    return null;
  }

  const idx = options?.modelIndex ?? 0;
  if (idx >= FREE_MODELS.length) return null;

  const model = FREE_MODELS[idx];

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://bookflix.app',
        'X-Title': 'BookFlix',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      console.error(`[OpenRouter] ${model} returned ${res.status}: ${errBody.slice(0, 300)}`);
      if (options?.singleShot) return null;
      return completeWithOpenRouter(systemPrompt, userPrompt, { ...options, modelIndex: idx + 1 });
    }

    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    const content = data.choices?.[0]?.message?.content || null;
    if (!content) {
      console.warn(`[OpenRouter] ${model} returned empty content`);
      if (options?.singleShot) return null;
      return completeWithOpenRouter(systemPrompt, userPrompt, { ...options, modelIndex: idx + 1 });
    }
    return content;
  } catch (err) {
    console.error(`[OpenRouter] ${model} threw:`, err instanceof Error ? err.message : String(err));
    if (options?.singleShot) return null;
    return completeWithOpenRouter(systemPrompt, userPrompt, { ...options, modelIndex: idx + 1 });
  }
}

export { FREE_MODELS };
