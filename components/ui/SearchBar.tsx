'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils';

interface SearchBook {
  id: string;
  title: string;
  titleAr?: string;
  titleFr?: string;
  titleEn?: string;
  titleDe?: string;
  author: string;
  coverUrl: string | null;
  publishYear?: number | null;
  description?: string;
  category?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchBook[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.books || []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (book: SearchBook) => {
    setIsOpen(false);
    setQuery('');
    const slug = slugify(book.title);
    const params = new URLSearchParams({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.coverUrl || '',
    });
    router.push(`/book/${slug}?${params}`);
  };

  const displayTitle = (book: SearchBook): string => {
    return book.titleAr || book.titleFr || book.titleEn || book.title;
  };

  const displayLang = (book: SearchBook): string => {
    if (book.titleAr) return 'ar';
    if (book.titleFr) return 'fr';
    if (book.titleDe) return 'de';
    return 'en';
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a book or topic..."
          className="w-full px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:border-red-600 text-lg"
        />
        {loading && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-50 max-h-96 overflow-y-auto">
          {results.map((book) => {
            const lang = displayLang(book);
            return (
              <button
                key={book.id}
                onClick={() => handleSelect(book)}
                className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800 transition-colors text-left"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt=""
                    className="w-10 h-14 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 bg-zinc-700 rounded flex items-center justify-center text-zinc-500 text-xs flex-shrink-0">
                    No cover
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">
                    {displayTitle(book)}
                  </p>
                  <p className="text-zinc-400 text-sm truncate">{book.author}</p>
                  {book.description && (
                    <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">
                      {book.description}
                    </p>
                  )}
                  {book.category && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">
                      {book.category}
                    </span>
                  )}
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0 self-start mt-1">
                  {lang === 'ar' ? 'AR' : lang === 'fr' ? 'FR' : lang === 'de' ? 'DE' : 'EN'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
