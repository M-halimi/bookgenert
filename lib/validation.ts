import type { BookEpisodes, LangCode, RichChapter } from './groq';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChapterFix {
  index: number;
  field: string;
  reason: string;
}

const EXPECTED_CHAPTERS = 10;
const MIN_WORDS_PER_CONTENT = 150;
const MIN_PARAGRAPHS = 2;
const TARGET_LANGS: LangCode[] = ['ar', 'fr', 'en'];

const CONTENT_FIELDS: (keyof RichChapter)[] = [
  'title', 'hook', 'content', 'keyTakeaway', 'keyIdeas',
  'actionableTips', 'importantQuotes', 'practicalExamples', 'cliffhanger', 'summary',
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 20).length;
}

function hasEmptyMultilingual(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return true;
  const mt = obj as Record<string, unknown>;
  for (const lang of TARGET_LANGS) {
    const val = mt[lang];
    if (!val || (typeof val === 'string' && val.trim().length === 0)) return true;
  }
  return false;
}

export function validateChapter(chapter: RichChapter, chapterIndex: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof chapter.number !== 'number' || chapter.number < 1) {
    errors.push(`Chapter ${chapterIndex + 1}: missing or invalid chapter number`);
  }

  for (const field of CONTENT_FIELDS) {
    const value = chapter[field];
    if (!value || hasEmptyMultilingual(value)) {
      errors.push(`Chapter ${chapterIndex + 1}: field "${field}" is empty or missing`);
      continue;
    }
  }

  const content = chapter.content;
  if (content && typeof content === 'object') {
    for (const lang of TARGET_LANGS) {
      const text = (content as unknown as Record<string, string>)[lang];
      if (text) {
        const wc = countWords(text);
        if (wc < MIN_WORDS_PER_CONTENT) {
          errors.push(`Chapter ${chapterIndex + 1}: content[${lang}] has only ${wc} words (min ${MIN_WORDS_PER_CONTENT})`);
        }
        const pc = countParagraphs(text);
        if (pc < MIN_PARAGRAPHS) {
          warnings.push(`Chapter ${chapterIndex + 1}: content[${lang}] has only ${pc} paragraphs (recommend ${MIN_PARAGRAPHS}+)`);
        }
      } else {
        errors.push(`Chapter ${chapterIndex + 1}: content[${lang}] is missing`);
      }
    }
  }

  const wc = chapter.wordCount;
  if (typeof wc !== 'number' || wc < MIN_WORDS_PER_CONTENT) {
    warnings.push(`Chapter ${chapterIndex + 1}: wordCount is ${wc ?? 'missing'} (expected >= ${MIN_WORDS_PER_CONTENT})`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBook(book: BookEpisodes): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!book.episodes || !Array.isArray(book.episodes)) {
    errors.push('Book has no episodes array');
    return { valid: false, errors, warnings };
  }

  if (book.episodes.length !== EXPECTED_CHAPTERS) {
    errors.push(`Book has ${book.episodes.length} chapters (expected ${EXPECTED_CHAPTERS})`);
  }

  for (let i = 0; i < book.episodes.length; i++) {
    const result = validateChapter(book.episodes[i], i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const topFields: (keyof BookEpisodes)[] = [
    'title', 'author', 'category', 'tagline', 'description',
    'finalSummary', 'mainConcepts',
  ];
  for (const field of topFields) {
    const val = book[field];
    if (!val || (typeof val === 'object' && hasEmptyMultilingual(val))) {
      if (field === 'author' || field === 'category') {
        errors.push(`Top-level field "${field}" is empty or missing`);
      } else {
        warnings.push(`Top-level field "${field}" is empty or missing`);
      }
    }
  }

  if (!book.keyLessons || !Array.isArray(book.keyLessons) || book.keyLessons.length < 3) {
    warnings.push(`keyLessons has ${book.keyLessons?.length ?? 0} entries (expected >= 3)`);
  }
  if (!book.keyInsights || !Array.isArray(book.keyInsights) || book.keyInsights.length < 2) {
    warnings.push(`keyInsights has ${book.keyInsights?.length ?? 0} entries (expected >= 2)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function needsRegeneration(book: BookEpisodes): ChapterFix[] {
  const fixes: ChapterFix[] = [];

  if (!book.episodes || !Array.isArray(book.episodes)) {
    return [{ index: -1, field: 'episodes', reason: 'Entire episodes array missing' }];
  }

  if (book.episodes.length !== EXPECTED_CHAPTERS) {
    fixes.push({ index: -1, field: 'episodes', reason: `Expected ${EXPECTED_CHAPTERS} chapters, got ${book.episodes.length}` });
  }

  for (let i = 0; i < Math.max(book.episodes.length, EXPECTED_CHAPTERS); i++) {
    if (i >= book.episodes.length) {
      fixes.push({ index: i, field: 'entire', reason: `Chapter ${i + 1} is missing entirely` });
      continue;
    }
    const ch = book.episodes[i];
    for (const field of ['content', 'title', 'hook'] as const) {
      const val = ch[field];
      if (!val || hasEmptyMultilingual(val)) {
        fixes.push({ index: i, field, reason: `Chapter ${i + 1}: "${field}" is empty` });
      }
    }
  }

  return fixes;
}

export function normalizeChapter(chapter: Partial<RichChapter>, chapterNumber: number): RichChapter {
  const emptyMt = (): { ar: string; fr: string; en: string } => ({ ar: '', fr: '', en: '' });

  const ch: RichChapter = {
    number: chapterNumber,
    title: chapter.title as RichChapter['title'] || emptyMt(),
    hook: chapter.hook as RichChapter['hook'] || emptyMt(),
    content: chapter.content as RichChapter['content'] || emptyMt(),
    keyTakeaway: chapter.keyTakeaway as RichChapter['keyTakeaway'] || emptyMt(),
    keyIdeas: chapter.keyIdeas as RichChapter['keyIdeas'] || emptyMt(),
    actionableTips: chapter.actionableTips as RichChapter['actionableTips'] || emptyMt(),
    importantQuotes: chapter.importantQuotes as RichChapter['importantQuotes'] || emptyMt(),
    practicalExamples: chapter.practicalExamples as RichChapter['practicalExamples'] || emptyMt(),
    cliffhanger: chapter.cliffhanger as RichChapter['cliffhanger'] || emptyMt(),
    summary: chapter.summary as RichChapter['summary'] || emptyMt(),
    wordCount: chapter.wordCount || 0,
  };

  return ch;
}

export function ensureChapterCount(book: BookEpisodes): BookEpisodes {
  const episodes = [...(book.episodes || [])];

  while (episodes.length < EXPECTED_CHAPTERS) {
    const idx = episodes.length + 1;
    episodes.push({
      number: idx,
      title: { ar: '', fr: '', en: '' },
      hook: { ar: '', fr: '', en: '' },
      content: { ar: '', fr: '', en: '' },
      keyIdeas: { ar: '', fr: '', en: '' },
      actionableTips: { ar: '', fr: '', en: '' },
      importantQuotes: { ar: '', fr: '', en: '' },
      practicalExamples: { ar: '', fr: '', en: '' },
      keyTakeaway: { ar: '', fr: '', en: '' },
      cliffhanger: { ar: '', fr: '', en: '' },
      summary: { ar: '', fr: '', en: '' },
      wordCount: 0,
    });
  }

  while (episodes.length > EXPECTED_CHAPTERS) {
    episodes.pop();
  }

  return { ...book, episodes: episodes.map((ep, i) => ({ ...ep, number: i + 1 })) };
}

export interface GenerationAttempt {
  attempt: number;
  success: boolean;
  error?: string;
  validationErrors?: string[];
}

export interface ValidatedGenerationResult {
  book: BookEpisodes;
  provider: string;
  model: string;
  latencyMs: number;
  attempts: GenerationAttempt[];
  usedFallback: boolean;
}
