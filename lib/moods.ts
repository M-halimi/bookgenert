export type MoodId =
  | 'inspiring'
  | 'dark'
  | 'fast_paced'
  | 'meditative'
  | 'practical'
  | 'thought_provoking'
  | 'curious'
  | 'emotional'
  | 'high_performance'
  | 'self_growth'
  | 'money_wealth'
  | 'psychology'
  | 'decision_making'
  | 'future_ai'
  | 'leadership'
  | 'resilience'
  | 'creativity'
  | 'human_nature'
  | 'existential'
  | 'visionary'
  | 'communication'
  | 'entrepreneurship'
  | 'career_growth';

export interface Mood {
  id: MoodId;
  label: string;
  emoji: string;
  description: string;
  color: string;
  keywords: string[];
  relatedMoods: MoodId[];
  aiRules: string;
}

export interface ScoredMood {
  mood: MoodId;
  score: number;
}

export type MoodResult = ScoredMood;

export interface MoodTagResponse {
  moods: ScoredMood[];
  relatedMoods: MoodId[];
  pacing: 'slow' | 'medium' | 'fast';
  emotional_intensity: number;
  confidence: number;
  source: 'ai' | 'keyword';
}

export const MOODS: Mood[] = [
  {
    id: 'inspiring',
    label: 'Inspiring',
    emoji: '✨',
    description: 'Uplifting and motivational',
    color: 'amber',
    keywords: ['inspire', 'motiv', 'achieve', 'success', 'potential', 'dream', 'believe', 'purpose', 'growth', 'hope'],
    relatedMoods: ['meditative', 'self_growth', 'visionary', 'resilience'],
    aiRules: 'Books that uplift, motivate, and inspire action or a positive outlook. Look for aspirational language and calls to reach one\'s potential.'
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌑',
    description: 'Deep and philosophical',
    color: 'violet',
    keywords: ['dark', 'struggle', 'pain', 'loss', 'fear', 'shadow', 'crisis', 'suffer', 'tragedy', 'despair'],
    relatedMoods: ['existential', 'thought_provoking', 'human_nature', 'resilience'],
    aiRules: 'Books with heavy, somber, or unsettling themes. Explores suffering, tragedy, or the darker aspects of human experience.'
  },
  {
    id: 'fast_paced',
    label: 'Fast-Paced',
    emoji: '⚡',
    description: 'Quick and energetic',
    color: 'orange',
    keywords: ['fast', 'quick', 'action', 'urgent', 'speed', 'rapid', 'momentum', 'intense', 'accelerate', 'explosive'],
    relatedMoods: ['high_performance', 'entrepreneurship', 'career_growth', 'decision_making'],
    aiRules: 'Fast-moving, high-energy books with brisk pacing. Short chapters, urgent stakes, or a sense of forward momentum.'
  },
  {
    id: 'meditative',
    label: 'Meditative',
    emoji: '🧘',
    description: 'Calm and reflective',
    color: 'teal',
    keywords: ['meditat', 'calm', 'peace', 'mindful', 'reflect', 'still', 'present', 'aware', 'breathe', 'serene'],
    relatedMoods: ['existential', 'inspiring', 'psychology', 'human_nature'],
    aiRules: 'Slow-paced, contemplative books that encourage mindfulness, presence, and inner reflection.'
  },
  {
    id: 'practical',
    label: 'Practical',
    emoji: '🔧',
    description: 'Hands-on and actionable',
    color: 'blue',
    keywords: ['practical', 'how to', 'step', 'exercise', 'implement', 'apply', 'action', 'strategy', 'method', 'guide', 'framework'],
    relatedMoods: ['decision_making', 'high_performance', 'career_growth', 'self_growth'],
    aiRules: 'Books focused on concrete, actionable advice. Step-by-step guides, frameworks, exercises, and real-world application.'
  },
  {
    id: 'thought_provoking',
    label: 'Thought-Provoking',
    emoji: '💡',
    description: 'Challenges assumptions',
    color: 'purple',
    keywords: ['question', 'paradox', 'challenge', 'deeper', 'meaning', 'philosophy', 'ethics', 'assumption', 'provocative'],
    relatedMoods: ['existential', 'psychology', 'visionary', 'future_ai'],
    aiRules: 'Books that challenge conventional wisdom, question assumptions, and provoke deep intellectual reflection.'
  },
  {
    id: 'curious',
    label: 'Curious',
    emoji: '🔍',
    description: 'Fascinating and eye-opening',
    color: 'pink',
    keywords: ['fascin', 'surprising', 'unexpected', 'discover', 'secret', 'reveal', 'amazing', 'wonder', 'intriguing'],
    relatedMoods: ['psychology', 'future_ai', 'creativity', 'human_nature'],
    aiRules: 'Books that feed curiosity with fascinating facts, surprising revelations, and eye-opening insights about the world.'
  },
  {
    id: 'emotional',
    label: 'Emotional',
    emoji: '❤️',
    description: 'Heartfelt and touching',
    color: 'rose',
    keywords: ['heart', 'emotion', 'feel', 'touch', 'moving', 'love', 'kindness', 'compass', 'grief', 'joy'],
    relatedMoods: ['human_nature', 'inspiring', 'meditative', 'resilience'],
    aiRules: 'Books with strong emotional resonance. Stories or insights that evoke empathy, joy, grief, or deep feeling.'
  },
  {
    id: 'high_performance',
    label: 'High Performance',
    emoji: '🚀',
    description: 'Productivity, discipline, achievement',
    color: 'emerald',
    keywords: ['productivity', 'discipline', 'achievement', 'peak', 'perform', 'optimize', 'efficiency', 'execution', 'output', 'focus', 'system'],
    relatedMoods: ['career_growth', 'entrepreneurship', 'leadership', 'self_growth', 'resilience'],
    aiRules: 'Books about peak productivity, discipline systems, optimizing performance, and achieving ambitious outcomes.'
  },
  {
    id: 'self_growth',
    label: 'Self Growth',
    emoji: '📈',
    description: 'Habits, self-improvement, personal development',
    color: 'green',
    keywords: ['habit', 'self-improvement', 'personal development', 'growth mindset', 'transform', 'change', 'progress', 'improve', 'potential', 'better'],
    relatedMoods: ['inspiring', 'high_performance', 'psychology', 'resilience', 'career_growth'],
    aiRules: 'Books about personal transformation, habit formation, self-improvement techniques, and becoming a better version of oneself.'
  },
  {
    id: 'money_wealth',
    label: 'Money & Wealth',
    emoji: '💰',
    description: 'Finance, investing, business',
    color: 'yellow',
    keywords: ['finance', 'invest', 'money', 'wealth', 'economy', 'stock', 'market', 'budget', 'saving', 'retire', 'financial', 'passive income'],
    relatedMoods: ['entrepreneurship', 'career_growth', 'decision_making', 'high_performance'],
    aiRules: 'Books covering personal finance, investing strategies, wealth building, economic principles, and financial independence.'
  },
  {
    id: 'psychology',
    label: 'Psychology',
    emoji: '🧠',
    description: 'Behavior, cognitive biases, mental models',
    color: 'indigo',
    keywords: ['psychology', 'cognitive bias', 'mental model', 'behavior', 'mindset', 'brain', 'mind', 'perception', 'think', 'neuroscience', 'behavioral'],
    relatedMoods: ['human_nature', 'decision_making', 'thought_provoking', 'self_growth', 'curious'],
    aiRules: 'Books exploring cognitive science, behavioral psychology, mental models, decision biases, and how the mind works.'
  },
  {
    id: 'decision_making',
    label: 'Decision Making',
    emoji: '🎯',
    description: 'Critical thinking and judgment',
    color: 'sky',
    keywords: ['decision', 'judgment', 'critical thinking', 'choice', 'problem solving', 'logic', 'analysis', 'evaluate', 'trade-off', 'strategy'],
    relatedMoods: ['psychology', 'leadership', 'practical', 'future_ai', 'money_wealth'],
    aiRules: 'Books about critical thinking, judgment under uncertainty, problem-solving frameworks, and making better decisions.'
  },
  {
    id: 'future_ai',
    label: 'Future & AI',
    emoji: '🌍',
    description: 'Technology, artificial intelligence, future trends',
    color: 'cyan',
    keywords: ['AI', 'artificial intelligence', 'future', 'technology', 'innovation', 'automation', 'digital', 'robot', 'machine learning', 'data', 'tech trend'],
    relatedMoods: ['visionary', 'psychology', 'decision_making', 'entrepreneurship', 'creativity'],
    aiRules: 'Books about artificial intelligence, emerging tech, futurism, digital transformation, and technology\'s societal impact.'
  },
  {
    id: 'leadership',
    label: 'Leadership',
    emoji: '🏆',
    description: 'Management and influence',
    color: 'red',
    keywords: ['leadership', 'manage', 'influence', 'team', 'mentor', 'guide', 'lead', 'executive', 'organization', 'vision', 'empower'],
    relatedMoods: ['high_performance', 'communication', 'entrepreneurship', 'career_growth', 'self_growth'],
    aiRules: 'Books on managing teams, leadership principles, organizational behavior, influence, and executive effectiveness.'
  },
  {
    id: 'resilience',
    label: 'Resilience',
    emoji: '⚔️',
    description: 'Mental toughness and perseverance',
    color: 'lime',
    keywords: ['resilience', 'mental toughness', 'grit', 'perseverance', 'endure', 'overcome', 'adversity', 'strength', 'courage', 'survive', 'fortitude'],
    relatedMoods: ['high_performance', 'self_growth', 'existential', 'meditative', 'inspiring'],
    aiRules: 'Books about mental toughness, grit, overcoming adversity, perseverance through challenges, and developing inner strength.'
  },
  {
    id: 'creativity',
    label: 'Creativity',
    emoji: '🎨',
    description: 'Innovation and creative thinking',
    color: 'fuchsia',
    keywords: ['creativity', 'creative', 'innovation', 'imagination', 'design', 'art', 'invent', 'original', 'novel', 'inspiration', 'brainstorm'],
    relatedMoods: ['future_ai', 'entrepreneurship', 'visionary', 'curious', 'communication'],
    aiRules: 'Books on creative thinking, innovation processes, design thinking, artistic expression, and generating novel ideas.'
  },
  {
    id: 'human_nature',
    label: 'Human Nature',
    emoji: '💕',
    description: 'Relationships, emotions, behavior',
    color: 'stone',
    keywords: ['relationship', 'human nature', 'social', 'connection', 'empathy', 'understand people', 'humanity', 'behavior', 'psychology', 'tribe'],
    relatedMoods: ['emotional', 'psychology', 'existential', 'communication', 'meditative'],
    aiRules: 'Books about relationships, social dynamics, human behavior, empathy, emotional intelligence, and understanding people.'
  },
  {
    id: 'existential',
    label: 'Existential',
    emoji: '🌌',
    description: 'Purpose, meaning and identity',
    color: 'slate',
    keywords: ['meaning', 'purpose', 'identity', 'mortality', 'existence', 'philosophy', 'life', 'death', 'universe', 'consciousness', 'transcend'],
    relatedMoods: ['thought_provoking', 'meditative', 'human_nature', 'visionary', 'dark'],
    aiRules: 'Books exploring life\'s meaning, purpose, identity, mortality, consciousness, philosophy, and deep existential questions.'
  },
  {
    id: 'visionary',
    label: 'Visionary',
    emoji: '🔮',
    description: 'Big future-changing ideas',
    color: 'white',
    keywords: ['vision', 'big idea', 'change', 'transformation', 'breakthrough', 'radical', 'paradigm', 'possibility', 'imagine', 'foresight'],
    relatedMoods: ['future_ai', 'creativity', 'existential', 'inspiring', 'thought_provoking'],
    aiRules: 'Books presenting bold, future-shaping ideas, paradigm shifts, transformative visions, and revolutionary concepts.'
  },
  {
    id: 'communication',
    label: 'Communication',
    emoji: '💬',
    description: 'Persuasion, negotiation and social skills',
    color: 'neutral',
    keywords: ['communicate', 'persuade', 'negotiate', 'speak', 'conversation', 'listening', 'rhetoric', 'argument', 'influence', 'talk', 'present', 'write'],
    relatedMoods: ['leadership', 'human_nature', 'entrepreneurship', 'career_growth', 'creativity'],
    aiRules: 'Books about persuasion, negotiation, public speaking, effective writing, conversation skills, and interpersonal communication.'
  },
  {
    id: 'entrepreneurship',
    label: 'Entrepreneurship',
    emoji: '🔥',
    description: 'Startups, innovation and business building',
    color: 'gray',
    keywords: ['startup', 'entrepreneur', 'business', 'venture', 'scale', 'disrupt', 'innovate', 'build', 'product', 'market', 'grow', 'launch', 'founder'],
    relatedMoods: ['high_performance', 'leadership', 'creativity', 'money_wealth', 'future_ai', 'career_growth'],
    aiRules: 'Books about starting and scaling businesses, innovation, product development, go-to-market strategy, and company building.'
  },
  {
    id: 'career_growth',
    label: 'Career Growth',
    emoji: '💼',
    description: 'Professional success and advancement',
    color: 'zinc',
    keywords: ['career', 'professional', 'advance', 'promotion', 'job', 'skill', 'develop', 'network', 'success', 'work', 'ambition'],
    relatedMoods: ['high_performance', 'self_growth', 'leadership', 'communication', 'entrepreneurship', 'money_wealth'],
    aiRules: 'Books about professional development, career advancement, skill building, networking, job success, and workplace effectiveness.'
  },
];

