import type { NormalizedSeedBook } from './types';
import { fromOpenLibrary } from './normalizer';

const BASE = 'https://openlibrary.org/search.json';

const QUERIES = [
  'programming',
  'business',
  'psychology',
  'self development',
  'AI',
  'finance',
];

export async function fetchOpenLibrarySeed(): Promise<NormalizedSeedBook[]> {
  const all: NormalizedSeedBook[] = [];

  for (const query of QUERIES) {
    for (let page = 1; page <= 5; page++) {
      try {
        const url = `${BASE}?q=${encodeURIComponent(query)}&limit=100&page=${page}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) break;

        const data = await res.json();
        const docs = data.docs as Record<string, unknown>[] | undefined;
        if (!docs || docs.length === 0) break;

        for (const doc of docs) {
          const book = fromOpenLibrary(doc, query);
          if (book) all.push(book);
        }

        if (docs.length < 100) break;
      } catch {
        break;
      }
    }
  }

  return all;
}
