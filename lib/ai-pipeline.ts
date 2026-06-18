import { prisma } from '@/lib/prisma';
import { getApiManager } from '@/lib/api-manager';
import { MOODS, MOOD_SCORE_THRESHOLD, analyzeMoodsFromText, type MoodId, type ScoredMood } from '@/lib/moods';
import { classifyByMetadata } from '@/lib/mood-classifier';
import { saveMoodClassification } from '@/lib/db/moods';

export interface PipelineResult {
  slug: string;
  moods: ScoredMood[];
  source: 'ai' | 'keyword' | 'metadata';
  confidence: number;
  durationMs: number;
}

export async function runMoodPipeline(slug: string): Promise<PipelineResult> {
  const start = Date.now();

  const book = await prisma.book.findUnique({
    where: { slug },
    include: {
      moods: true,
      author: true,
    },
  });

  if (!book) {
    throw new Error(`Book not found: ${slug}`);
  }

  // Try AI first
  try {
    const aiResult = await classifyWithAI({
      title: book.title,
      author: book.author?.name,
      category: book.category ?? undefined,
      description: book.description ?? undefined,
      episodes: book.episodes as string[] | undefined,
    });

    await saveMoodClassification(book.id, aiResult.moods, 'ai');

    return {
      slug,
      moods: aiResult.moods,
      source: 'ai',
      confidence: aiResult.confidence,
      durationMs: Date.now() - start,
    };
  } catch {
    // AI failed — try keyword-based
    const textToAnalyze = [
      book.title,
      book.description,
      book.author?.name,
      book.category,
    ].filter(Boolean).join(' ');

    const keywordMoods = analyzeMoodsFromText(textToAnalyze);
    const validMoods = keywordMoods.filter((m) => m.score >= MOOD_SCORE_THRESHOLD);

    if (validMoods.length >= 2) {
      await saveMoodClassification(book.id, validMoods, 'keyword');

      return {
        slug,
        moods: validMoods,
        source: 'keyword',
        confidence: 0.5,
        durationMs: Date.now() - start,
      };
    }

    // Last resort — metadata-based
    const metaMoods = classifyByMetadata({
      title: book.title,
      author: book.author?.name,
      category: book.category ?? undefined,
      description: book.description ?? undefined,
    }).filter((m) => m.score >= MOOD_SCORE_THRESHOLD - 5);

    if (metaMoods.length > 0) {
      await saveMoodClassification(book.id, metaMoods, 'metadata');
    }

    return {
      slug,
      moods: metaMoods,
      source: 'metadata',
      confidence: 0.3,
      durationMs: Date.now() - start,
    };
  }
}

export async function classifyWithAI(input: {
  title: string;
  author?: string;
  category?: string;
  description?: string;
  episodes?: string[];
}): Promise<{ moods: ScoredMood[]; confidence: number }> {
  const api = getApiManager();

  const moodDescriptions = MOODS.map(
    (m) =>
      `- ${m.id}: ${m.label} — ${m.description}. Keywords: ${m.keywords.slice(0, 4).join(', ')}. Rules: ${m.aiRules}`,
  ).join('\n');

  const contentText = input.episodes?.join('\n\n') || input.description || '';

  const result = await api.complete({
    messages: [
      {
        role: 'system',
        content: `You are an expert book analyst. Analyze this book's content and classify it into moods.

Score each mood 0-100 based on semantic analysis of themes, tone, ideas, and reader experience.
Only include moods where the score exceeds ${MOOD_SCORE_THRESHOLD}.
Return ONLY valid JSON.

AVAILABLE MOODS:
${moodDescriptions}

JSON SCHEMA:
{
  "moods": [{ "mood": "inspiring", "score": 88 }],
  "related_moods": ["meditative", "curious"],
  "pacing": "medium",
  "emotional_intensity": 7,
  "confidence": 0.85
}`,
      },
      {
        role: 'user',
        content: `Title: ${input.title}${input.author ? `\nAuthor: ${input.author}` : ''}${input.category ? `\nCategory: ${input.category}` : ''}\n\nContent:\n${contentText.slice(0, 6000)}`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.3,
  });

  const cleaned = result.content.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const rawMoods = parsed.moods ?? [];
  const validIds = new Set<string>(MOODS.map((m) => m.id));

  const moods: ScoredMood[] = (Array.isArray(rawMoods) ? rawMoods : [])
    .filter((m: unknown) => {
      const item = m as { mood?: string; score?: number };
      return (
        item &&
        typeof item.mood === 'string' &&
        validIds.has(item.mood) &&
        typeof item.score === 'number'
      );
    })
    .map((m: unknown) => ({
      mood: (m as { mood: string; score: number }).mood as MoodId,
      score: Math.min(100, Math.max(0, Math.round((m as { mood: string; score: number }).score))),
    }))
    .filter((m) => m.score > MOOD_SCORE_THRESHOLD);

  if (moods.length < 2) {
    const metaMoods = classifyByMetadata({
      title: input.title,
      author: input.author,
      category: input.category,
      description: input.description,
    });

    for (const mm of metaMoods) {
      if (!moods.some((m) => m.mood === mm.mood) && mm.score >= MOOD_SCORE_THRESHOLD - 5) {
        moods.push(mm);
      }
    }
  }

  return {
    moods,
    confidence: parsed.confidence ?? 0.7,
  };
}

export async function runBulkMoodPipeline(options?: {
  limit?: number;
  source?: 'all' | 'unanalyzed';
}) {
  const { limit = 50, source = 'unanalyzed' } = options ?? {};

  const books = source === 'unanalyzed'
    ? await prisma.book.findMany({
        where: { moodAnalyzed: false },
        take: limit,
        orderBy: { createdAt: 'asc' },
      })
    : await prisma.book.findMany({
        take: limit,
        orderBy: { createdAt: 'asc' },
      });

  const results: PipelineResult[] = [];
  for (const book of books) {
    try {
      const result = await runMoodPipeline(book.slug);
      results.push(result);
    } catch (error) {
      console.error(`Mood pipeline failed for ${book.slug}:`, error);
    }
  }

  return {
    processed: results.length,
    results,
  };
}
