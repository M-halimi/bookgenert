export interface ArchiveBookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  publishYear: number | null;
  description?: string;
  category?: string;
  language?: string;
  source: 'archive';
}

const BASE = 'https://archive.org/advancedsearch.php';

export async function searchArchive(query: string): Promise<ArchiveBookResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      output: 'json',
      rows: '12',
      fl: 'identifier,title,creator,description,first_publication_date,language,subject,format,cover',
      sort: 'downloads desc',
    });

    const res = await fetch(`${BASE}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const docs = data?.response?.docs;
    if (!docs || !Array.isArray(docs)) return [];

    return docs.map((doc: Record<string, unknown>) => {
      const id = (doc.identifier as string) || '';
      const creators = (doc.creator as string[]) || [];
      const rawSubjects = (doc.subject as string[]) || [];
      const pubDate = (doc.first_publication_date as string) || '';
      const rawLangs = (doc.language as string[]) || [];

      return {
        id: `ia-${id}`,
        title: (doc.title as string) || 'Untitled',
        author: creators[0] || 'Unknown Author',
        coverUrl: id ? `https://archive.org/services/img/${id}` : null,
        publishYear: pubDate ? parseInt(pubDate.slice(0, 4), 10) || null : null,
        description: (doc.description as string)?.slice(0, 500) || undefined,
        category: rawSubjects[0] || undefined,
        language: rawLangs[0] || undefined,
        source: 'archive' as const,
      };
    });
  } catch {
    return [];
  }
}
