import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  isbn?: string[];
}

interface EnhancedBook {
  id: string;
  title: string;
  titleAr?: string;
  titleFr?: string;
  titleEn?: string;
  titleDe?: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  similarBooks?: { title: string; author: string }[];
}

async function searchOpenLibrary(query: string): Promise<EnhancedBook[]> {
  const res = await fetch(
    `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=12`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.docs || []).map((book: OpenLibraryBook) => ({
    id: book.key.replace('/works/', ''),
    title: book.title,
    author: book.author_name?.[0] || 'Unknown Author',
    coverUrl: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
      : null,
    publishYear: book.first_publish_year || null,
  }));
}

async function enrichWithAI(query: string, books: EnhancedBook[]): Promise<EnhancedBook[]> {
  const titles = books.map((b, i) => `${i + 1}. "${b.title}" by ${b.author}`).join('\n');

  const prompt = `You are a global BOOK SEARCH ENGINE with access to multilingual book data.

Given the user query "${query}" and the following real book results:
${titles}

For EACH book, provide:
- Translated titles in Arabic (ar), French (fr), English (en), German (de) — keep original if already matches
- A 1-2 sentence description in English
- A category: Mindset, Business, Tech, Science, History, Philosophy, or Literature
- 2 similar books (title + author) in any language

Also suggest 2-3 ADDITIONAL concept-related books if the query is a concept/topic rather than a specific book.

Return STRICT JSON:
{
  "books": [
    {
      "id": "the book id (keep same)",
      "titleAr": "العنوان بالعربية",
      "titleFr": "Titre en français",
      "titleEn": "Title in English or original",
      "titleDe": "Titel auf Deutsch",
      "description": "Brief description",
      "category": "Category",
      "similarBooks": [{ "title": "Similar book", "author": "Author" }]
    }
  ],
  "conceptBooks": [
    {
      "title": { "ar": "", "fr": "", "en": "", "de": "" },
      "author": "Suggested author",
      "description": "Why this book relates"
    }
  ]
}

If no real books were found (empty list), generate 6 realistic concept-related books instead.`;

  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a multilingual book search engine. Return ONLY valid JSON. Always provide results, never say no results.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  const text = result.choices[0]?.message?.content || '';
  let cleaned = text.replace(/```json\s*/i, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
  const enriched = JSON.parse(cleaned);

  const targetLangs = ['titleAr', 'titleFr', 'titleEn', 'titleDe'] as const;
  const langMap: Record<string, string> = {
    titleAr: 'ar',
    titleFr: 'fr',
    titleEn: 'en',
    titleDe: 'de',
  };

  const merged = books.map((book) => {
    const ai = enriched.books?.find((b: Record<string, unknown>) => b.id === book.id);
    if (!ai) return book;

    const multilingualTitles: Record<string, string> = {};
    for (const key of targetLangs) {
      if (ai[key]) multilingualTitles[langMap[key]] = ai[key];
    }

    return {
      ...book,
      ...multilingualTitles,
      description: ai.description || undefined,
      category: ai.category || undefined,
      similarBooks: ai.similarBooks || undefined,
    };
  });

  if (enriched.conceptBooks?.length) {
    for (const cb of enriched.conceptBooks) {
      merged.push({
        id: `concept-${merged.length + 1}`,
        title: cb.title?.en || cb.title?.ar || 'Related Book',
        titleAr: cb.title?.ar,
        titleFr: cb.title?.fr,
        titleEn: cb.title?.en,
        titleDe: cb.title?.de,
        author: cb.author || 'Various',
        coverUrl: null,
        publishYear: null,
        description: cb.description || '',
        category: cb.category || 'General',
      });
    }
  }

  return merged;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const openLibraryBooks = await searchOpenLibrary(query);
    const enhanced = await enrichWithAI(query, openLibraryBooks);

    return NextResponse.json({ books: enhanced });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search books' },
      { status: 500 }
    );
  }
}
