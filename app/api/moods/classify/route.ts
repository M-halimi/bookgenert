import { NextRequest, NextResponse } from 'next/server';
import { getApiManager } from '@/lib/api-manager';
import { MOODS, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from '@/lib/moods';
import { classifyByMetadata } from '@/lib/mood-classifier';
import { saveMoodClassification } from '@/lib/db/moods';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { slug, title, author, category, description, episodeContents } = await request.json();

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
    }

    let moods: ScoredMood[] = [];
    let source: 'ai' | 'metadata' = 'metadata';

    try {
      const api = getApiManager();

      const moodDescriptions = MOODS.map(
        m => `- ${m.id}: ${m.label} — ${m.description}. ${m.aiRules}`
      ).join('\n');

      const bookDescription = description || `Title: ${title}. Author: ${author || 'Unknown'}. Category: ${category || 'General'}.`;

      const result = await api.complete({
        messages: [
          {
            role: 'system',
            content: `You are an expert book analyst and recommendation AI.

Analyze this book and score it against each mood from 0-100 based on thematic relevance, content, and reader experience.

Only include moods with score > ${MOOD_SCORE_THRESHOLD}.
Return valid JSON only.

---

MOODS:
${moodDescriptions}

---

RULES:
- Score each mood 0-100
- Base scores on: book title, description, themes, category
- High score (>70) = book strongly embodies this mood
- Consider both explicit and implicit themes
- Include 2-5 related_moods that pair well with this book
- pacing: "slow" | "medium" | "fast"
- emotional_intensity: 1-10
- confidence: 0-1

---

JSON SCHEMA:
{
  "moods": [
    { "mood": "inspiring", "score": 85 }
  ],
  "related_moods": ["self_growth", "meditative"],
  "pacing": "medium",
  "emotional_intensity": 7,
  "confidence": 0.85
}`
          },
          {
            role: 'user',
            content: `Book: ${title}\nAuthor: ${author || 'Unknown'}\nCategory: ${category || 'General'}\nDescription: ${bookDescription.slice(0, 3000)}${episodeContents ? '\n\nContent:\n' + episodeContents.slice(0, 3).join('\n\n').slice(0, 4000) : ''}`
          }
        ],
        maxTokens: 1024,
        temperature: 0.3,
      });

      const cleaned = result.content.replace(/```json\s*/i, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const rawMoods = parsed.moods ?? [];
      const validIds = new Set(MOODS.map(m => m.id));

      moods = (Array.isArray(rawMoods) ? rawMoods : [])
        .filter((m: unknown) => {
          const item = m as { mood?: string; score?: number };
          return item && typeof item.mood === 'string' && validIds.has(item.mood as MoodId) && typeof item.score === 'number';
        })
        .map((m: unknown) => ({
          mood: (m as { mood: string; score: number }).mood as MoodId,
          score: Math.min(100, Math.max(0, Math.round((m as { mood: string; score: number }).score))),
        }))
        .filter(m => m.score > MOOD_SCORE_THRESHOLD);

      source = 'ai';
    } catch {
      const metadata = { title, author, category, description };
      moods = classifyByMetadata(metadata).filter(m => m.score >= MOOD_SCORE_THRESHOLD);
    }

    if (moods.length === 0) {
      moods = classifyByMetadata({ title, author, category, description })
        .filter(m => m.score >= MOOD_SCORE_THRESHOLD - 10)
        .map(m => ({ ...m, score: m.score + 5 }));
    }

    // Persist to database
    const book = await prisma.book.findUnique({ where: { slug } });
    if (book && moods.length > 0) {
      await saveMoodClassification(book.id, moods, source);
    }

    return NextResponse.json({
      slug,
      moods,
      source: 'classify',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to classify book' }, { status: 500 });
  }
}
