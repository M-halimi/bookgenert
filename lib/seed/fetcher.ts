import type { NormalizedSeedBook, SeedResult } from './types';
import { fetchGoogleBooksSeed } from './googleBooks';
import { fetchOpenLibrarySeed } from './openLibrary';
import { dedupBooks } from './normalizer';

interface FetchOptions {
  sources?: ('googlebooks' | 'openlibrary')[];
}

const DEFAULT_QUERIES = [
  'programming',
  'business',
  'psychology',
  'self development',
  'artificial intelligence',
  'finance',
];

export async function fetchSeedBooks(options: FetchOptions = {}): Promise<SeedResult> {
  const { sources = ['googlebooks', 'openlibrary'] } = options;

  const all: NormalizedSeedBook[] = [];
  let googleCount = 0;
  let openLibraryCount = 0;

  if (sources.includes('googlebooks')) {
    const books = await fetchGoogleBooksSeed();
    googleCount = books.length;
    all.push(...books);
  }

  if (sources.includes('openlibrary')) {
    const books = await fetchOpenLibrarySeed();
    openLibraryCount = books.length;
    all.push(...books);
  }

  const beforeDedup = all.length;
  const books = dedupBooks(all);
  const duplicatesRemoved = beforeDedup - books.length;

  return {
    total: books.length,
    googleBooks: googleCount,
    openLibrary: openLibraryCount,
    duplicatesRemoved,
    queries: DEFAULT_QUERIES,
    books,
  };
}
