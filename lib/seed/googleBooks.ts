import type { NormalizedSeedBook } from './types';
import { fromGoogleBook } from './normalizer';

const BASE = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

const QUERIES = [
  'programming',
  'business',
  'psychology',
  'self development',
  'artificial intelligence',
  'finance',
];

export async function fetchGoogleBooksSeed(): Promise<NormalizedSeedBook[]> {
  const all: NormalizedSeedBook[] = [];

  for (const query of QUERIES) {
    for (let startIndex = 0; startIndex < 80; startIndex += 40) {
      try {
        const params = new URLSearchParams({
          q: query,
          maxResults: '40',
          startIndex: String(startIndex),
        });
        if (API_KEY) params.set('key', API_KEY);

        const res = await fetch(`${BASE}?${params}`, {
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          if (res.status === 429) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          break;
        }

        const data = await res.json();
        if (!data.items || !Array.isArray(data.items)) break;

        for (const item of data.items) {
          const book = fromGoogleBook(item, query);
          if (book) all.push(book);
        }

        if (data.items.length < 40) break;
      } catch {
        break;
      }
    }
  }

  return all;
}
