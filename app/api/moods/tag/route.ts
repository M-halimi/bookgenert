import { NextRequest, NextResponse } from 'next/server';
import { getApiManager } from '@/lib/api-manager';
import { MOODS, analyzeMoodsFromText, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from '@/lib/moods';
import { runMoodPipeline } from '@/lib/ai-pipeline';

export async function POST(request: NextRequest) {
  try {
    const { slug, content, episodeContents, title, author, category } = await request.json();
    const textToAnalyze = episodeContents?.join('\n\n') || content || '';

    if (!textToAnalyze || textToAnalyze.length < 50) {
      return NextResponse.json({ error: 'Sufficient content is required' }, { status: 400 });
    }

    try {
      const api = getApiManager();

      const moodDescriptions = MOODS.map(
        m => `- ${m.id}: ${m.label} — ${m.description}. Keywords: ${m.keywords.slice(0, 4).join(', ')}. Rules: ${m.aiRules}`
      ).join('\n');

      const result = await api.complete({
        messages: [
          {
            role: 'system',
            content: `You are an expert book analyst and recommendation AI.

Analyze this book's content and classify it into moods. Score each mood 0-100 based on semantic analysis of themes, tone, ideas, and reader experience.

Only include moods where the score exceeds ${MOOD_SCORE_THRESHOLD}.
Also suggest 2-5 related mood IDs.

Return ONLY valid JSON.

---

AVAILABLE MOODS:
${moodDescriptions}

---

RULES:
- Read the content carefully and identify dominant themes
- Score each mood 0-100: higher = stronger thematic match
- Only include moods with score > ${MOOD_SCORE_THRESHOLD}
- related_moods: other mood IDs that complement this book
- Consider: writing style, emotional tone, subject matter, target audience
- pacing: "slow" | "medium" | "fast"
- emotional_intensity: 1-10
- confidence: 0-1

---

JSON SCHEMA:
{
  "moods": [
    { "mood": "inspiring", "score": 88 },
    { "mood": "self_growth", "score": 75 }
  ],
  "related_moods": ["meditative", "curious"],
  "pacing": "medium",
  "emotional_intensity": 7,
  "confidence": 0.85
}`
          },
          {
            role: 'user',
            content: `Title: ${title || 'Unknown'}${author ? `\nAuthor: ${author}` : ''}${category ? `\nCategory: ${category}` : ''}\n\nContent:\n${textToAnalyze.slice(0, 6000)}`
          }
        ],
        maxTokens: 1024,
        temperature: 0.3,
      });

      const cleaned = result.content.replace(/```json\s*/i, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const rawMoods = parsed.moods ?? [];
      const validIds = new Set<string>(MOODS.map(m => m.id));

      const moods: ScoredMood[] = (Array.isArray(rawMoods) ? rawMoods : [])
        .filter((m: unknown) => {
          const item = m as { mood?: string; score?: number };
          return item && typeof item.mood === 'string' && validIds.has(item.mood) && typeof item.score === 'number';
        })
        .map((m: unknown) => ({
          mood: (m as { mood: string; score: number }).mood as MoodId,
          score: Math.min(100, Math.max(0, Math.round((m as { mood: string; score: number }).score))),
        }))
        .filter(m => m.score > MOOD_SCORE_THRESHOLD);

      const rawRelated = parsed.related_moods ?? [];
      const relatedMoods: MoodId[] = (Array.isArray(rawRelated) ? rawRelated : [])
        .filter((r: unknown) => typeof r === 'string' && validIds.has(r))
        .slice(0, 5) as MoodId[];

      if (moods.length < 2) {
        const { classifyByMetadata } = await import('@/lib/mood-classifier');
        const metaMoods = classifyByMetadata({ title: title || '', author, category });
        for (const mm of metaMoods) {
          if (!moods.some(m => m.mood === mm.mood) && mm.score >= MOOD_SCORE_THRESHOLD - 5) {
            moods.push(mm);
          }
        }
      }

      // Persist to database if slug is provided
      if (slug && moods.length > 0) {
        await runMoodPipeline(slug).catch(() => {});
      }

      return NextResponse.json({
        moods,
        relatedMoods,
        pacing: parsed.pacing || 'medium',
        emotional_intensity: parsed.emotional_intensity ?? 5,
        confidence: parsed.confidence ?? 0.7,
        source: 'ai'
      });
    } catch {
      const fallback = analyzeMoodsFromText(textToAnalyze);

      const { classifyByMetadata } = await import('@/lib/mood-classifier');
      const metaMoods = classifyByMetadata({ title: title || '', author, category });
      const merged = [...fallback, ...metaMoods];
      const combined = merged.reduce((acc, m) => {
        const existing = acc.find(a => a.mood === m.mood);
        if (existing) {
          existing.score = Math.round((existing.score + m.score) / 2);
        } else {
          acc.push({ ...m });
        }
        return acc;
      }, [] as ScoredMood[]);

      return NextResponse.json({
        moods: combined.filter(m => m.score > MOOD_SCORE_THRESHOLD),
        relatedMoods: [] as MoodId[],
        pacing: 'medium',
        emotional_intensity: 5,
        confidence: 0.5,
        source: 'keyword'
      });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to analyze moods' }, { status: 500 });
  }
}
