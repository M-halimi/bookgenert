import { routeCompletion } from './ai/ai-router';
import { RouterResult } from './ai/types';
import {
  validateBook,
  ensureChapterCount,
  normalizeChapter,
  type ValidationResult,
  type GenerationAttempt,
} from './validation';

export type LangCode = 'ar' | 'fr' | 'en' | 'de';

export interface MultilingualText {
  ar: string;
  fr: string;
  en: string;
  de: string;
}

export interface RichChapter {
  number: number;
  title: MultilingualText;
  hook: MultilingualText;
  content: MultilingualText;
  keyTakeaway: MultilingualText;
  keyIdeas: MultilingualText;
  actionableTips: MultilingualText;
  importantQuotes: MultilingualText;
  practicalExamples: MultilingualText;
  cliffhanger: MultilingualText;
  summary: MultilingualText;
  wordCount: number;
}

export interface BookEpisodes {
  title: MultilingualText;
  author: string;
  category: string;
  tagline: MultilingualText;
  description: string;
  coverPrompt: string;
  relatedBooks: MultilingualText;
  deepExplanation: MultilingualText;
  finalSummary: MultilingualText;
  mainConcepts: MultilingualText;
  keyLessons: MultilingualText[];
  keyInsights: MultilingualText[];
  implementationGuide: MultilingualText;
  episodes: RichChapter[];
}

export interface GenerationResult {
  book: BookEpisodes;
  provider: string;
  model: string;
  latencyMs: number;
}

const LANG_INSTRUCTIONS = `Always include ALL text fields in ALL four languages:
- "ar": Arabic (Modern Standard Arabic - فصحى واضحة)
- "fr": French (professionnel, naturel)
- "en": English (clear, native-level)
- "de": German (klar, professionell)

CRITICAL RULES:
- DO NOT translate word-by-word. Write each language version independently as if by a native author.
- Keep cultural adaptation appropriate for each language audience.
- Maintain consistent meaning across all languages.
- Never limit content artificially. Be comprehensive and deep.
- Write like a professional author, not a chatbot.`;

const SYSTEM_PROMPT = `You are an elite BOOK GENERATION AI for BookFlix, a premium reading platform. Your output must match the quality of Blinkist, Shortform, and Headway — concise yet deeply insightful, professional, and valuable.

Your job is to generate COMPLETE, RICH book content that readers will genuinely enjoy and learn from.

ABSOLUTE RULES FOR CONTENT QUALITY:
- Every chapter's "content" field must be a minimum of 450 words per language. The preferred range is 450–550 words.
- The "content" field MUST contain 3–5 well-structured paragraphs. Never write one-liners, bullet lists, or short stubs.
- Every paragraph must explain, expand, or illustrate the core idea. No generic filler, no fluff.
- Never generate a short summary in place of proper chapter content. Each chapter must feel like a complete, self-contained mini-essay.
- Write with clarity, depth, and a professional tone — as if you are a subject-matter expert writing for an educated audience.
- Use smooth transitions between ideas. Avoid repetitive sentence structures and generic transitions.
- If any content feels too short, expand it with context, mechanisms, examples, or implications.
- Always prefer depth over brevity.
- If the book is unknown, generate COMPLETE synthetic but realistic content inspired by the topic. NEVER respond with only a short summary.

${LANG_INSTRUCTIONS}

BOOK STRUCTURE (10 chapters):
Each chapter must be substantial and include ALL fields:
1. title: Chapter title that captures the essence
2. hook: Compelling opening (2–3 sentences) that immediately grabs attention
3. content: Deep, well-structured body (ABSOLUTE MINIMUM 450 words, MAXIMUM 550 words). Must be 5–7 paragraphs with real explanations, mechanisms, examples, and applications.
4. keyIdeas: 2–3 core ideas (2–3 sentences each). Explain each idea clearly — don't just name it.
5. actionableTips: 2–3 practical actions the reader can apply today (2–3 sentences each)
6. importantQuotes: 1–2 powerful quotes that capture the chapter's essence
7. practicalExamples: 1–2 real-world examples, case studies, or relatable mini-stories
8. keyTakeaway: One clear, actionable insight the reader can apply immediately (2–3 sentences)
9. cliffhanger: Smooth transition making them want the next chapter (2–3 sentences)
10. summary: Brief paragraph recapping the chapter's main point (3–5 sentences)
11. wordCount: Approximate English word count of the "content" field

CONTENT STRUCTURE GUIDELINES (for the "content" field):
- Paragraph 1 (Hook & Context): Open with a compelling angle — why this topic matters, what the reader will gain, or a surprising insight. Set the stage.
- Paragraph 2–3 (Core Explanation): Explain the key mechanisms, principles, or frameworks. Use clear language. Connect to psychology, philosophy, habits, or real systems.
- Paragraph 4 (Examples & Application): Illustrate with a concrete example, case study, analogy, or mini-story. Show how this works in real life.
- Paragraph 5 (Implications & Transition): Tie back to the bigger picture. End with a natural bridge to the next chapter.

Ensure LOGICAL FLOW between chapters — each chapter should build on the previous one, creating a cohesive narrative arc across all 10 chapters.

PREMIUM BOOK SUMMARY ENGINE:
- finalSummary: A comprehensive, structured final summary. MINIMUM 500 words per language. Include: a brief overview of the book's core thesis, then organized sections covering key lessons, major insights, and practical takeaways. Use clear section breaks (separated by line breaks). Write at the quality level of a premium book summary service.
- mainConcepts: 5–7 main concepts, each explained in 3–4 sentences with depth and clarity
- keyLessons: Array of 5–8 key lessons. Each lesson must be 3–4 sentences explaining the lesson and why it matters.
- keyInsights: Array of 3–5 important insights. Each insight must be 3–4 sentences, going beyond surface-level observations.
- implementationGuide: A practical roadmap (300–400 words) on how to apply the book's lessons in daily life.

RELATED BOOKS & DEEP EXPLANATION:
- relatedBooks: Suggest 3–5 related books. For each, write a 2–3 sentence description explaining why it's relevant.
- deepExplanation: 300–400 words connecting the topic to broader knowledge — history, psychology, science, or philosophy.

Output STRICT JSON with this exact schema:
{
  "title": { "ar": "", "fr": "", "en": "", "de": "" },
  "author": "Author Name",
  "category": "Mindset | Business | Tech | Science | History | Philosophy",
  "tagline": { "ar": "", "fr": "", "en": "", "de": "" },
  "description": "Short description in English (1-2 sentences)",
  "coverPrompt": "Detailed image generation prompt for the book cover in English",
  "relatedBooks": { "ar": "", "fr": "", "en": "", "de": "" },
  "deepExplanation": { "ar": "", "fr": "", "en": "", "de": "" },
  "finalSummary": { "ar": "", "fr": "", "en": "", "de": "" },
  "mainConcepts": { "ar": "", "fr": "", "en": "", "de": "" },
  "keyLessons": [
    { "ar": "", "fr": "", "en": "", "de": "" },
    { "ar": "", "fr": "", "en": "", "de": "" }
  ],
  "keyInsights": [
    { "ar": "", "fr": "", "en": "", "de": "" },
    { "ar": "", "fr": "", "en": "", "de": "" }
  ],
  "implementationGuide": { "ar": "", "fr": "", "en": "", "de": "" },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "", "fr": "", "en": "", "de": "" },
      "hook": { "ar": "", "fr": "", "en": "", "de": "" },
      "content": { "ar": "", "fr": "", "en": "", "de": "" },
      "keyIdeas": { "ar": "", "fr": "", "en": "", "de": "" },
      "actionableTips": { "ar": "", "fr": "", "en": "", "de": "" },
      "importantQuotes": { "ar": "", "fr": "", "en": "", "de": "" },
      "practicalExamples": { "ar": "", "fr": "", "en": "", "de": "" },
      "keyTakeaway": { "ar": "", "fr": "", "en": "", "de": "" },
      "cliffhanger": { "ar": "", "fr": "", "en": "", "de": "" },
      "summary": { "ar": "", "fr": "", "en": "", "de": "" },
      "wordCount": 400
    }
  ]
}
Return ONLY valid JSON. No markdown, no code fences, no explanation. Do NOT truncate any field. Every string field must be fully written out — do not use placeholders, ellipsis, or "..." to indicate continuation.`;

