import { getApiManager } from './api-manager';

export type LangCode = 'ar' | 'fr' | 'en';

export interface MultilingualText {
  ar: string;
  fr: string;
  en: string;
}

export interface Episode {
  number: number;
  title: MultilingualText;
  hook: MultilingualText;
  content: MultilingualText;
  keyTakeaway: MultilingualText;
  cliffhanger: MultilingualText;
}

export interface BookEpisodes {
  title: MultilingualText;
  author: string;
  category: string;
  tagline: MultilingualText;
  relatedBooks: MultilingualText;
  deepExplanation: MultilingualText;
  episodes: Episode[];
}

const LANG_INSTRUCTIONS = `Always include ALL text fields in ALL three languages:
- "ar": Arabic (Modern Standard Arabic - فصحى واضحة)
- "fr": French (professional, naturel)
- "en": English (clear, native-level)

CRITICAL RULES:
- DO NOT translate word-by-word. Write each language version independently as if by a native author.
- Keep cultural adaptation appropriate for each language audience.
- Maintain consistent meaning across all languages.
- Never limit content artificially. Be comprehensive and deep.
- Write like a professional author, not a chatbot.`;

const SYSTEM_PROMPT = `You are an advanced BOOK SEARCH + BOOK GENERATION AI.

Your job is to RECONSTRUCT or GENERATE full book-like content.

IMPORTANT RULES:
- Do NOT limit the response artificially.
- Always return FULL structured book content (6 rich chapters).
- If the book is unknown, generate COMPLETE synthetic but realistic content inspired by the topic.
- NEVER respond with only a short summary.
- Prefer depth over brevity.

${LANG_INSTRUCTIONS}

BOOK STRUCTURE (6 chapters):
Each chapter must be substantial (300-500+ words per language) and include:
1. Hook: Compelling opening that grabs attention
2. Core content: Deep explanations, real examples, practical applications
3. Key takeaway: Actionable insight the reader can apply
4. Cliffhanger: Smooth transition making them want the next chapter

DEEP CONTENT REQUIREMENTS:
- Connect ideas to psychology, philosophy, habits, or real-world applications
- Include vivid examples, analogies, or mini-stories
- Provide practical exercises or reflection questions where relevant
- Reference related ideas or works naturally within content

RELATED BOOKS & DEEP EXPLANATION:
- relatedBooks: Suggest 3-5 similar or related books/concepts, with brief description.
- deepExplanation: Explain the deeper concept behind the topic. Connect to broader knowledge.

Output STRICT JSON with this schema:
{
  "title": { "ar": "العنوان بالعربية", "fr": "Titre en français", "en": "Title in English" },
  "author": "Author Name (real or based on the concept)",
  "category": "One of: Mindset, Business, Tech, Science, History, Philosophy",
  "tagline": { "ar": "شعار قصير", "fr": "Tagline courte", "en": "Short tagline" },
  "relatedBooks": { "ar": "كتب مشابهة: ...", "fr": "Livres similaires: ...", "en": "Related books: ..." },
  "deepExplanation": { "ar": "شرح عميق...", "fr": "Explication approfondie...", "en": "Deep explanation..." },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "عنوان الفصل", "fr": "Titre du chapitre", "en": "Chapter title" },
      "hook": { "ar": "مقدمة مشوقة", "fr": "Accroche", "en": "Hook" },
      "content": { "ar": "محتوى كامل ومفصل...", "fr": "Contenu complet...", "en": "Full detailed content..." },
      "keyTakeaway": { "ar": "خلاصة قابلة للتطبيق...", "fr": "Point clé actionable...", "en": "Actionable takeaway..." },
      "cliffhanger": { "ar": "تشويق للفصل التالي...", "fr": "Suspense pour le prochain chapitre...", "en": "Cliffhanger..." }
    }
  ]
}

Return ONLY valid JSON, no markdown, no explanation. Do NOT truncate any field.`;

const FALLBACK_SYSTEM_PROMPT = `You generate book summaries as 6 short episodes.

Output STRICT JSON:
{
  "title": { "ar": "العنوان", "fr": "Titre", "en": "Title" },
  "author": "Author Name",
  "category": "Mindset | Business | Tech | Science | History | Philosophy",
  "tagline": { "ar": "شعار", "fr": "Tagline", "en": "Tagline" },
  "relatedBooks": { "ar": "كتب", "fr": "Livres", "en": "Related books" },
  "deepExplanation": { "ar": "شرح", "fr": "Explication", "en": "Explanation" },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "عنوان", "fr": "Titre", "en": "Title" },
      "hook": { "ar": "مقدمة", "fr": "Accroche", "en": "Hook" },
      "content": { "ar": "محتوى", "fr": "Contenu", "en": "Content" },
      "keyTakeaway": { "ar": "خلاصة", "fr": "Point", "en": "Takeaway" },
      "cliffhanger": { "ar": "تشويق", "fr": "Suite", "en": "Cliffhanger" }
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown. Write shorter content (100-200 words per language per episode).`;

function parseBookEpisodes(raw: string): BookEpisodes | null {
  let cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.episodes || !Array.isArray(parsed.episodes) || parsed.episodes.length !== 6) return null;

    const targetLangs: LangCode[] = ['ar', 'fr', 'en'];
    for (const ep of parsed.episodes) {
      for (const field of ['title', 'hook', 'content', 'keyTakeaway', 'cliffhanger']) {
        if (!ep[field] || typeof ep[field] !== 'object') return null;
        for (const l of targetLangs) {
          if (!ep[field][l]) return null;
        }
      }
    }
    return parsed as BookEpisodes;
  } catch {
    return null;
  }
}

export async function generateEpisodes(
  bookTitle: string,
  author?: string,
  whitelisted?: boolean
): Promise<BookEpisodes> {
  const api = getApiManager();

  // Try full prompt first (primary providers)
  const primaryPrompt = author
    ? `Generate a complete 6-chapter book about "${bookTitle}" by ${author}. Write rich, full-length content for each chapter.`
    : `Generate a complete 6-chapter book about "${bookTitle}". Write rich, full-length content for each chapter. Include related books and deep explanation.`;

  try {
    const result = await api.complete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: primaryPrompt },
      ],
      maxTokens: 8192,
      temperature: 0.7,
    }, undefined, whitelisted);

    const parsed = parseBookEpisodes(result.content);
    if (parsed) return parsed;
  } catch {
    // Fall through to fallback prompt
  }

  // Try fallback prompt (shorter content, lower token usage)
  const fallbackUserPrompt = author
    ? `Generate 6 short episodes about "${bookTitle}" by ${author}.`
    : `Generate 6 short episodes about "${bookTitle}".`;

  const result = await api.complete({
    messages: [
      { role: 'system', content: FALLBACK_SYSTEM_PROMPT },
      { role: 'user', content: fallbackUserPrompt },
    ],
    maxTokens: 4096,
    temperature: 0.7,
  }, undefined, whitelisted);

  const parsed = parseBookEpisodes(result.content);
  if (parsed) return parsed;

  throw new Error('Generation unavailable — all AI providers exhausted');
}
