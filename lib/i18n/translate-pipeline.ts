import type { LangCode } from '@/lib/groq';
import { routeCompletion } from '@/lib/ai/ai-router';
import type { RouterResult } from '@/lib/ai/types';

const LANG_NAMES: Record<LangCode, string> = {
  en: 'English',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
};

const TRANSLATION_SYSTEM_PROMPT = `You are a strict single-language literary translator. Your ONLY output is the translated text in the EXACT target language.

ABSOLUTE RULES — VIOLATION IS NOT ACCEPTABLE:
1. ZERO words in any language other than the target language — not even one word
2. If you cannot translate a word, transliterate it into the target script
3. No English, no source language fragments, no code-switching
4. Translate EVERYTHING — titles, names, terms, idioms, cultural references
5. Adapt to natural phrasing in the target language
6. For Arabic: use proper Arabic script, Arabic numerals (123), correct punctuation
7. Return ONLY the translated text — no quotes, no backticks, no explanations
8. NOTHING ELSE. ONLY the translation.`;

export async function translateField(
  text: string,
  targetLang: LangCode,
  context?: string,
): Promise<string> {
  if (!text || !text.trim()) return '';

  const contextHint = context
    ? `\n\nContext (chapter/section title): ${context}`
    : '';

  const userPrompt = `Translate the following text into ${LANG_NAMES[targetLang]}. Return ONLY the translated text, no explanations.${contextHint}

Source text:
"""
${text}
"""

Translation in ${LANG_NAMES[targetLang]}:`;

  try {
    const result: RouterResult = await routeCompletion({
      messages: [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 4096,
      timeout: 60000,
    });

    const translated = result.content
      .replace(/^["']|["']$/g, '')
      .replace(/```/g, '')
      .trim();

    if (translated && translated !== text) return translated;
    console.warn(`[TranslatePipeline] AI returned no meaningful translation for ${targetLang}, retrying...`);
    return '';
  } catch (err) {
    console.error(`[TranslatePipeline] Failed to translate to ${targetLang}:`, err);
    return '';
  }
}

export async function translateFieldIfMissing(
  field: Record<string, string> | string | null | undefined,
  targetLang: LangCode,
  context?: string,
): Promise<Record<string, string> | string> {
  if (!field) {
    const empty: Record<string, string> = { ar: '', fr: '', en: '', de: '' };
    return targetLang === 'en' ? empty : empty;
  }

  if (typeof field === 'string') {
    if (targetLang === 'en') return field;
    return translateField(field, targetLang, context);
  }

  const result: Record<string, string> = { ...field };

  if (result[targetLang] && result[targetLang].trim()) {
    return result;
  }

  const sourceLang: LangCode =
    result.en?.trim() ? 'en' :
    result.ar?.trim() ? 'ar' :
    result.fr?.trim() ? 'fr' :
    result.de?.trim() ? 'de' :
    'en';

  const sourceText = result[sourceLang];
  if (!sourceText || !sourceText.trim()) return result;

  const translatedText = await translateField(sourceText, targetLang, context);
  if (translatedText) result[targetLang] = translatedText;
  return result;
}