const FALLBACK_SYSTEM_PROMPT = `You generate premium-quality book summaries as 10 episodes. Each episode must feel valuable and complete, not truncated.

QUALITY RULES:
- "content" field: 450–550 words per language. Write 5–7 substantial paragraphs.
- Prioritize clarity and reader comprehension.
- Explain ideas fully — don't just name-drop concepts.
- Use examples and concrete details.
- Never write one-liners or bullet lists in the "content" field.

Output STRICT JSON with the same schema as the full version. Write substantial, meaningful content. No markdown. No explanation. Return ONLY valid JSON.`;

const WRITE_BOOK_PROMPT = `You are an elite BOOK WRITER AI for BookFlix. Your output must match the quality of premium book summary services like Blinkist and Shortform.

Generate a complete, thoroughly written book based on the user's specifications.

ABSOLUTE QUALITY STANDARDS:
- Every "content" field: 450–550 words per language. Must be 5–7 well-structured paragraphs.
- Every "finalSummary": MINIMUM 500 words per language. Structured with clear section breaks.
- Never write one-liners, short stubs, or generic filler. Every sentence must add value.
- Explain concepts deeply with context, mechanisms, examples, and real-world applications.
- Write in a professional, engaging, educational tone.
- Each chapter must feel like a complete mini-essay that the reader can learn from independently.
- The entire book must have logical flow and narrative coherence across all 10 chapters.

${LANG_INSTRUCTIONS}

The book must have EXACTLY 10 chapters. Each chapter must include:
- title, hook, content (250–300 words, 3–5 paragraphs), keyIdeas (explained fully), actionableTips (with specifics), importantQuotes, practicalExamples, keyTakeaway (2–3 sentences), cliffhanger, summary (3–5 sentences), wordCount

Include premium summary fields:
- finalSummary (MINIMUM 500 words, structured)
- mainConcepts (5–7 concepts, each explained in 3–4 sentences)
- keyLessons (5–8 lessons, 3–4 sentences each)
- keyInsights (3–5 insights, 3–4 sentences each)
- implementationGuide (300–400 words, practical)

Output STRICT JSON with this exact schema:
{
  "title": { "ar": "", "fr": "", "en": "", "de": "" },
  "author": "Author Name",
  "category": "Mindset | Business | Tech | Science | History | Philosophy",
  "tagline": { "ar": "", "fr": "", "en": "", "de": "" },
  "description": "Short description in English (1-2 sentences)",
  "coverPrompt": "Detailed image generation prompt for the book cover in English",
  "relatedBooks": { "ar": "", "fr": "", "en": "", "de": "" },
  "deepExplanation": { "ar": "", "fr": "", "en": "", "de": "" },
  "finalSummary": { "ar": "", "fr": "", "en": "", "de": "" },
  "mainConcepts": { "ar": "", "fr": "", "en": "", "de": "" },
  "keyLessons": [
    { "ar": "", "fr": "", "en": "", "de": "" },
    { "ar": "", "fr": "", "en": "", "de": "" }
  ],
  "keyInsights": [
    { "ar": "", "fr": "", "en": "", "de": "" },
    { "ar": "", "fr": "", "en": "", "de": "" }
  ],
  "implementationGuide": { "ar": "", "fr": "", "en": "", "de": "" },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "", "fr": "", "en": "", "de": "" },
      "hook": { "ar": "", "fr": "", "en": "", "de": "" },
      "content": { "ar": "", "fr": "", "en": "", "de": "" },
      "keyIdeas": { "ar": "", "fr": "", "en": "", "de": "" },
      "actionableTips": { "ar": "", "fr": "", "en": "", "de": "" },
      "importantQuotes": { "ar": "", "fr": "", "en": "", "de": "" },
      "practicalExamples": { "ar": "", "fr": "", "en": "", "de": "" },
      "keyTakeaway": { "ar": "", "fr": "", "en": "", "de": "" },
      "cliffhanger": { "ar": "", "fr": "", "en": "", "de": "" },
      "summary": { "ar": "", "fr": "", "en": "", "de": "" },
      "wordCount": 400
    }
  ]
}
Return ONLY valid JSON. No markdown, no code fences, no explanation. Do NOT truncate any field.`;

