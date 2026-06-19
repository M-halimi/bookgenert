import { prisma } from '@/lib/prisma';

export interface SimilarityResult {
  bookId: string;
  title: string;
  slug: string;
  similarity: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(text: string): string[] {
  return normalize(text).split(/\s+/).filter(w => w.length > 2);
}

function getTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${normalize(text)} `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

export function computeTitleFingerprint(title: string): string {
  const trigrams = getTrigrams(title);
  return Array.from(trigrams).sort().join(',');
}

export function computeSimilarity(
  fingerprint1: string,
  fingerprint2: string
): number {
  const set1 = new Set(fingerprint1.split(','));
  const set2 = new Set(fingerprint2.split(','));
  if (set1.size === 0 && set2.size === 0) return 0;
  const arr1 = Array.from(set1);
  const arr2 = Array.from(set2);
  const intersection = new Set(arr1.filter(x => set2.has(x)));
  const union = new Set([...arr1, ...arr2]);
  return intersection.size / union.size;
}

export function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(getWords(text1));
  const words2 = new Set(getWords(text2));
  if (words1.size === 0 && words2.size === 0) return 0;
  const w1Arr = Array.from(words1);
  const w2Arr = Array.from(words2);
  const intersection = new Set(w1Arr.filter(w => words2.has(w)));
  const union = new Set([...w1Arr, ...w2Arr]);
  return intersection.size / union.size;
}

export function cosineSimilarity(text1: string, text2: string): number {
  const words1 = getWords(text1);
  const words2 = getWords(text2);
  const allWords = new Set([...words1, ...words2]);
  const vec1 = Array.from(allWords).map(w => words1.filter(x => x === w).length);
  const vec2 = Array.from(allWords).map(w => words2.filter(x => x === w).length);
  let dot = 0, mag1 = 0, mag2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dot / magnitude;
}

export async function findSimilarBooks(
  title: string,
  threshold: number = 0.85,
  limit: number = 5
): Promise<SimilarityResult[]> {
  try {
    const fingerprint = computeTitleFingerprint(title);
    const embeddings = await prisma.bookEmbedding.findMany({
      include: { book: { select: { id: true, title: true, slug: true } } },
    });

    const results: SimilarityResult[] = embeddings
      .map(e => ({
        bookId: e.bookId,
        title: e.book.title,
        slug: e.book.slug,
        similarity: computeSimilarity(fingerprint, e.titleFingerprint),
      }))
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  } catch {
    return [];
  }
}

export async function findExactOrSimilarBook(title: string): Promise<SimilarityResult | null> {
  const normalized = normalize(title);
  const fingerprint = computeTitleFingerprint(title);

  const embeddings = await prisma.bookEmbedding.findMany({
    include: { book: { select: { id: true, title: true, slug: true } } },
  });

  for (const e of embeddings) {
    const similarity = computeSimilarity(fingerprint, e.titleFingerprint);
    const titleSim = jaccardSimilarity(normalized, normalize(e.book.title));
    if (similarity >= 0.85 || titleSim >= 0.85) {
      return {
        bookId: e.bookId,
        title: e.book.title,
        slug: e.book.slug,
        similarity: Math.max(similarity, titleSim),
      };
    }
  }

  return null;
}

export async function saveBookEmbedding(
  bookId: string,
  title: string,
  keywords?: string[]
): Promise<void> {
  try {
    const fingerprint = computeTitleFingerprint(title);
    const keywordFingerprint = keywords
      ? computeTitleFingerprint(keywords.join(' '))
      : null;
    const searchVector = `${normalize(title)} ${keywords?.join(' ') || ''}`.trim();

    await prisma.bookEmbedding.upsert({
      where: { bookId },
      update: { titleFingerprint: fingerprint, keywordFingerprint, searchVector },
      create: { bookId, titleFingerprint: fingerprint, keywordFingerprint, searchVector },
    });
  } catch {
    // non-critical
  }
}
