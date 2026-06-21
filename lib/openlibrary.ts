const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  source?: string;
}

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  try {
    const res = await fetch(
      `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=10`,
      { headers: { 'User-Agent': 'BookFlix/1.0' } }
    );
    if (!res.ok) {
      console.error('[OpenLibrary] searchBooks returned', res.status);
      return [];
    }
    const data = await res.json();
    return (data.docs || []).map((book: OpenLibraryBook) => ({
      id: book.key.replace('/works/', ''),
      title: book.title,
      author: book.author_name?.[0] || 'Unknown Author',
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      publishYear: book.first_publish_year || null,
      source: 'openlibrary',
    }));
  } catch (err) {
    console.error('[OpenLibrary] searchBooks failed:', err);
    return [];
  }
}

export async function getBookDetails(workId: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(`${OPEN_LIBRARY_BASE}/works/${workId}.json`, {
      headers: { 'User-Agent': 'BookFlix/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: workId,
      title: data.title,
      author: data.authors?.[0]?.author?.name || 'Unknown Author',
      coverUrl: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
        : null,
    publishYear: data.first_publish_year || null,
    source: 'openlibrary',
    };
  } catch (err) {
    console.error('[OpenLibrary] getBookDetails failed:', err);
    return null;
  }
}

const CATEGORY_SUBJECTS: Record<string, string> = {
  Mindset: 'self-help',
  Business: 'business',
  Tech: 'technology',
  Science: 'science',
  History: 'history',
  Philosophy: 'philosophy',
};

export interface PopularBook {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string | null;
  publishYear: number | null;
}

export async function fetchPopularBooks(): Promise<PopularBook[]> {
  const results: PopularBook[] = [];
  const seen = new Set<string>();
  for (const [category, subject] of Object.entries(CATEGORY_SUBJECTS)) {
    try {
      const res = await fetch(
        `${OPEN_LIBRARY_BASE}/subjects/${subject}.json?limit=5`,
        { headers: { 'User-Agent': 'BookFlix/1.0' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const work of data.works || []) {
        const id = work.key?.replace('/works/', '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        results.push({
          id,
          title: work.title,
          author: work.authors?.[0]?.name || 'Unknown Author',
          category,
          coverUrl: work.cover_id
            ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
            : work.cover_edition_key
              ? `https://covers.openlibrary.org/b/olid/${work.cover_edition_key}-M.jpg`
              : null,
          publishYear: work.first_publish_year || null,
        });
      }
    } catch (err) {
      console.error(`[OpenLibrary] Failed to fetch category "${category}":`, err);
    }
  }
  return results;
}
