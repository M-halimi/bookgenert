export interface NormalizedSeedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  publishYear: number | null;
  category: string;
  pageCount: number | null;
  language: string;
  source: 'googlebooks' | 'openlibrary';
  rawQuery: string;
}

export interface SeedResult {
  total: number;
  googleBooks: number;
  openLibrary: number;
  duplicatesRemoved: number;
  queries: string[];
  books: NormalizedSeedBook[];
}
