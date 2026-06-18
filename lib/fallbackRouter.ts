import { getApiManager } from './api-manager';

export interface BookInput {
  id?: string;
  title: string;
  author: string;
  coverUrl?: string | null;
  publishYear?: number | null;
  description?: string;
  category?: string;
  language?: string;
  source: string;
}

export interface EnrichedBook {
  id: string;
  title: string;
  titleAr?: string;
  titleFr?: string;
  titleEn?: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  similarBooks?: { title: string; author: string }[];
}

interface EnrichedBookData {
  title: { original?: string; ar?: string; en?: string; fr?: string };
  author?: string;
  category?: string;
  description?: string;
  similar_books?: string[];
}

export interface EnrichmentResult {
  books: EnrichedBook[];
}

function buildPrompt(query: string, books: BookInput[]): { system: string; user: string } {
  const booksInput = books
    .map(
      (b, i) =>
        `${i + 1}. Title: "${b.title}" | Author: ${b.author} | Year: ${b.publishYear || 'N/A'} | Lang: ${b.language || 'en'} | Source: ${b.source}`
    )
    .join('\n');

  return {
    system:
      'You enrich book metadata. Return ONLY valid JSON. Do not invent new books.',
    user: `Given the user query "${query}" and the following TOP ${books.length} books from external APIs:

${booksInput}

For EACH book, enrich with:
- Multilingual titles: Arabic (ar), English (en), French (fr) — keep original if already matches
- A short 1-sentence description
- Category from: Mindset, Business, Tech, Science, History, Philosophy, Literature, Self-Help, Fiction
- 2-3 similar book titles (names only, comma separated)

Return STRICT JSON:
{
  "enriched_books": [
    {
      "title": { "original": "original title", "ar": "...", "en": "...", "fr": "..." },
      "author": "Author Name",
      "category": "Self-Help",
      "description": "Short description",
      "similar_books": ["Book 1", "Book 2", "Book 3"]
    }
  ]
}
Only enrich the provided books. Do NOT add new books. Do NOT return markdown.`,
  };
}

function parseEnriched(raw: string): EnrichedBookData[] | null {
  let cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.enriched_books && Array.isArray(parsed.enriched_books)) {
      return parsed.enriched_books;
    }
  } catch {
    return null;
  }
  return null;
}

function mergeEnrichment(books: BookInput[], enriched: EnrichedBookData[]): EnrichedBook[] {
  return books.map((book, i) => {
    const ai = enriched[i];
    if (!ai) {
      return {
        id: book.id || '',
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl ?? null,
        publishYear: book.publishYear ?? null,
      };
    }

    const similarBooks = (ai.similar_books || []).map((s) => ({
      title: s,
      author: book.author,
    }));

    return {
      id: book.id || '',
      title: ai.title?.en || ai.title?.original || book.title,
      ...(ai.title?.ar ? { titleAr: ai.title.ar } : {}),
      ...(ai.title?.fr ? { titleFr: ai.title.fr } : {}),
      ...(ai.title?.en ? { titleEn: ai.title.en } : {}),
      author: ai.author || book.author,
      coverUrl: book.coverUrl ?? null,
      publishYear: book.publishYear ?? null,
      description: ai.description || book.description || undefined,
      category: ai.category || book.category || undefined,
      similarBooks: similarBooks.length > 0 ? similarBooks : undefined,
    };
  });
}

export async function enrichBooks(
  query: string,
  books: BookInput[]
): Promise<EnrichmentResult> {
  const top10 = books.slice(0, 10);
  const { system, user } = buildPrompt(query, top10);

  const api = getApiManager();

  try {
    const result = await api.complete({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: 2048,
      temperature: 0.2,
    });

    const parsed = parseEnriched(result.content);
    if (parsed) {
      return { books: mergeEnrichment(top10, parsed) };
    }
  } catch {
    // Fall through to unenriched
  }

  return {
    books: top10.map((b) => ({
      id: b.id || '',
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl ?? null,
      publishYear: b.publishYear ?? null,
    })),
  };
}
