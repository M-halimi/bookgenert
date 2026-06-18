import { MOODS, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from './moods';

export interface BookMetadata {
  title: string;
  author?: string;
  category?: string;
  description?: string;
}

interface ClassificationResult {
  moods: ScoredMood[];
  source: 'ai' | 'semantic' | 'keyword';
  confidence: number;
}

const MOOD_SIGNATURES: Record<MoodId, { primaryTerms: string[]; categoryHints: string[]; weightTerms: string[] }> = {
  inspiring: {
    primaryTerms: ['inspire', 'motiv', 'achieve', 'potential', 'dream', 'purpose', 'hope', 'aspire', 'encourage'],
    categoryHints: ['self-help', 'motivational', 'inspirational', 'personal development'],
    weightTerms: ['uplifting', 'breakthrough', 'transform', 'fulfill', 'passion', 'courage']
  },
  dark: {
    primaryTerms: ['dark', 'dystopia', 'tragedy', 'suffering', 'loss', 'crisis', 'shadow', 'despair'],
    categoryHints: ['dystopian', 'tragedy', 'horror', 'dark', 'noir'],
    weightTerms: ['survival', 'oppression', 'war', 'collapse', 'fear', 'death']
  },
  fast_paced: {
    primaryTerms: ['fast', 'action', 'thriller', 'urgency', 'momentum', 'race', 'countdown'],
    categoryHints: ['thriller', 'action', 'suspense', 'adventure'],
    weightTerms: ['page-turner', 'gripping', 'intense', 'rapid', 'breakneck']
  },
  meditative: {
    primaryTerms: ['meditat', 'mindful', 'calm', 'peace', 'reflection', 'stillness', 'present', 'zen', 'contemplation'],
    categoryHints: ['meditation', 'mindfulness', 'spirituality', 'philosophy'],
    weightTerms: ['awareness', 'inner peace', 'slow', 'breathe', 'being', 'presence']
  },
  practical: {
    primaryTerms: ['practical', 'how to', 'guide', 'framework', 'step-by-step', 'actionable', 'toolkit', 'handbook', 'playbook', 'blueprint'],
    categoryHints: ['self-help', 'business', 'how-to', 'guide', 'reference'],
    weightTerms: ['implement', 'exercise', 'method', 'system', 'technique', 'template']
  },
  thought_provoking: {
    primaryTerms: ['philosophy', 'question', 'paradox', 'challenge assumption', 'ethics', 'consciousness', 'moral', 'debate', 'provocative'],
    categoryHints: ['philosophy', 'science', 'psychology', 'theory'],
    weightTerms: ['think again', 'question', 'unconventional', 'contrarian', 'profound', 'mind-bending']
  },
  curious: {
    primaryTerms: ['fascin', 'discover', 'unexpected', 'secret', 'reveal', 'curios', 'surprising', 'wonder', 'intrigue', 'hidden'],
    categoryHints: ['science', 'history', 'popular science', 'trivia'],
    weightTerms: ['amazing', 'eye-opening', 'uncover', 'explore', 'unknown', 'mind-blowing']
  },
  emotional: {
    primaryTerms: ['heart', 'emotion', 'feeling', 'love', 'grief', 'joy', 'tear', 'moving', 'touching', 'compassion'],
    categoryHints: ['memoir', 'biography', 'fiction', 'romance', 'drama'],
    weightTerms: ['heartfelt', 'poignant', 'powerful story', 'human', 'raw', 'vulnerable']
  },
  high_performance: {
    primaryTerms: ['productivity', 'discipline', 'achievement', 'peak performance', 'optimize', 'efficiency', 'execution', 'output', 'focus', 'system', 'habit'],
    categoryHints: ['self-help', 'business', 'productivity', 'management'],
    weightTerms: ['high output', 'flow', 'deep work', 'excellence', 'mastery', 'results']
  },
  self_growth: {
    primaryTerms: ['self-improvement', 'personal development', 'growth mindset', 'habit', 'transform', 'change', 'better', 'potential', 'improve'],
    categoryHints: ['self-help', 'personal development', 'psychology', 'wellness'],
    weightTerms: ['growth', 'becoming', 'evolve', 'level up', 'change', 'progress']
  },
  money_wealth: {
    primaryTerms: ['money', 'wealth', 'finance', 'invest', 'economy', 'financial', 'budget', 'saving', 'retire', 'income', 'stock', 'market'],
    categoryHints: ['finance', 'business', 'economics', 'investing', 'money'],
    weightTerms: ['financial freedom', 'wealth building', 'passive income', 'prosperity', 'fundamentals']
  },
  psychology: {
    primaryTerms: ['psychology', 'cognitive', 'behavior', 'mental', 'brain', 'mind', 'neuroscience', 'bias', 'perception', 'conditioning'],
    categoryHints: ['psychology', 'cognitive science', 'neuroscience', 'behavioral economics'],
    weightTerms: ['mental model', 'subconscious', 'rewire', 'mindset', 'emotional intelligence']
  },
  decision_making: {
    primaryTerms: ['decision', 'judgment', 'critical thinking', 'choice', 'problem solving', 'logic', 'analysis', 'strategy', 'trade-off', 'framework'],
    categoryHints: ['business', 'psychology', 'economics', 'philosophy', 'strategy'],
    weightTerms: ['bias', 'heuristics', 'rational', 'uncertainty', 'tradeoffs', 'evaluate']
  },
  future_ai: {
    primaryTerms: ['artificial intelligence', 'future', 'technology', 'AI', 'automation', 'robot', 'machine learning', 'digital', 'algorithm', 'innovation'],
    categoryHints: ['technology', 'science', 'futurism', 'AI', 'computer science'],
    weightTerms: ['disruption', 'tech trend', 'singularity', 'digital age', 'emerging tech', 'data']
  },
  leadership: {
    primaryTerms: ['leadership', 'manage', 'influence', 'team', 'executive', 'organization', 'vision', 'strategy', 'empower', 'mentor'],
    categoryHints: ['business', 'management', 'leadership', 'organizational'],
    weightTerms: ['lead', 'guide', 'motivate team', 'culture', 'visionary leader']
  },
  resilience: {
    primaryTerms: ['resilience', 'grit', 'perseverance', 'mental toughness', 'adversity', 'overcome', 'endure', 'courage', 'fortitude', 'strength'],
    categoryHints: ['self-help', 'biography', 'memoir', 'psychology', 'sports'],
    weightTerms: ['never give up', 'bounce back', 'survive', 'triumph', 'determination', 'persistence']
  },
  creativity: {
    primaryTerms: ['creativity', 'innovation', 'imagination', 'design', 'art', 'invent', 'original', 'inspiration', 'idea', 'creative'],
    categoryHints: ['art', 'design', 'creativity', 'innovation', 'self-help'],
    weightTerms: ['think different', 'breakthrough', 'novel', 'imagination', 'ingenuity', 'brainstorm']
  },
  human_nature: {
    primaryTerms: ['human nature', 'relationship', 'social', 'connection', 'empathy', 'tribe', 'community', 'behavior', 'society'],
    categoryHints: ['psychology', 'sociology', 'anthropology', 'relationships', 'self-help'],
    weightTerms: ['understand people', 'belonging', 'social dynamics', 'trust', 'cooperation', 'humanity']
  },
  existential: {
    primaryTerms: ['meaning', 'purpose', 'identity', 'mortality', 'existence', 'universe', 'consciousness', 'philosophy', 'life', 'death'],
    categoryHints: ['philosophy', 'spirituality', 'existential', 'metaphysics', 'science'],
    weightTerms: ['why are we here', 'what matters', 'deep questions', 'transcendence', 'legacy']
  },
  visionary: {
    primaryTerms: ['vision', 'future', 'transformation', 'paradigm', 'breakthrough', 'revolution', 'possibility', 'radical', 'bold'],
    categoryHints: ['technology', 'science', 'philosophy', 'futurism', 'innovation'],
    weightTerms: ['big idea', 'future vision', 'moonshot', 'reinvent', 'next frontier', 'imagine']
  },
  communication: {
    primaryTerms: ['communicate', 'persuade', 'negotiate', 'speak', 'conversation', 'listen', 'rhetoric', 'storytelling', 'present', 'write'],
    categoryHints: ['communication', 'business', 'self-help', 'writing', 'public speaking'],
    weightTerms: ['influence', 'connect', 'articulate', 'convince', 'dialogue', 'express']
  },
  entrepreneurship: {
    primaryTerms: ['startup', 'entrepreneur', 'venture', 'scale', 'disrupt', 'product', 'market', 'launch', 'founder', 'business model'],
    categoryHints: ['business', 'entrepreneurship', 'startup', 'technology'],
    weightTerms: ['build', 'grow', 'fundraising', 'innovation', 'pivot', 'mvp', 'venture']
  },
  career_growth: {
    primaryTerms: ['career', 'professional', 'advance', 'promotion', 'job', 'skill', 'network', 'success', 'workplace', 'ambition'],
    categoryHints: ['career', 'business', 'professional development', 'self-help'],
    weightTerms: ['get ahead', 'promotion', 'career change', 'professional development', 'navigate', 'climb']
  }
};

function titleWords(title: string): string[] {
  return title.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
}

function titleContains(title: string, terms: string[]): boolean {
  const lower = title.toLowerCase();
  return terms.some(t => lower.includes(t));
}

function categoryContains(category: string | undefined, hints: string[]): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return hints.some(h => lower.includes(h));
}

