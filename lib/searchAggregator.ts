export interface BookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  language?: string;
  source: string;
  relevance_score: number;
  confidence_score: number;
}

const MAX_SCORE = 15;

function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.9;
  const aWords = aLower.split(/\s+/);
  const bWords = bLower.split(/\s+/);
  const intersection = aWords.filter(w => bWords.indexOf(w) >= 0);
  const unionMap: Record<string, boolean> = {};
  aWords.forEach(w => unionMap[w] = true);
  bWords.forEach(w => unionMap[w] = true);
  return intersection.length / Object.keys(unionMap).length;
}

function isDuplicate(a: BookResult, b: BookResult, threshold = 0.8): boolean {
  const titleSim = similarity(a.title, b.title);
  const authorSim = similarity(a.author, b.author);
  return titleSim >= threshold && authorSim >= 0.5;
}

export interface RawBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  language?: string;
  source: string;
}

function scoreBook(book: RawBook, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerAuthor = book.author.toLowerCase();

  const titleSim = similarity(book.title, query);
  const titleScore = Math.round(titleSim * 5);

  let authorScore = 0;
  if (lowerAuthor.includes(lowerQuery) || lowerQuery.includes(lowerAuthor)) {
    authorScore = 5;
  } else {
    const queryWords = lowerQuery.split(/\s+/);
    const authorWords = lowerAuthor.split(/\s+/);
    const matchCount = queryWords.filter(qw => authorWords.some(aw => aw.includes(qw) || qw.includes(aw))).length;
    authorScore = Math.min(5, Math.round((matchCount / queryWords.length) * 5));
  }

  const coverScore = book.coverUrl ? 2 : 0;
  const descScore = book.description ? 2 : 0;

  return titleScore + authorScore + coverScore + descScore + 1;
}

export function mergeAndRank(
  query: string,
  sources: RawBook[][]
): BookResult[] {
  const all: RawBook[] = sources.flat().filter(b => b.title && b.title !== 'Untitled');

  const seen = new Set<string>();
  const deduped: RawBook[] = [];
  for (const book of all) {
    const key = book.title.toLowerCase().trim();
    const duplicate = deduped.find(existing => isDuplicate(
      { ...existing, relevance_score: 0, confidence_score: 0 },
      { ...book, relevance_score: 0, confidence_score: 0 }
    ));
    if (!duplicate && !seen.has(key)) {
      seen.add(key);
      deduped.push(book);
    } else if (duplicate && !duplicate.description && book.description) {
      Object.assign(duplicate, { description: book.description, category: book.category || duplicate.category });
    }
  }

  const scored: BookResult[] = deduped.map(book => {
    const score = scoreBook(book, query);
    return {
      ...book,
      relevance_score: score,
      confidence_score: Math.round((score / MAX_SCORE) * 100),
    };
  });

  return scored.sort((a, b) => b.confidence_score - a.confidence_score).slice(0, 20);
}