function parseBookEpisodes(raw: string): BookEpisodes | null {
  let cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.episodes || !Array.isArray(parsed.episodes) || parsed.episodes.length !== 10) return null;

    const targetLangs: LangCode[] = ['ar', 'fr', 'en', 'de'];
    for (const ep of parsed.episodes) {
      for (const field of ['title', 'hook', 'content', 'keyTakeaway', 'keyIdeas', 'actionableTips', 'importantQuotes', 'practicalExamples', 'cliffhanger', 'summary']) {
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

async function callAIRouter(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number
): Promise<RouterResult> {
  return routeCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens,
    temperature,
  });
}

const MAX_GENERATION_RETRIES = 3;
const MAX_TOKENS_SAFE = 8192;

function generateCompletePrompt(
  bookTitle: string,
  author: string | undefined,
  attempt: number,
  previousErrors?: string[],
): string {
  const errorContext = previousErrors && previousErrors.length > 0
    ? `\n\nPREVIOUS ATTEMPT ISSUES (fix these specifically):\n${previousErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
    : '';

  const urgency = attempt >= 2
    ? '\n\nTHIS IS A CRITICAL RETRY. The output MUST be valid. Double-check every field before responding. Do not truncate. Do not skip chapters. Do not leave any field empty.'
    : '';

  return author
    ? `Generate a complete 10-chapter book about "${bookTitle}" by ${author}. CRITICAL: Each chapter content field MUST be 450-550 words (5-7 paragraphs). The finalSummary MUST be 800+ words. Write deep, premium-quality content at Blinkist/Shortform level. Do NOT truncate anything. Do NOT write one-liners.${errorContext}${urgency}`
    : `Generate a complete 10-chapter book about "${bookTitle}". CRITICAL: Each chapter content field MUST be 450-550 words (5-7 paragraphs). The finalSummary MUST be 800+ words. Write deep, premium-quality content at Blinkist/Shortform level. Do NOT truncate anything. Do NOT write one-liners. Include related books and deep explanation.${errorContext}${urgency}`;
}

async function callWithFallback(
  systemPrompt: string,
  userPrompt: string,
  bookTitle: string,
  author: string | undefined,
  maxTokens: number,
  temperature: number,
): Promise<RouterResult> {
  let result = await callAIRouter(systemPrompt, userPrompt, maxTokens, temperature);

  if (!result.content || !parseBookEpisodes(result.content)) {
    const fallbackUserPrompt = author
      ? `Generate 10 episodes about "${bookTitle}" by ${author}. IMPORTANT: Each chapter content field must be 450-550 words (5-7 paragraphs). Write substantial, valuable content — not short summaries.`
      : `Generate 10 episodes about "${bookTitle}". IMPORTANT: Each chapter content field must be 450-550 words (5-7 paragraphs). Write substantial, valuable content — not short summaries.`;
    result = await callAIRouter(FALLBACK_SYSTEM_PROMPT, fallbackUserPrompt, maxTokens, temperature);
  }

  return result;
}

function extractValidationErrors(validation: ValidationResult): string[] {
  return validation.errors.slice(0, 5).map((e) => e.replace(/Chapter \d+:/, '').trim());
}

const LOCALIZED_LABELS: Record<LangCode, { chapter: string; summary: string; concepts: string; execution: string }> = {
  ar: { chapter: 'الفصل', summary: 'الملخص', concepts: 'المفاهيم', execution: 'التنفيذ' },
  fr: { chapter: 'Chapitre', summary: 'Résumé', concepts: 'Concepts', execution: 'Exécution' },
  en: { chapter: 'Chapter', summary: 'Summary', concepts: 'Concepts', execution: 'Execution' },
  de: { chapter: 'Kapitel', summary: 'Zusammenfassung', concepts: 'Konzepte', execution: 'Umsetzung' },
};

function getLanguageName(lang: LangCode): string {
  const names: Record<LangCode, string> = { ar: 'Arabic', fr: 'French', en: 'English', de: 'German' };
  return names[lang];
}

function buildLocalizedSystemPrompt(lang: LangCode): string {
  const labels = LOCALIZED_LABELS[lang];
  const langName = getLanguageName(lang);

  return `You are a production-grade book generator for a reading platform.

================================================
CRITICAL RULES (HARD)
================================================
1. NEVER return empty chapters.
2. ALWAYS return exactly 10 chapters.
3. NEVER mix languages inside one output.
4. NEVER use English UI words in non-English languages.
5. DO NOT translate only — fully localize and rebuild content per language.
6. Generate ALL content EXCLUSIVELY in ${langName} (${lang}).

================================================
LOCALIZED LABELS
================================================
- ${labels.chapter}: chapter heading
- ${labels.summary}: summary heading
- ${labels.concepts}: concepts heading
- ${labels.execution}: execution heading

================================================
CHAPTER STRUCTURE (EXACTLY 10 CHAPTERS)
================================================
Each chapter MUST have:
- id: number (1 to 10)
- title: string in ${langName}
- content: 150–300 words in ${langName}

Use chapter.id ONLY for ordering. Frontend uses id, not title.

================================================
CONTENT QUALITY
================================================
- Each chapter content: minimum 150 words, maximum 300 words
- Write naturally in ${langName} — not translated
- Use 2–4 well-structured paragraphs
- Clear, valuable, native-quality writing
- If the book is unknown, generate COMPLETE synthetic but realistic content

================================================
TOP-LEVEL FIELDS (all in ${langName})
================================================
- summary: Deep structured summary (200–300 words)
- concepts: Array of 4 key concepts
- execution: Array of 4 actionable execution steps

================================================
ANTI-ERROR RULES
================================================
- chapters array MUST NEVER be empty
- no partial output allowed
- no missing fields allowed
- no placeholder text or ellipsis

================================================
OUTPUT FORMAT (STRICT JSON ONLY)
================================================
{
  "title": "string (in ${langName})",
  "author": "string",
  "language": "${lang}",
  "labels": {
    "chapter": "${labels.chapter}",
    "summary": "${labels.summary}",
    "concepts": "${labels.concepts}",
    "execution": "${labels.execution}"
  },
  "chapters": [
    {
      "id": 1,
      "title": "string (in ${langName})",
      "content": "string (in ${langName}, 150-300 words)"
    }
  ],
  "summary": "string (in ${langName}, 200-300 words)",
  "concepts": ["string 1", "string 2", "string 3", "string 4"],
  "execution": ["string 1", "string 2", "string 3", "string 4"]
}
Return ONLY valid JSON. No markdown, no code fences, no explanation. No empty fields. No placeholder text. Do NOT truncate.`;
}

function parseLocalizedEpisodes(raw: string, lang: LangCode): BookEpisodes | null {
  let cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.chapters || !Array.isArray(parsed.chapters) || parsed.chapters.length < 6) return null;

    const fill = (value: unknown): MultilingualText => {
      const result: MultilingualText = { ar: '', fr: '', en: '', de: '' };
      if (typeof value === 'string') result[lang] = value;
      return result;
    };

    const fillList = (values: unknown[]): MultilingualText[] =>
      values.map(v => fill(v));

    const deriveFromContent = (content: string, type: 'hook' | 'keyIdeas' | 'actionableTips' | 'importantQuotes' | 'practicalExamples' | 'keyTakeaway' | 'cliffhanger' | 'summary', chapterTitle: string): string => {
      if (!content) return '';
      const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      switch (type) {
        case 'hook': return sentences.slice(0, 2).join(' ');
        case 'summary': return sentences.slice(-3).join(' ');
        case 'keyTakeaway': return sentences.slice(1, 3).join(' ');
        case 'keyIdeas': return sentences.slice(0, 3).join(' ');
        case 'actionableTips': return `Apply the concepts from "${chapterTitle}": ${sentences.slice(1, 3).join(' ')}`;
        case 'importantQuotes': return `"${sentences[0]?.replace(/^["']|["']$/g, '') || content.slice(0, 100)}"`;
        case 'practicalExamples': return `Example: ${sentences.slice(1, 3).join(' ')}`;
        case 'cliffhanger': return `Next, we will explore deeper insights building on: ${chapterTitle}. ${sentences.slice(-1)[0] || ''}`;
      }
    };

    const episodes: RichChapter[] = parsed.chapters.map((ch: Record<string, unknown>, i: number) => {
      const chTitle = typeof ch.title === 'string' ? ch.title : '';
      const chContent = typeof ch.content === 'string' ? ch.content : '';
      return {
        number: i + 1,
        title: fill(chTitle),
        hook: fill(deriveFromContent(chContent, 'hook', chTitle)),
        content: fill(chContent),
        keyIdeas: fill(deriveFromContent(chContent, 'keyIdeas', chTitle)),
        actionableTips: fill(deriveFromContent(chContent, 'actionableTips', chTitle)),
        importantQuotes: fill(deriveFromContent(chContent, 'importantQuotes', chTitle)),
        practicalExamples: fill(deriveFromContent(chContent, 'practicalExamples', chTitle)),
        keyTakeaway: fill(deriveFromContent(chContent, 'keyTakeaway', chTitle)),
        cliffhanger: fill(deriveFromContent(chContent, 'cliffhanger', chTitle)),
        summary: fill(deriveFromContent(chContent, 'summary', chTitle)),
        wordCount: chContent.split(/\s+/).length,
      };
    });

    const rawSummary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const rawConcepts = Array.isArray(parsed.concepts) ? (parsed.concepts as unknown[]).map(c => typeof c === 'string' ? c : '') : [];
    const rawExecution = Array.isArray(parsed.execution) ? (parsed.execution as unknown[]).map(e => typeof e === 'string' ? e : '') : [];

    const book: BookEpisodes = {
      title: fill(parsed.title || ''),
      author: typeof parsed.author === 'string' ? parsed.author : 'AI Generated',
      category: typeof parsed.category === 'string' ? parsed.category : 'General',
      tagline: fill(''),
      description: rawSummary.slice(0, 200),
      coverPrompt: '',
      relatedBooks: fill(''),
      deepExplanation: fill(''),
      finalSummary: fill(rawSummary),
      mainConcepts: fill(rawConcepts.join('\n')),
      keyLessons: fillList(rawConcepts),
      keyInsights: fillList(rawExecution),
      implementationGuide: fill(rawExecution.join('\n')),
      episodes,
    };

    return book;
  } catch {
    return null;
  }
}