export function classifyByMetadata(book: BookMetadata): ScoredMood[] {
  const title = book.title || '';
  const category = (book.category || '').toLowerCase();
  const description = (book.description || '').toLowerCase();

  const scores: Record<string, number> = {};

  for (const mood of MOODS) {
    const sig = MOOD_SIGNATURES[mood.id];
    if (!sig) continue;

    let score = 0;
    let matchCount = 0;

    const words = titleWords(title);

    const allTerms = [...sig.primaryTerms, ...sig.weightTerms];

    for (const term of allTerms) {
      const inTitle = titleContains(title, [term]);
      const inCategory = categoryContains(book.category, [term]);
      const inDesc = description.includes(term);

      if (inTitle) {
        score += 20;
        matchCount++;
      }
      if (inCategory) {
        score += 15;
        matchCount++;
      }
      if (inDesc) {
        score += 8;
        matchCount++;
      }
    }

    for (const hint of sig.categoryHints) {
      if (category.includes(hint)) {
        score += 10;
        matchCount++;
      }
    }

    for (const word of words) {
      if (sig.primaryTerms.some(t => t.includes(word) || word.includes(t))) {
        score += 12;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const finalScore = Math.min(100, Math.round(score + matchCount * 3));
      if (finalScore >= MOOD_SCORE_THRESHOLD - 10) {
        scores[mood.id] = finalScore;
      }
    }
  }

  return Object.entries(scores)
    .map(([mood, score]) => ({ mood: mood as MoodId, score }))
    .sort((a, b) => b.score - a.score);
}

type MutableEntry = ScoredMood & { slug?: string; title?: string };

export function ensureMinimumBooks(
  current: Record<MoodId, ScoredMood[]>,
  classified: Record<string, { title: string; moods: ScoredMood[] }>,
  minimum = 20
): Record<MoodId, ScoredMood[]> {
  const result = {} as Record<MoodId, MutableEntry[]>;
  for (const mood of MOODS) {
    result[mood.id] = [...(current[mood.id] || [])];
  }

  const slugsByMood = {} as Record<MoodId, Set<string>>;
  for (const mood of MOODS) {
    slugsByMood[mood.id] = new Set(result[mood.id].map(b => b.slug).filter((s): s is string => !!s));
  }

  let underfilled = MOODS.filter(m => (result[m.id]?.length || 0) < minimum);

  for (const bookSlug in classified) {
    if (underfilled.length === 0) break;
    const book = classified[bookSlug];

    const eligibleMoods = book.moods
      .filter(m => m.score >= MOOD_SCORE_THRESHOLD)
      .filter(m => (result[m.mood]?.length || 0) < minimum)
      .sort((a, b) => b.score - a.score);

    for (const sm of eligibleMoods) {
      if (!slugsByMood[sm.mood].has(bookSlug)) {
        result[sm.mood].push({ mood: sm.mood, slug: bookSlug, title: book.title, score: sm.score });
        slugsByMood[sm.mood].add(bookSlug);
      }
    }

    underfilled = MOODS.filter(m => (result[m.id]?.length || 0) < minimum);
  }

  const relatedEntries: { slug: string; title: string; moods: ScoredMood[] }[] =
    Object.entries(classified).map(([slug, val]) => ({ slug, ...val }));

  for (const mood of underfilled) {
    let needed = minimum - (result[mood.id]?.length || 0);
    if (needed <= 0) continue;

    const candidates = relatedEntries
      .filter(b => b.moods.some(m => m.mood === mood.id))
      .sort((a, b) => {
        const aScore = a.moods.find(m => m.mood === mood.id)?.score || 0;
        const bScore = b.moods.find(m => m.mood === mood.id)?.score || 0;
        return bScore - aScore;
      });

    for (const candidate of candidates) {
      if (needed <= 0) break;
      if (!slugsByMood[mood.id].has(candidate.slug)) {
        const score = candidate.moods.find(m => m.mood === mood.id)?.score || MOOD_SCORE_THRESHOLD;
        result[mood.id].push({ mood: mood.id, slug: candidate.slug, title: candidate.title, score });
        slugsByMood[mood.id].add(candidate.slug);
        needed--;
      }
    }
  }

  return result as Record<MoodId, ScoredMood[]>;
}

export function classifyByContent(
  metadata: BookMetadata,
  episodeContents?: string[]
): ClassificationResult {
  const metaMoods = classifyByMetadata(metadata);

  if (episodeContents && episodeContents.length > 0) {
    const text = episodeContents.join(' ').toLowerCase();
    const keywordMoods: ScoredMood[] = MOODS.map(mood => {
      const count = mood.keywords.reduce((sum, kw) => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        return sum + (matches ? matches.length : 0);
      }, 0);
      return { mood: mood.id, score: count };
    });

    const maxScore = Math.max(...keywordMoods.map(r => r.score), 1);
    const contentMoods = keywordMoods
      .map(r => ({ ...r, score: Math.round((r.score / maxScore) * 100) }))
      .filter(r => r.score >= MOOD_SCORE_THRESHOLD);

    const merged = mergeScores(metaMoods, contentMoods);

    if (merged.length > 0) {
      return { moods: merged, source: 'semantic', confidence: 0.7 };
    }
  }

  const result = metaMoods.filter(m => m.score >= MOOD_SCORE_THRESHOLD);
  if (result.length > 0) {
    return { moods: result, source: 'semantic', confidence: 0.6 };
  }

  return { moods: [], source: 'semantic', confidence: 0 };
}

function mergeScores(a: ScoredMood[], b: ScoredMood[]): ScoredMood[] {
  const map = new Map<MoodId, number>();

  for (const m of a) {
    map.set(m.mood, m.score);
  }
  for (const m of b) {
    const existing = map.get(m.mood) || 0;
    map.set(m.mood, Math.round((existing + m.score) / 2 + Math.max(existing, m.score) * 0.3));
  }

  return Array.from(map.entries())
    .map(([mood, score]) => ({ mood, score: Math.min(100, score) }))
    .filter(m => m.score >= MOOD_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
