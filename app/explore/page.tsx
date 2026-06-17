'use client';

import { useEffect, useState } from 'react';
import FilterChips from '@/components/library/FilterChips';
import BookCard from '@/components/library/BookCard';
import { fetchPopularBooks } from '@/lib/openlibrary';

interface LibraryBook {
  slug: string;
  title: string;
  author: string;
  category: string;
  tagline: string;
  coverUrl: string | null;
}

export default function ExplorePage() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const saved: LibraryBook[] = (() => {
        try {
          const raw = localStorage.getItem('bookflix_library');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();

      try {
        const popular = await fetchPopularBooks();
        const popularBooks: LibraryBook[] = popular.map((b) => ({
          slug: b.id,
          title: b.title,
          author: b.author,
          category: b.category,
          tagline: '',
          coverUrl: b.coverUrl,
        }));
        const savedSlugs = new Set(saved.map((b) => b.slug));
        const merged = [
          ...saved,
          ...popularBooks.filter((b) => !savedSlugs.has(b.slug)),
        ];
        setBooks(merged);
      } catch {
        setBooks(saved);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    activeCategory === 'All'
      ? books
      : books.filter(
          (b) =>
            b.category?.toLowerCase().trim() === activeCategory.toLowerCase()
        );

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Explore</h1>
        <p className="text-zinc-400 mb-8">Discover books by category</p>

        <FilterChips
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Loading books...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg mb-2">
              No books in this category
            </p>
            <p className="text-zinc-600">
              Try selecting a different category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtered.map((book) => (
              <BookCard key={book.slug} {...book} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