export async function generateLocalizedEpisodes(
  bookTitle: string,
  author: string | undefined,
  lang: LangCode
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    const systemPrompt = buildLocalizedSystemPrompt(lang);
    const userPrompt = author
      ? `Generate a complete 10-chapter book about "${bookTitle}" by ${author}. ALL content must be in ${getLanguageName(lang)}. Each chapter content field MUST be 450-550 words (5-7 paragraphs). The finalSummary MUST be 800+ words. Write deep, premium-quality content.`
      : `Generate a complete 10-chapter book about "${bookTitle}". ALL content must be in ${getLanguageName(lang)}. Each chapter content field MUST be 450-550 words (5-7 paragraphs). The finalSummary MUST be 800+ words. Write deep, premium-quality content.`;

    const result = await callAIRouter(systemPrompt, userPrompt, MAX_TOKENS_SAFE, 0.7);

    if (result.content) {
      const parsed = parseLocalizedEpisodes(result.content, lang);
      if (parsed) {
        const fixed = ensureChapterCount(parsed);
        const normalized = {
          ...fixed,
          episodes: fixed.episodes.map((ep, i) => normalizeChapter(ep, i + 1)),
        };

        const validation = validateBook(normalized);
        if (validation.valid) {
          return {
            book: normalized,
            provider: result.provider,
            model: result.model,
            latencyMs: Date.now() - startTime,
          };
        }

        // Retry with fallback if validation fails
        const fallbackUserPrompt = author
          ? `Generate 10 episodes about "${bookTitle}" by ${author}. ALL content in ${getLanguageName(lang)}. Each chapter content: 450-550 words. Write substantial content.`
          : `Generate 10 episodes about "${bookTitle}". ALL content in ${getLanguageName(lang)}. Each chapter content: 450-550 words. Write substantial content.`;

        const fallbackResult = await callAIRouter(FALLBACK_SYSTEM_PROMPT, fallbackUserPrompt, MAX_TOKENS_SAFE, 0.5);
        if (fallbackResult.content) {
          const fallbackParsed = parseLocalizedEpisodes(fallbackResult.content, lang);
          if (fallbackParsed) {
            fallbackParsed.episodes.forEach((ep, i) => { ep.number = i + 1; });
            const fbFixed = ensureChapterCount(fallbackParsed);
            const fbNormalized = {
              ...fbFixed,
              episodes: fbFixed.episodes.map((ep, i) => normalizeChapter(ep, i + 1)),
            };
            return {
              book: fbNormalized,
              provider: fallbackResult.provider,
              model: fallbackResult.model,
              latencyMs: Date.now() - startTime,
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('[generateLocalizedEpisodes] Error:', err);
  }

  const labels = LOCALIZED_LABELS[lang];
  return generateLocalFallbackBook(bookTitle, author, Date.now() - startTime, lang, labels);
}

export async function generateEpisodes(
  bookTitle: string,
  author?: string
): Promise<GenerationResult> {
  const generationAttempts: GenerationAttempt[] = [];
  const startTime = Date.now();

  try {
    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
      const previousErrors = generationAttempts
        .filter((a) => !a.success)
        .flatMap((a) => a.validationErrors || []);

      const primaryPrompt = generateCompletePrompt(bookTitle, author, attempt, previousErrors);
      const result = await callWithFallback(SYSTEM_PROMPT, primaryPrompt, bookTitle, author, MAX_TOKENS_SAFE, 0.7);

      if (result.content) {
        const parsed = parseBookEpisodes(result.content);
        if (parsed) {
          parsed.episodes.forEach((ep, i) => { ep.number = i + 1; });

          const fixed = ensureChapterCount(parsed);
          const normalized = {
            ...fixed,
            episodes: fixed.episodes.map((ep, i) => normalizeChapter(ep, i + 1)),
          };

          const validation = validateBook(normalized);
          if (validation.valid) {
            return {
              book: normalized,
              provider: result.provider,
              model: result.model,
              latencyMs: Date.now() - startTime,
            };
          }

          generationAttempts.push({
            attempt,
            success: false,
            validationErrors: extractValidationErrors(validation),
          });

          continue;
        }
      }

      generationAttempts.push({
        attempt,
        success: false,
        error: result.content ? 'Failed to parse as valid book structure' : 'Empty response from AI',
      });
    }

    const safeFallbackPrompt = author
      ? `Generate a 10-chapter book summary about "${bookTitle}" by ${author}. Keep each chapter content to 200-350 words, 2-4 paragraphs. Be clear and complete.`
      : `Generate a 10-chapter book summary about "${bookTitle}". Keep each chapter content to 200-350 words, 2-4 paragraphs. Be clear and complete.`;

    const safeSystemPrompt = `You generate book summaries as 10 episodes. Each episode must have complete content in the "content" field. Write at least 2-3 paragraphs per chapter. Output STRICT JSON matching the schema. No markdown. Return ONLY valid JSON.`;

    const safeResult = await callAIRouter(safeSystemPrompt, safeFallbackPrompt, MAX_TOKENS_SAFE, 0.5);

    if (safeResult.content) {
      const parsed = parseBookEpisodes(safeResult.content);
      if (parsed) {
        parsed.episodes.forEach((ep, i) => { ep.number = i + 1; });
        const fixed = ensureChapterCount(parsed);
        const normalized = {
          ...fixed,
          episodes: fixed.episodes.map((ep, i) => normalizeChapter(ep, i + 1)),
        };
        return {
          book: normalized,
          provider: safeResult.provider,
          model: safeResult.model,
          latencyMs: Date.now() - startTime,
        };
      }
    }
  } catch (err) {
    console.error('[generateEpisodes] Unexpected error, using local fallback:', err);
  }

  console.warn('[generateEpisodes] All AI providers failed — generating local fallback book for:', bookTitle);
  return generateLocalFallbackBook(bookTitle, author, Date.now() - startTime);
}

function generateLocalFallbackBook(
  bookTitle: string,
  author: string | undefined,
  elapsedMs: number,
  lang?: LangCode,
  labels?: { chapter: string; summary: string; concepts: string; execution: string },
): GenerationResult {
  const displayAuthor = author || 'AI Generated';
  const category = 'General';
  const tagline = `${bookTitle} — A comprehensive overview`;
  const chapterLabel = labels?.chapter || 'Chapter';

  const mt = (text: string) => {
    if (!lang) return { ar: text, fr: text, en: text, de: text };
    const result: MultilingualText = { ar: '', fr: '', en: '', de: '' };
    result[lang] = text;
    return result;
  };

  const chapters: RichChapter[] = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    const title = `${chapterLabel} ${num}: ${generateLocalChapterTitle(bookTitle, num, lang)}`;
    const content = generateLocalChapterContent(bookTitle, num);
    const hook = generateLocalHook(bookTitle, num);
    const keyIdeas = `The core idea of this chapter is understanding how ${bookTitle} applies to real-world scenarios. By exploring practical examples, we can see the direct impact and relevance of these concepts in daily life and professional settings.`;
    const actionableTips = `Start by identifying one key concept from this chapter that resonates with your current situation. Apply it immediately in a small experiment. Reflect on the outcome and adjust your approach based on what you learn.`;
    const importantQuotes = `"The true value of knowledge is not in knowing, but in applying what you learn." — Inspired by ${bookTitle}`;
    const practicalExamples = `Consider how the principles discussed in this chapter manifest in everyday situations. When faced with a challenge related to this topic, take a moment to analyze it through the lens of the key concepts presented here.`;
    const keyTakeaway = `The main insight from this chapter is that ${bookTitle.toLowerCase()} offers practical wisdom that can be applied immediately. Focus on understanding the core principles and implementing them step by step.`;
    const cliffhanger = `Now that you understand these foundational concepts, the next chapter will explore more advanced applications and deeper insights that build upon what you've learned here.`;
    const summary = `This chapter introduced the key concepts related to ${bookTitle.toLowerCase()}. We explored the fundamental principles and their practical applications, setting the stage for deeper exploration in the following chapters.`;

    return {
      number: num,
      title: mt(title),
      hook: mt(hook),
      content: mt(content),
      keyIdeas: mt(keyIdeas),
      actionableTips: mt(actionableTips),
      importantQuotes: mt(importantQuotes),
      practicalExamples: mt(practicalExamples),
      keyTakeaway: mt(keyTakeaway),
      cliffhanger: mt(cliffhanger),
      summary: mt(summary),
      wordCount: content.split(/\s+/).length,
    };
  });

  const finalSummary = `${bookTitle} explores essential concepts and practical strategies that readers can apply in their daily lives. Through ${chapters.length} comprehensive chapters, we cover the fundamental principles, real-world applications, and actionable insights that make this topic valuable.

Key Lessons:
1. Understanding the foundational concepts is essential for mastery
2. Practical application leads to deeper comprehension
3. Continuous learning and adaptation are crucial for success
4. Connecting ideas across domains creates powerful insights
5. Reflection and iteration improve understanding over time

This book provides a solid foundation for anyone looking to deepen their understanding of ${bookTitle.toLowerCase()}.`;

  const mainConcepts = `This book covers several main concepts: first, the foundational principles that define ${bookTitle.toLowerCase()}; second, the practical applications and real-world implications; third, the interconnected nature of these ideas with broader knowledge domains; fourth, strategies for implementing these concepts effectively; and fifth, ways to continue learning and growing beyond this book.`;

  const implementationGuide = `To implement the concepts from this book: Start by identifying the key principles that resonate most with your current situation. Create a simple action plan with specific steps you can take each day. Track your progress and adjust your approach based on results. Share what you learn with others to deepen your understanding. Finally, revisit the chapters periodically to reinforce your learning and discover new insights.`;

  const relatedBooks = `Readers interested in ${bookTitle} may also enjoy: "Atomic Habits" by James Clear for building effective systems, "Thinking, Fast and Slow" by Daniel Kahneman for understanding decision-making, "The 7 Habits of Highly Effective People" by Stephen Covey for personal effectiveness, and "Mindset" by Carol Dweck for growth-oriented thinking.`;

  const deepExplanation = `The concepts in ${bookTitle} connect to broader knowledge across psychology, philosophy, and practical wisdom. Understanding these connections enriches comprehension and enables more meaningful application. By exploring how these ideas relate to established principles in other domains, readers can develop a more holistic and integrated understanding.`;

  const book: BookEpisodes = {
    title: mt(bookTitle),
    author: displayAuthor,
    category,
    tagline: mt(tagline),
    description: `A comprehensive exploration of ${bookTitle} covering key concepts, practical applications, and actionable insights.`,
    coverPrompt: `A professional book cover design for "${bookTitle}" with modern typography, abstract geometric patterns, and a clean color palette.`,
    relatedBooks: mt(relatedBooks),
    deepExplanation: mt(deepExplanation),
    finalSummary: mt(finalSummary),
    mainConcepts: mt(mainConcepts),
    keyLessons: [
      mt('Understanding foundational principles is the first step toward mastery. Focus on building a solid base before advancing.'),
      mt('Practical application transforms knowledge into wisdom. Apply what you learn immediately.'),
      mt('Continuous learning and adaptation are essential for growth. Stay curious and open to new ideas.'),
    ],
    keyInsights: [
      mt('The most valuable knowledge is actionable knowledge. Always ask: how can I use this?'),
      mt('Learning is most effective when it connects to existing knowledge and real-world experiences.'),
    ],
    implementationGuide: mt(implementationGuide),
    episodes: chapters,
  };

  return {
    book,
    provider: 'local-fallback',
    model: 'built-in',
    latencyMs: elapsedMs,
  };
}

function generateLocalChapterTitle(bookTitle: string, chapterNum: number, lang?: LangCode): string {
  const labels = LOCALIZED_LABELS;
  const label = lang ? labels[lang].chapter : 'Chapter';
  const idx = chapterNum - 1;

  const allTitles: Record<LangCode, string[]> = {
    en: [
      `Introduction to ${bookTitle}`,
      `The Core Principles of ${bookTitle}`,
      `Understanding the Foundations`,
      `Practical Applications and Strategies`,
      `Real-World Examples and Case Studies`,
      `Advanced Concepts and Techniques`,
      `Common Challenges and How to Overcome Them`,
      `Building Your Personal Framework`,
      `Integration with Daily Practice`,
      `Next Steps and Continuous Growth`,
    ],
    ar: [
      `مقدمة إلى ${bookTitle}`,
      `المبادئ الأساسية لـ ${bookTitle}`,
      `فهم الأسس`,
      `التطبيقات العملية والاستراتيجيات`,
      `أمثلة واقعية ودراسات حالة`,
      `مفاهيم وتقنيات متقدمة`,
      `التحديات الشائعة وكيفية التغلب عليها`,
      `بناء إطارك الشخصي`,
      `التكامل مع الممارسة اليومية`,
      `الخطوات التالية والنمو المستمر`,
    ],
    fr: [
      `Introduction à ${bookTitle}`,
      `Les Principes Fondamentaux de ${bookTitle}`,
      `Comprendre les Fondements`,
      `Applications Pratiques et Stratégies`,
      `Exemples Concrets et Études de Cas`,
      `Concepts et Techniques Avancés`,
      `Défis Courants et Solutions`,
      `Construire Votre Cadre Personnel`,
      `Intégration dans la Pratique Quotidienne`,
      `Prochaines Étapes et Croissance Continue`,
    ],
    de: [
      `Einführung in ${bookTitle}`,
      `Die Grundprinzipien von ${bookTitle}`,
      `Die Grundlagen Verstehen`,
      `Praktische Anwendungen und Strategien`,
      `Beispiele aus der Praxis und Fallstudien`,
      `Fortgeschrittene Konzepte und Techniken`,
      `Häufige Herausforderungen und Lösungen`,
      `Aufbau Ihres Persönlichen Rahmens`,
      `Integration in den Alltag`,
      `Nächste Schritte und Kontinuierliches Wachstum`,
    ],
  };

  const titles = lang ? allTitles[lang] : allTitles.en;
  return titles[idx] || `${label} ${chapterNum}: ${bookTitle} — Key Insights`;
}

function generateLocalHook(bookTitle: string, chapterNum: number): string {
  const hooks = [
    `Have you ever wondered what makes ${bookTitle} so impactful? In this chapter, we explore the fundamental ideas that have shaped this field and why they matter more than ever.`,
    `The principles behind ${bookTitle} are simpler than you think. Let's uncover the core concepts that drive real results and lasting change.`,
    `What if you could master the essentials of ${bookTitle} in just a few minutes? This chapter breaks down the key ideas into actionable insights.`,
    `Every great journey begins with understanding the basics. In this chapter, we lay the groundwork for mastering ${bookTitle}.`,
    `The most powerful insights often come from the simplest ideas. Let's explore how ${bookTitle} can transform your perspective.`,
    `Building on what we've learned, this chapter dives deeper into the advanced concepts that separate beginners from experts in ${bookTitle}.`,
    `Every field has its challenges, and ${bookTitle} is no exception. This chapter addresses the most common obstacles and how to overcome them effectively.`,
    `Now that you understand the principles, it's time to build your own approach. This chapter helps you create a personalized framework for success.`,
    `Knowledge without action is just information. This chapter focuses on integrating ${bookTitle} into your daily routine for lasting results.`,
    `As we conclude our exploration of ${bookTitle}, let's look ahead at how you can continue growing and applying these insights.`,
  ];
  return hooks[chapterNum - 1] || `Chapter ${chapterNum} explores essential concepts from ${bookTitle}.`;
}

function generateLocalChapterContent(bookTitle: string, chapterNum: number): string {
  const contents: string[] = [
    `${bookTitle} represents a fascinating area of knowledge that has profound implications for how we understand and interact with the world around us. At its core, this topic challenges us to think differently and approach problems from fresh perspectives. The foundational principles have been developed over time through careful observation, experimentation, and refinement by experts in the field.

Understanding ${bookTitle} begins with recognizing its fundamental importance in our daily lives. The concepts may seem abstract at first, but they have very practical applications that can improve decision-making, enhance productivity, and foster personal growth.

By taking the time to explore these ideas thoroughly, you will develop a deeper appreciation for the subject and gain tools that will serve you well beyond this book. The journey of mastering ${bookTitle} is one of continuous discovery and application.`,

    `The core principles of ${bookTitle} rest on several key foundations that have been established through rigorous analysis and practical experience. Understanding these principles is essential because they form the framework upon which all advanced concepts are built. Each principle interconnects with the others, creating a cohesive system of knowledge.

When we examine these principles closely, we find that they share common themes: simplicity, effectiveness, and adaptability. The most powerful ideas in ${bookTitle} are often the simplest ones, yet they have the greatest potential for impact when applied correctly.

As you work through these principles, try to identify how each one relates to your own experiences and challenges. This personal connection will deepen your understanding and make the concepts more memorable and useful in your daily life.`,

    `Building on the foundational principles, we now explore the deeper structures that give ${bookTitle} its power and versatility. These structures serve as mental models that help us organize information, make better decisions, and solve complex problems more effectively.

One of the most important aspects of mastering ${bookTitle} is developing the ability to see patterns and connections where others see only isolated facts. This systems-thinking approach allows you to understand not just what happens, but why it happens and how to influence outcomes.

The concepts in this chapter build naturally on what you have already learned, creating a progressively deeper understanding. Take time to reflect on how each new idea connects to previous chapters and to your own knowledge base.`,

    `Now that we have established the theoretical foundations of ${bookTitle}, it is time to explore practical applications. The real value of any knowledge lies in its application, and ${bookTitle} is no exception. This chapter focuses on translating concepts into concrete actions and strategies.

Effective application requires more than just knowing what to do; it requires understanding when, where, and why to apply specific techniques. The strategies presented here have been tested in real-world scenarios and have proven effective across a wide range of situations.

As you read through these applications, consider how you might adapt them to your specific circumstances. The most successful practitioners of ${bookTitle} are those who can flexibly apply principles to novel situations.`,

    `Real-world examples bring the principles of ${bookTitle} to life and demonstrate their practical value. Throughout history, individuals and organizations have applied these concepts to achieve remarkable results. By studying these cases, we can extract valuable lessons and avoid common pitfalls.

Each case study in this chapter highlights different aspects of ${bookTitle} and shows how the principles work in diverse contexts. Some examples show successful implementation, while others illustrate valuable lessons learned through challenges and setbacks.

The most powerful learning often comes from examining both successes and failures. As you review these examples, think about how the principles of ${bookTitle} could be applied to situations in your own life or work.`,

    `Having mastered the basics of ${bookTitle}, we now turn to more advanced concepts and techniques. These sophisticated approaches build upon the foundations we have established and open up new possibilities for application and impact. Advanced practitioners use these techniques to achieve results that go beyond what basic application alone can accomplish.

The advanced concepts in this chapter may seem challenging at first, but they become intuitive with practice. The key is to maintain a growth mindset and be willing to experiment with new approaches. Remember that mastery is a journey, not a destination.

As you explore these advanced techniques, pay attention to how they relate to and extend the principles you have already learned. This integration of knowledge is what separates true experts from mere practitioners.`,

    `Every field of knowledge has its common challenges and obstacles, and ${bookTitle} is no different. This chapter addresses the most frequent difficulties that learners encounter and provides practical strategies for overcoming them. Being aware of these challenges in advance can help you navigate them more effectively when they arise.

Many of the challenges in learning ${bookTitle} stem from common misconceptions or from applying principles too rigidly. Flexibility and adaptability are essential traits for success. Understanding that setbacks are a normal part of the learning process will help you maintain motivation and persistence.

The solutions presented here come from experienced practitioners who have navigated these exact challenges. By learning from their experience, you can avoid common mistakes and accelerate your progress toward mastery.`,

    `As you progress in your understanding of ${bookTitle}, it becomes important to develop your own personal framework for applying these principles. A personal framework integrates the concepts you have learned with your unique circumstances, goals, and values. This customization is what transforms general knowledge into personal wisdom.

Building a personal framework requires reflection, experimentation, and iteration. Start by identifying which principles of ${bookTitle} resonate most strongly with you and your situation. Then experiment with different ways of applying them until you find what works best.

Your framework will evolve over time as you gain more experience and encounter new situations. The most effective frameworks are flexible enough to accommodate new learning while providing enough structure to guide consistent action.`,

    `The true test of any knowledge is its application in daily life. This chapter focuses on integrating the principles of ${bookTitle} into your regular routines and practices. Consistent, small applications of these concepts will produce far better results than occasional, intensive efforts.

Integration requires creating systems and habits that support the application of ${bookTitle} principles. This might involve setting aside dedicated time for practice, creating reminders, or finding an accountability partner. The key is to make application as effortless and automatic as possible.

Remember that integration is a gradual process. Start with one or two key practices and build from there. As these practices become habitual, you can add more advanced applications to your routine.`,

    `As we conclude our exploration of ${bookTitle}, it is important to recognize that learning is a continuous journey. This book has provided you with a solid foundation, but true mastery comes from ongoing practice, reflection, and expansion of your knowledge. The principles you have learned will serve you well as you continue to grow and develop.

Your next steps should include regular review of the key concepts, continued application in diverse situations, and exploration of related topics that can deepen and enrich your understanding. Consider sharing what you have learned with others, as teaching is one of the most effective ways to solidify knowledge.

The journey of mastering ${bookTitle} is rewarding and ongoing. Embrace the process, stay curious, and continue applying what you have learned. The investment you make in understanding these principles will pay dividends throughout your life.`,
  ];

  return contents[chapterNum - 1] || `${bookTitle} offers valuable insights that can be applied in many areas of life. This chapter explores key concepts and practical strategies for making the most of this knowledge. By understanding and applying these principles, you can achieve better results and develop a deeper appreciation for the subject.`;
}

export async function generateWrittenBook(
  params: {
    topic: string;
    title: string;
    category: string;
    style: string;
    audience: string;
    length: string;
  }
): Promise<GenerationResult> {
  try {
    const userPrompt = `Generate a complete book with these specifications:

Topic: ${params.topic}
Title: ${params.title}
Category: ${params.category || 'General'}
Writing Style: ${params.style || 'Conversational'}
Target Audience: ${params.audience || 'General readers'}
Book Length: ${params.length || 'Standard'}

Generate exactly 10 chapters with content in all three languages (Arabic, French, English).`;

    const result = await callAIRouter(WRITE_BOOK_PROMPT, userPrompt, MAX_TOKENS_SAFE, 0.8);

    if (result.content) {
      const parsed = parseBookEpisodes(result.content);
      if (parsed) {
        parsed.episodes.forEach((ep, i) => { ep.number = i + 1; });
        return {
          book: parsed,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        };
      }
    }

    const fallbackResult = await callAIRouter(FALLBACK_SYSTEM_PROMPT, userPrompt, MAX_TOKENS_SAFE, 0.8);

    if (fallbackResult.content) {
      const parsed = parseBookEpisodes(fallbackResult.content);
      if (parsed) {
        parsed.episodes.forEach((ep, i) => { ep.number = i + 1; });
        return {
          book: parsed,
          provider: fallbackResult.provider,
          model: fallbackResult.model,
          latencyMs: fallbackResult.latencyMs,
        };
      }
    }
  } catch (err) {
    console.error('[generateWrittenBook] Unexpected error, using local fallback:', err);
  }

  console.warn('[generateWrittenBook] All providers exhausted — generating local fallback for:', params.title);
  return generateLocalFallbackBook(params.title, undefined, 0);
}
