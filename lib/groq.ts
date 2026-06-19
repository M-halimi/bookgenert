import { getApiManager } from './api-manager';

export type LangCode = 'ar' | 'fr' | 'en';

export interface MultilingualText {
  ar: string;
  fr: string;
  en: string;
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

const SYSTEM_PROMPT = `You are an elite BOOK GENERATION AI for BookFlix, a premium reading platform. Your output must match the quality of Blinkist, Shortform, and Headway — concise yet deeply insightful, professional, and valuable.

Your job is to generate COMPLETE, RICH book content that readers will genuinely enjoy and learn from.

ABSOLUTE RULES FOR CONTENT QUALITY:
- Every chapter's "content" field must be a minimum of 250 words per language. The preferred range is 250–300 words.
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
3. content: Deep, well-structured body (ABSOLUTE MINIMUM 250 words, MAXIMUM 300 words). Must be 3–5 paragraphs with real explanations, mechanisms, examples, and applications.
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
  "title": { "ar": "", "fr": "", "en": "" },
  "author": "Author Name",
  "category": "Mindset | Business | Tech | Science | History | Philosophy",
  "tagline": { "ar": "", "fr": "", "en": "" },
  "description": "Short description in English (1-2 sentences)",
  "coverPrompt": "Detailed image generation prompt for the book cover in English",
  "relatedBooks": { "ar": "", "fr": "", "en": "" },
  "deepExplanation": { "ar": "", "fr": "", "en": "" },
  "finalSummary": { "ar": "", "fr": "", "en": "" },
  "mainConcepts": { "ar": "", "fr": "", "en": "" },
  "keyLessons": [
    { "ar": "", "fr": "", "en": "" },
    { "ar": "", "fr": "", "en": "" }
  ],
  "keyInsights": [
    { "ar": "", "fr": "", "en": "" },
    { "ar": "", "fr": "", "en": "" }
  ],
  "implementationGuide": { "ar": "", "fr": "", "en": "" },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "", "fr": "", "en": "" },
      "hook": { "ar": "", "fr": "", "en": "" },
      "content": { "ar": "", "fr": "", "en": "" },
      "keyIdeas": { "ar": "", "fr": "", "en": "" },
      "actionableTips": { "ar": "", "fr": "", "en": "" },
      "importantQuotes": { "ar": "", "fr": "", "en": "" },
      "practicalExamples": { "ar": "", "fr": "", "en": "" },
      "keyTakeaway": { "ar": "", "fr": "", "en": "" },
      "cliffhanger": { "ar": "", "fr": "", "en": "" },
      "summary": { "ar": "", "fr": "", "en": "" },
      "wordCount": 400
    }
  ]
}
Return ONLY valid JSON. No markdown, no code fences, no explanation. Do NOT truncate any field. Every string field must be fully written out — do not use placeholders, ellipsis, or "..." to indicate continuation.`;

const FALLBACK_SYSTEM_PROMPT = `You generate premium-quality book summaries as 10 episodes. Each episode must feel valuable and complete, not truncated.

QUALITY RULES:
- "content" field: 250–300 words per language. Write 2–3 substantial paragraphs.
- Prioritize clarity and reader comprehension.
- Explain ideas fully — don't just name-drop concepts.
- Use examples and concrete details.
- Never write one-liners or bullet lists in the "content" field.

Output STRICT JSON with the same schema as the full version. Write substantial, meaningful content. No markdown. No explanation. Return ONLY valid JSON.`;

const WRITE_BOOK_PROMPT = `You are an elite BOOK WRITER AI for BookFlix. Your output must match the quality of premium book summary services like Blinkist and Shortform.

Generate a complete, thoroughly written book based on the user's specifications.

ABSOLUTE QUALITY STANDARDS:
- Every "content" field: 250–300 words per language. Must be 3–5 well-structured paragraphs.
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
  "title": { "ar": "", "fr": "", "en": "" },
  "author": "Author Name",
  "category": "Mindset | Business | Tech | Science | History | Philosophy",
  "tagline": { "ar": "", "fr": "", "en": "" },
  "description": "Short description in English (1-2 sentences)",
  "coverPrompt": "Detailed image generation prompt for the book cover in English",
  "relatedBooks": { "ar": "", "fr": "", "en": "" },
  "deepExplanation": { "ar": "", "fr": "", "en": "" },
  "finalSummary": { "ar": "", "fr": "", "en": "" },
  "mainConcepts": { "ar": "", "fr": "", "en": "" },
  "keyLessons": [
    { "ar": "", "fr": "", "en": "" },
    { "ar": "", "fr": "", "en": "" }
  ],
  "keyInsights": [
    { "ar": "", "fr": "", "en": "" },
    { "ar": "", "fr": "", "en": "" }
  ],
  "implementationGuide": { "ar": "", "fr": "", "en": "" },
  "episodes": [
    {
      "number": 1,
      "title": { "ar": "", "fr": "", "en": "" },
      "hook": { "ar": "", "fr": "", "en": "" },
      "content": { "ar": "", "fr": "", "en": "" },
      "keyIdeas": { "ar": "", "fr": "", "en": "" },
      "actionableTips": { "ar": "", "fr": "", "en": "" },
      "importantQuotes": { "ar": "", "fr": "", "en": "" },
      "practicalExamples": { "ar": "", "fr": "", "en": "" },
      "keyTakeaway": { "ar": "", "fr": "", "en": "" },
      "cliffhanger": { "ar": "", "fr": "", "en": "" },
      "summary": { "ar": "", "fr": "", "en": "" },
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

    const targetLangs: LangCode[] = ['ar', 'fr', 'en'];
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

export async function generateEpisodes(
  bookTitle: string,
  author?: string,
  whitelisted?: boolean
): Promise<GenerationResult> {
  const api = getApiManager();

  const primaryPrompt = author
    ? `Generate a complete 10-chapter book about "${bookTitle}" by ${author}. CRITICAL: Each chapter content field MUST be 250-300 words (3-5 paragraphs). The finalSummary MUST be 500+ words. Write deep, premium-quality content at Blinkist/Shortform level. Do NOT truncate anything. Do NOT write one-liners.`
    : `Generate a complete 10-chapter book about "${bookTitle}". CRITICAL: Each chapter content field MUST be 250-300 words (3-5 paragraphs). The finalSummary MUST be 500+ words. Write deep, premium-quality content at Blinkist/Shortform level. Do NOT truncate anything. Do NOT write one-liners. Include related books and deep explanation.`;

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
    if (parsed) {
      parsed.episodes.forEach((ep, i) => {
        ep.number = i + 1;
      });
      return { book: parsed, provider: result.provider, model: result.model, latencyMs: result.latencyMs };
    }
  } catch {
    // Fall through
  }

  const fallbackUserPrompt = author
    ? `Generate 10 episodes about "${bookTitle}" by ${author}. IMPORTANT: Each content field must be 250-300 words (2-3 paragraphs). Write substantial, valuable content — not short summaries.`
    : `Generate 10 episodes about "${bookTitle}". IMPORTANT: Each content field must be 250-300 words (2-3 paragraphs). Write substantial, valuable content — not short summaries.`;

  const result = await api.complete({
    messages: [
      { role: 'system', content: FALLBACK_SYSTEM_PROMPT },
      { role: 'user', content: fallbackUserPrompt },
    ],
    maxTokens: 16384,
    temperature: 0.7,
  }, undefined, whitelisted);

  const parsed = parseBookEpisodes(result.content);
  if (parsed) {
    parsed.episodes.forEach((ep, i) => {
      ep.number = i + 1;
    });
    return { book: parsed, provider: result.provider, model: result.model, latencyMs: result.latencyMs };
  }

  throw new Error('Generation unavailable — all AI providers exhausted');
}

export async function generateWrittenBook(
  params: {
    topic: string;
    title: string;
    category: string;
    style: string;
    audience: string;
    length: string;
  },
  whitelisted?: boolean
): Promise<GenerationResult> {
  const api = getApiManager();

  const systemPrompt = WRITE_BOOK_PROMPT;

  const userPrompt = `Generate a complete book with these specifications:

Topic: ${params.topic}
Title: ${params.title}
Category: ${params.category || 'General'}
Writing Style: ${params.style || 'Conversational'}
Target Audience: ${params.audience || 'General readers'}
Book Length: ${params.length || 'Standard'}

CRITICAL QUALITY REQUIREMENTS:
- Each chapter's "content" field: 250-300 words, 3-5 paragraphs of rich, substantial writing
- The "finalSummary" field: MINIMUM 500 words, structured with clear sections
- Write at a premium book summary quality level (Blinkist, Shortform, Headway)
- Never truncate, never use ellipsis, never write one-liners
- Every chapter must feel like a complete, valuable read

Generate exactly 10 chapters with rich content in all three languages (Arabic, French, English).
Include premium summary fields, table of contents, and an action plan.`;

  try {
    const result = await api.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 8192,
      temperature: 0.8,
    }, undefined, whitelisted);

    const parsed = parseBookEpisodes(result.content);
    if (parsed) {
      parsed.episodes.forEach((ep, i) => {
        ep.number = i + 1;
      });
      return { book: parsed, provider: result.provider, model: result.model, latencyMs: result.latencyMs };
    }
  } catch {
    // Fall through
  }

  // Try fallback with shorter content
  const fallbackResult = await api.complete({
    messages: [
      { role: 'system', content: FALLBACK_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 16384,
    temperature: 0.8,
  }, undefined, whitelisted);

  const parsed = parseBookEpisodes(fallbackResult.content);
  if (parsed) {
    parsed.episodes.forEach((ep, i) => {
      ep.number = i + 1;
    });
    return { book: parsed, provider: fallbackResult.provider, model: fallbackResult.model, latencyMs: fallbackResult.latencyMs };
  }

  throw new Error('Book writing unavailable — all AI providers exhausted');
}
