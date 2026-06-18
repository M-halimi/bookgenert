import type { NormalizedSeedBook } from './types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dedupId(title: string, author: string): string {
  return `${slugify(title)}-${slugify(author)}`;
}

function normalizeTitle(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function normalizeAuthor(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function fromGoogleBook(
  item: Record<string, unknown>,
  query: string
): NormalizedSeedBook | null {
  try {
    const info = (item.volumeInfo || {}) as Record<string, unknown>;
    const title = normalizeTitle((info.title as string) || '');
    if (!title) return null;

    const authors = (info.authors as string[]) || [];
    const author = normalizeAuthor(authors[0] || 'Unknown Author');
    const id = dedupId(title, author);

    const identifiers = info.industryIdentifiers as Array<Record<string, string>> | undefined;
    const isbn = identifiers?.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier;

    let coverUrl: string | null = null;
    const images = info.imageLinks as Record<string, string> | undefined;
    if (images?.thumbnail) {
      coverUrl = images.thumbnail.replace('http:', 'https:').replace('&edge=curl', '');
    } else if (isbn) {
      coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    }

    const publishedDate = (info.publishedDate as string) || '';
    const rawCategories = (info.categories as string[]) || [];

    return {
      id,
      title,
      author,
      description: (info.description as string)?.slice(0, 1000) || '',
      coverUrl,
      publishYear: publishedDate ? parseInt(publishedDate.slice(0, 4), 10) || null : null,
      category: rawCategories[0] || query,
      pageCount: (info.pageCount as number) || null,
      language: (info.language as string) || 'en',
      source: 'googlebooks',
      rawQuery: query,
    };
  } catch {
    return null;
  }
}

export function fromOpenLibrary(
  doc: Record<string, unknown>,
  query: string
): NormalizedSeedBook | null {
  try {
    const title = normalizeTitle((doc.title as string) || '');
    if (!title) return null;

    const authorNames = (doc.author_name as string[]) || [];
    const author = normalizeAuthor(authorNames[0] || 'Unknown Author');
    const id = dedupId(title, author);

    const coverId = doc.cover_i as number | undefined;
    const olid = doc.cover_edition_key as string | undefined;
    const isbnArr = doc.isbn as string[] | undefined;

    let coverUrl: string | null = null;
    if (coverId) {
      coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    } else if (olid) {
      coverUrl = `https://covers.openlibrary.org/b/olid/${olid}-L.jpg`;
    } else if (isbnArr?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/isbn/${isbnArr[0]}-L.jpg`;
    }

    const subjects = (doc.subject as string[]) || [];
    const subjectMatch = subjects.find(s =>
      ['programming', 'business', 'psychology', 'self-help', 'self help', 'artificial intelligence', 'finance', 'technology', 'computer science', 'economics'].includes(s.toLowerCase())
    );

    return {
      id,
      title,
      author,
      description: (doc.description as string) || (doc.first_sentence as string) || '',
      coverUrl,
      publishYear: (doc.first_publish_year as number) || null,
      category: subjectMatch || query,
      pageCount: (doc.number_of_pages_median as number) || null,
      language: ((doc.language as string[])?.[0]) || 'en',
      source: 'openlibrary',
      rawQuery: query,
    };
  } catch {
    return null;
  }
}

export function dedupBooks(books: NormalizedSeedBook[]): NormalizedSeedBook[] {
  const seen = new Map<string, NormalizedSeedBook>();
  for (const book of books) {
    const existing = seen.get(book.id);
    if (!existing) {
      seen.set(book.id, book);
      continue;
    }
    if (existing.description && !book.description) continue;
    if (book.coverUrl && !existing.coverUrl) {
      seen.set(book.id, { ...existing, coverUrl: book.coverUrl });
    }
  }
  return Array.from(seen.values());
}
