import { routeCompletion } from '@/lib/ai/ai-router';
import type { Locale } from '@/lib/i18n/config';

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
};

function buildTranslatePrompt(text: string, targetLang: Locale): string {
  return `Translate the following text into ${LOCALE_NAMES[targetLang]}. Return ONLY the translated text, no explanations, no markdown, no code fences.

Original: "${text}"

Translation:`;
}

export async function translateText(
  text: string,
  targetLang: Locale,
): Promise<string> {
  if (!text || !text.trim()) return '';

  const prompt = buildTranslatePrompt(text, targetLang);
  try {
    const result = await routeCompletion({
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate accurately and naturally into ${LOCALE_NAMES[targetLang]}. Return only the translated text.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
      timeout: 30000,
    });
    return result.content.replace(/^["']|["']$/g, '').trim();
  } catch (err) {
    console.error(`[TranslationService] Failed to translate to ${targetLang}:`, err);
    return text;
  }
}

export async function translateMultilingualField(
  field: Record<string, string> | null | undefined,
  sourceLang: Locale,
  targetLangs: Locale[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = { ...(field ?? {}) };
  const sourceText = result[sourceLang] || result.en || '';

  if (!sourceText) return result;

  for (const lang of targetLangs) {
    if (result[lang] && result[lang].trim()) continue;
    result[lang] = await translateText(sourceText, lang);
  }

  return result;
}

export async function ensureMultilingualField(
  field: Record<string, string> | string | null | undefined,
): Promise<Record<string, string>> {
  const langs: Locale[] = ['en', 'fr', 'ar', 'de'];

  if (!field) {
    return { en: '', fr: '', ar: '', de: '' };
  }

  if (typeof field === 'string') {
    const result: Record<string, string> = { en: field, fr: '', ar: '', de: '' };
    const toTranslate = langs.filter((l) => l !== 'en');
    for (const lang of toTranslate) {
      result[lang] = await translateText(field, lang);
    }
    return result;
  }

  const result = { ...field } as Record<string, string>;
  const existingLangs = Object.keys(result).filter((k) => langs.includes(k as Locale)) as Locale[];

  const missingLangs = langs.filter((l) => !result[l] || !result[l].trim());
  if (missingLangs.length === 0) return result;

  const sourceLang = existingLangs.includes('en') ? 'en' : existingLangs[0];
  const sourceText = result[sourceLang];
  if (!sourceText) return result;

  for (const lang of missingLangs) {
    result[lang] = await translateText(sourceText, lang);
  }

  return result;
}
