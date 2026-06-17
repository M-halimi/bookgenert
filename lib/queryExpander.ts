export interface ExpandedQuery {
  original_query: string;
  intent: 'book_title' | 'author' | 'topic' | 'concept';
  confidence: 'low' | 'medium' | 'high';
  expanded_queries: string[];
  language_variants: string[];
  search_strategy: {
    title_based: string;
    author_based: string;
    topic_based: string;
    semantic_based: string[];
  };
}

const ARABIC_PREFIXES = ['كتاب', 'كتاب ', 'رواية ', 'قصة ', 'نظرية '];
const FRENCH_WORDS = ['livre', 'habitude', 'psychologie', 'atomic'];
const GERMAN_WORDS = ['buch', 'gewohnheit', 'psychologie'];

const COMMON_BOOK_TRANSLATIONS: Record<string, { ar: string; fr: string; de: string }> = {
  'atomic habits': { ar: 'العادات الذرية', fr: 'Habitudes Atomiques', de: 'Die 1% Methode' },
  'deep work': { ar: 'العمل العميق', fr: 'Travail Profond', de: 'Konzentrierter Arbeiten' },
  'sapiens': { ar: 'العاقل', fr: 'Sapiens', de: 'Sapiens' },
  'think and grow rich': { ar: 'فكر وازدد ثراءً', fr: 'Réfléchissez et Devenez Riche', de: 'Denke nach und werde reich' },
  'the power of habit': { ar: 'قوة العادات', fr: 'Le Pouvoir des Habitudes', de: 'Die Macht der Gewohnheit' },
  'psychology of money': { ar: 'سيكولوجية المال', fr: 'La Psychologie de l\'Argent', de: 'Die Psychologie des Geldes' },
  'rich dad poor dad': { ar: 'الأب الغني والأب الفقير', fr: 'Père Riche Père Pauvre', de: 'Rich Dad Poor Dad' },
  'the alchemist': { ar: 'الخيميائي', fr: 'L\'Alchimiste', de: 'Der Alchemist' },
  'ikigai': { ar: 'إيكيغاي', fr: 'Ikigai', de: 'Ikigai' },
};

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function isFrench(text: string): boolean {
  return FRENCH_WORDS.some(w => text.toLowerCase().includes(w));
}

function isGerman(text: string): boolean {
  return GERMAN_WORDS.some(w => text.toLowerCase().includes(w));
}

function detectIntent(query: string): { intent: ExpandedQuery['intent']; confidence: ExpandedQuery['confidence'] } {
  const lower = query.toLowerCase().trim();

  const authorIndicators = ['by ', 'author ', 'كتب ', 'تأليف '];
  if (authorIndicators.some(i => lower.includes(i))) {
    return { intent: 'author', confidence: 'high' };
  }

  const knownTitles = Object.keys(COMMON_BOOK_TRANSLATIONS);
  if (knownTitles.some(t => lower.includes(t))) {
    return { intent: 'book_title', confidence: 'high' };
  }

  if (lower.length < 15 && !lower.includes(' ')) {
    return { intent: 'book_title', confidence: 'medium' };
  }

  const topicWords = ['habits', 'psychology', 'business', 'success', 'wealth', 'mindset',
    'عادات', 'نفس', 'مال', 'نجاح', 'تطوير', 'فلسفة', 'تاريخ', 'علم'];
  if (topicWords.some(w => lower.includes(w))) {
    return { intent: 'topic', confidence: 'medium' };
  }

  return { intent: 'concept', confidence: 'low' };
}

function extractAuthor(query: string): string | null {
  const byMatch = query.match(/\bby\s+(.+)/i);
  if (byMatch) return byMatch[1].trim();
  return null;
}

function extractTitle(query: string): string {
  const byMatch = query.match(/^(.+?)\s+by\s+/i);
  if (byMatch) return byMatch[1].trim();
  return query.trim();
}

function getLanguageVariants(query: string): string[] {
  const lower = query.toLowerCase().trim();
  const known = COMMON_BOOK_TRANSLATIONS[lower] || COMMON_BOOK_TRANSLATIONS[
    Object.keys(COMMON_BOOK_TRANSLATIONS).find(k => lower.includes(k)) || ''
  ];
  if (known) {
    return [known.ar, known.fr, known.de].filter(Boolean);
  }
  return [];
}

export function expandQuery(query: string): ExpandedQuery {
  const original = query.trim();
  const { intent, confidence } = detectIntent(original);
  const author = extractAuthor(original);
  const title = extractTitle(original);
  const isAr = isArabic(original);
  const langVariants = getLanguageVariants(original);

  const expanded: string[] = [original];

  if (author) {
    expanded.push(author);
  }

  if (title && title !== original) {
    expanded.push(title);
  }

  if (langVariants.length > 0) {
    expanded.push(...langVariants);
  }

  if (isAr) {
    const withoutPrefix = ARABIC_PREFIXES.reduce((q, p) =>
      q.startsWith(p) ? q.slice(p.length).trim() : q, original
    );
    if (withoutPrefix !== original) expanded.push(withoutPrefix);
    expanded.push(`${original} كتاب`);
  } else {
    if (langVariants.length === 0) {
      expanded.push(`${title} book`);
      expanded.push(`${title} author`);
    }
  }

  const semanticLower = original.toLowerCase();
  const topicMap: Record<string, string[]> = {
    'habit': ['atomic habits', 'the power of habit', 'habit formation psychology'],
    'psychology': ['psychology of money', 'thinking fast and slow', 'influence psychology'],
    'business': ['rich dad poor dad', 'the e-myth revisited', 'zero to one'],
    'success': ['think and grow rich', 'the 7 habits', 'awaken the giant within'],
    'wealth': ['psychology of money', 'rich dad poor dad', 'the millionaire next door'],
    'mindset': ['mindset carol dweck', 'atomic habits', 'the growth mindset'],
    'عادات': ['العادات الذرية', 'قوة العادات', 'تكوين العادات'],
    'نفس': ['سيكولوجية المال', 'نظرية فستق', 'قوة العادات'],
    'مال': ['الأب الغني والأب الفقير', 'سيكولوجية المال', 'الغني والفقير'],
    'تطوير': ['العادات الذرية', 'فكر وازدد ثراءً', 'قوة العادات'],
  };

  const semantic: string[] = [];
  for (const [key, suggestions] of Object.entries(topicMap)) {
    if (semanticLower.includes(key)) {
      semantic.push(...suggestions);
    }
  }

  const uniqueExpanded = [...new Set(expanded)].slice(0, 8);
  const uniqueSemantic = [...new Set(semantic)].slice(0, 4);

  const langs: string[] = ['en'];
  if (isAr || langVariants.length > 0) langs.push('ar');
  if (original.match(/[àâçéèêëîïôûùüÿæœ]/i) || isFrench(original)) langs.push('fr');
  if (isGerman(original)) langs.push('de');
  if (!langs.includes('fr') && original.length > 3) langs.push('fr');
  if (!langs.includes('de') && original.length > 3) langs.push('de');

  return {
    original_query: original,
    intent,
    confidence,
    expanded_queries: uniqueExpanded,
    language_variants: [...new Set(langs)],
    search_strategy: {
      title_based: title,
      author_based: author || title,
      topic_based: intent === 'topic' || intent === 'concept' ? title : '',
      semantic_based: uniqueSemantic,
    },
  };
}
