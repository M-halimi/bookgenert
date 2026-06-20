import { routeCompletion } from '@/lib/ai/ai-router';
import { saveGeneratedBook } from '@/lib/cache-manager';
import { slugify } from '@/lib/utils';
import type { BookEpisodes, MultilingualText, RichChapter } from '@/lib/groq';

interface AISeedBook {
  title: string;
  slug: string;
  chapters: { chapter_number: number; title: string; content: string }[];
  summary: string;
  total_episodes: number;
}

interface AISeedResult {
  success: boolean;
  slug?: string;
  title?: string;
  error?: string;
  bookId?: string;
}

const SEED_SYSTEM_PROMPT = `You are a strict backend data generator for a SaaS book platform.

CRITICAL RULES:
- Return ONLY valid JSON
- No markdown
- No explanation
- No extra text

You MUST generate a book with chapters that will be saved directly in a database.

Return EXACT structure:

{
  "title": "string",
  "slug": "string",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "string",
      "content": "minimum 300 words full chapter content"
    },
    {
      "chapter_number": 2,
      "title": "string",
      "content": "minimum 300 words full chapter content"
    },
    {
      "chapter_number": 3,
      "title": "string",
      "content": "minimum 300 words full chapter content"
    }
  ],
  "summary": "minimum 200 words",
  "total_episodes": 10
}

IMPORTANT:
- chapters MUST have chapter_number
- chapters MUST NOT be empty
- content MUST be long and real
- structure MUST match database exactly
- Return ONLY the JSON object`;

function parseSeedResponse(raw: string): AISeedBook | null {
  const cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.title || !parsed.chapters || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) return null;
    if (!parsed.summary) return null;
    return parsed as AISeedBook;
  } catch {
    return null;
  }
}

function mapSeedToBookEpisodes(seed: AISeedBook): BookEpisodes {
  const mt = (text: string): MultilingualText => ({ ar: '', fr: '', en: text, de: '' });

  const episodes: RichChapter[] = seed.chapters.map((ch) => {
    const content = ch.content || '';
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const hook = sentences.slice(0, 2).join(' ');
    const keyIdeas = sentences.slice(1, 4).join(' ');
    const summary = sentences.slice(-2).join(' ');

    return {
      number: ch.chapter_number,
      title: mt(ch.title || ''),
      hook: mt(hook),
      content: mt(content),
      keyIdeas: mt(keyIdeas),
      actionableTips: mt(`Practical steps from "${ch.title}": apply the concepts discussed in daily practice.`),
      importantQuotes: mt(`"${sentences[0]?.replace(/^["']|["']$/g, '') || content.slice(0, 100)}"`),
      practicalExamples: mt(`Example: ${sentences.slice(1, 3).join(' ')}`),
      keyTakeaway: mt(`Key insight from ${ch.title}: ${sentences.slice(1, 3).join(' ')}`),
      cliffhanger: mt(`Building on ${ch.title}, the next chapter explores deeper applications.`),
      summary: mt(summary),
      wordCount: content.split(/\s+/).length,
    };
  });

  return {
    title: mt(seed.title),
    author: 'AI Generated',
    category: 'General',
    tagline: mt(seed.summary.slice(0, 100)),
    description: seed.summary.slice(0, 200),
    coverPrompt: `A professional book cover for "${seed.title}" with modern design`,
    relatedBooks: mt(''),
    deepExplanation: mt(''),
    finalSummary: mt(seed.summary),
    mainConcepts: mt(''),
    keyLessons: [],
    keyInsights: [],
    implementationGuide: mt(''),
    episodes,
  };
}

function generateSlug(title: string): string {
  return slugify(title) + '-' + Date.now().toString(36);
}

const DEFAULT_TOPICS = [
  'Artificial Intelligence for Beginners',
  'The Psychology of Habit Formation',
  'Mastering Personal Finance',
  'Introduction to Cloud Computing',
  'The Art of Effective Communication',
  'Understanding Data Science',
  'The Power of Critical Thinking',
  'Blockchain Technology Explained',
  'Principles of Sustainable Living',
  'The Science of Productivity',
];

export async function generateAISeedBooks(
  topics?: string[]
): Promise<AISeedResult[]> {
  const seedTopics = topics && topics.length > 0 ? topics : DEFAULT_TOPICS;
  const results: AISeedResult[] = [];

  for (const topic of seedTopics) {
    try {
      const userPrompt = `Generate a complete seed book about: "${topic}". Include exactly 3 chapters with chapter_number (1, 2, 3), each with minimum 300 words of content. Provide a summary of minimum 200 words. Generate a URL-friendly slug from the title.`;

      const routerResult = await routeCompletion({
        messages: [
          { role: 'system', content: SEED_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 8192,
        temperature: 0.7,
      });

      if (!routerResult.content) {
        results.push({ success: false, title: topic, error: 'Empty AI response' });
        continue;
      }

      const parsed = parseSeedResponse(routerResult.content);
      if (!parsed) {
        results.push({ success: false, title: topic, error: 'Failed to parse AI response' });
        continue;
      }

      if (!parsed.slug || parsed.slug.length < 3) {
        parsed.slug = generateSlug(parsed.title);
      }

      const bookData = mapSeedToBookEpisodes(parsed);

      const { bookId, slug } = await saveGeneratedBook(parsed.title, 'AI Generated', {
        ...bookData,
        description: parsed.summary.slice(0, 200),
        generationTimeMs: routerResult.latencyMs,
        aiModelUsed: `${routerResult.provider} (${routerResult.model})`,
        aiProvider: routerResult.provider,
        category: 'General',
      });

      results.push({ success: true, slug, title: parsed.title, bookId });
    } catch (err) {
      results.push({
        success: false,
        title: topic,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}
