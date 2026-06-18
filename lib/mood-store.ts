import { MOODS, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from './moods';
import { classifyByMetadata, classifyByContent, ensureMinimumBooks, type BookMetadata } from './mood-classifier';
import { computeSeedMapping } from './mood-seed';

const STORAGE_KEY = 'bookflix_mood_store';

export interface MoodStoreEntry {
  mood: MoodId;
  slug: string;
  title: string;
  score: number;
  source: 'seed' | 'ai' | 'semantic' | 'keyword' | 'backfill';
  updatedAt: number;
}

export interface MoodStore {
  version: number;
  entries: MoodStoreEntry[];
  updatedAt: number;
}

function emptyStore(): MoodStore {
  return { version: 2, entries: [], updatedAt: Date.now() };
}

function getStore(): MoodStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const store = JSON.parse(raw) as MoodStore;
      if (store.version === 2) return store;
    }
  } catch {}
  return emptyStore();
}

function saveStore(store: MoodStore): void {
  if (typeof window === 'undefined') return;
  store.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function getBooksByMood(moodId: MoodId): MoodStoreEntry[] {
  return getStore().entries
    .filter(e => e.mood === moodId && e.score >= MOOD_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

export function getMoodsForBook(slug: string): ScoredMood[] {
  return getStore().entries
    .filter(e => e.slug === slug && e.score >= MOOD_SCORE_THRESHOLD)
    .map(e => ({ mood: e.mood, score: e.score }));
}

export function getMoodCounts(): Record<MoodId, number> {
  const store = getStore();
  const counts: Record<string, number> = {};
  for (const mood of MOODS) {
    counts[mood.id] = 0;
  }
  const seen = new Set<string>();
  for (const entry of store.entries) {
    if (entry.score >= MOOD_SCORE_THRESHOLD) {
      const key = `${entry.mood}:${entry.slug}`;
      if (!seen.has(key)) {
        counts[entry.mood] = (counts[entry.mood] || 0) + 1;
        seen.add(key);
      }
    }
  }
  return counts as Record<MoodId, number>;
}

export function assignMoods(
  slug: string,
  title: string,
  moods: ScoredMood[],
  source: MoodStoreEntry['source']
): void {
  const store = getStore();
  store.entries = store.entries.filter(e => e.slug !== slug);
  for (const sm of moods) {
    if (sm.score >= MOOD_SCORE_THRESHOLD) {
      store.entries.push({
        mood: sm.mood,
        slug,
        title,
        score: sm.score,
        source,
        updatedAt: Date.now(),
      });
    }
  }
  saveStore(store);
}

export function classifyBook(
  slug: string,
  title: string,
  metadata?: BookMetadata,
  episodeContents?: string[]
): ScoredMood[] {
  const seedMap = computeSeedMapping();
  if (seedMap[slug]) {
    assignMoods(slug, title, seedMap[slug].moods, 'seed');
    return seedMap[slug].moods;
  }

  if (metadata) {
    const result = classifyByContent(metadata, episodeContents);
    const moods = result.moods.length > 0 ? result.moods : smartFallback(title, metadata.category);
    assignMoods(slug, title, moods, result.source);
    return moods;
  }

  const fallback = smartFallback(title);
  assignMoods(slug, title, fallback, 'keyword');
  return fallback;
}

function smartFallback(title: string, category?: string): ScoredMood[] {
  return classifyByMetadata({ title, category }).filter(m => m.score >= MOOD_SCORE_THRESHOLD);
}

function ensureSeedInjected(): void {
  const store = getStore();
  const existingSlugs = new Set(store.entries.map(e => e.slug));
  const seedMap = computeSeedMapping();

  let changed = false;
  for (const [slug, entry] of Object.entries(seedMap)) {
    if (existingSlugs.has(slug)) continue;
    for (const sm of entry.moods) {
      if (sm.score >= MOOD_SCORE_THRESHOLD) {
        store.entries.push({
          mood: sm.mood,
          slug,
          title: entry.title,
          score: sm.score,
          source: 'seed',
          updatedAt: Date.now(),
        });
        changed = true;
      }
    }
    existingSlugs.add(slug);
  }

  if (changed) saveStore(store);
}

export function backfillFromLibrary(libraryBooks: { slug: string; title: string; author?: string; category?: string }[]): Record<MoodId, number> {
  ensureSeedInjected();

  const store = getStore();
  const seedMap = computeSeedMapping();

  const processed = new Set<string>();
  for (const entry of store.entries) {
    processed.add(entry.slug);
  }

  for (const book of libraryBooks) {
    if (processed.has(book.slug)) continue;

    if (seedMap[book.slug]) {
      const entry = seedMap[book.slug];
      assignMoods(book.slug, book.title, entry.moods, 'seed');
    } else {
      const moods = classifyByMetadata({ title: book.title, author: book.author, category: book.category });
      const valid = moods.filter(m => m.score >= MOOD_SCORE_THRESHOLD);
      if (valid.length > 0) {
        assignMoods(book.slug, book.title, valid, 'semantic');
      }
    }
    processed.add(book.slug);
  }

  saveStore(store);

  const classified: Record<string, { title: string; moods: ScoredMood[] }> = {};
  const allEntries = getStore().entries;
  for (const entry of allEntries) {
    if (!classified[entry.slug]) {
      classified[entry.slug] = { title: entry.title, moods: [] };
    }
    if (!classified[entry.slug].moods.some(m => m.mood === entry.mood)) {
      classified[entry.slug].moods.push({ mood: entry.mood, score: entry.score });
    }
  }

  const current = {} as Record<MoodId, ScoredMood[]>;
  for (const mood of MOODS) {
    current[mood.id] = getBooksByMood(mood.id).slice(0, 100);
  }

  const expanded = ensureMinimumBooks(current, classified, 20);

  for (const mood of MOODS) {
    const books = expanded[mood.id] as (ScoredMood & { slug?: string; title?: string })[];
    for (const book of books) {
      if (!book.slug) continue;
      const exists = store.entries.some(e => e.slug === book.slug && e.mood === mood.id);
      if (!exists) {
        store.entries.push({
          mood: mood.id,
          slug: book.slug,
          title: book.title || classified[book.slug]?.title || book.slug,
          score: book.score,
          source: 'backfill',
          updatedAt: Date.now(),
        });
      }
    }
  }

  saveStore(store);
  return getMoodCounts();
}

export function isBackfillNeeded(): boolean {
  const counts = getMoodCounts();
  return MOODS.some(mood => (counts[mood.id] || 0) < 20);
}

export function getBookSlugsByMood(moodId: MoodId): string[] {
  return getBooksByMood(moodId).map(e => e.slug);
}

export function getAllClassifiedSlugs(): Set<string> {
  return new Set(getStore().entries.map(e => e.slug));
}
