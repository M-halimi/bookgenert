export interface GoogleBookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  language?: string;
  source: 'googlebooks';
}

const BASE = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  try {
    const params = new URLSearchParams({ q: query, maxResults: '12', langRestrict: 'en|ar|fr|de' });
    if (API_KEY) params.set('key', API_KEY);

    const res = await fetch(`${BASE}?${params}`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'BookFlix/1.0' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: Record<string, unknown>) => {
      const info = (item.volumeInfo || {}) as Record<string, unknown>;
      const id = (item.id as string) || '';
      const title = (info.title as string) || 'Untitled';
      const authors = (info.authors as string[]) || [];
      const publishedDate = (info.publishedDate as string) || '';
      const rawCategory = (info.categories as string[])?.[0] || '';

      let coverUrl: string | null = null;
      const images = info.imageLinks as Record<string, string> | undefined;
      if (images?.thumbnail) {
        coverUrl = images.thumbnail.replace('http:', 'https:');
        if (coverUrl.includes('&edge=curl')) coverUrl = coverUrl.replace('&edge=curl', '');
      }

      return {
        id: `gb-${id}`,
        title,
        author: authors[0] || 'Unknown Author',
        coverUrl,
        publishYear: publishedDate ? parseInt(publishedDate.slice(0, 4), 10) || null : null,
        description: (info.description as string)?.slice(0, 500) || undefined,
        category: rawCategory || undefined,
        language: (info.language as string) || undefined,
        source: 'googlebooks' as const,
      };
    });
  } catch {
    return [];
  }
}