export const MOOD_COLORS: Record<string, string> = {
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  sky: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  lime: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  stone: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  zinc: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  neutral: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  white: 'bg-white/10 text-white border-white/20',
};

export const MOOD_SCORE_THRESHOLD = 70;

export function analyzeMoodsFromText(text: string): ScoredMood[] {
  const lower = text.toLowerCase();
  const results: ScoredMood[] = MOODS.map(mood => {
    const count = mood.keywords.reduce((sum, kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lower.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);
    return { mood: mood.id, score: count };
  });

  const maxScore = Math.max(...results.map(r => r.score), 1);
  return results
    .map(r => ({ ...r, score: Math.round((r.score / maxScore) * 100) }))
    .filter(r => r.score > MOOD_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

export function getTopMoods(text: string, limit = 3): MoodId[] {
  return analyzeMoodsFromText(text).slice(0, limit).map(r => r.mood);
}

export function normalizeMoods(moods: unknown): ScoredMood[] {
  if (!Array.isArray(moods)) return [];
  if (moods.length === 0) return [];
  if (typeof moods[0] === 'string') {
    const validIds = new Set(MOODS.map(m => m.id));
    return (moods as string[])
      .filter(m => validIds.has(m as MoodId))
      .map(m => ({ mood: m as MoodId, score: 100 }));
  }
  const validIds = new Set(MOODS.map(m => m.id));
  return (moods as ScoredMood[])
    .filter(m => m && validIds.has(m.mood) && m.score > MOOD_SCORE_THRESHOLD);
}

export function getMoodById(id: MoodId): Mood | undefined {
  return MOODS.find(m => m.id === id);
}

export function getRelatedMoodsFor(moodId: MoodId): Mood[] {
  const mood = getMoodById(moodId);
  if (!mood) return [];
  return mood.relatedMoods
    .map(id => getMoodById(id))
    .filter((m): m is Mood => m !== undefined);
}
