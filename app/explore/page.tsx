'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FilterChips from '@/components/library/FilterChips';
import MoodSelector from '@/components/library/MoodSelector';
import BookCard from '@/components/library/BookCard';
import { fetchPopularBooks } from '@/lib/openlibrary';
import { MOODS, normalizeMoods, type MoodId, type ScoredMood } from '@/lib/moods';
import { getBooksByMood, backfillFromLibrary, isBackfillNeeded } from '@/lib/mood-store';

interface LibraryBook {
  slug: string;
  title: string;
  author: string;
  category: string;
  tagline: string;
  coverUrl: string | null;
  moods?: ScoredMood[];
}

type BrowseMode = 'categories' | 'moods';

function ExploreContent() {
  const searchParams = useSearchParams();
  const moodParam = searchParams.get('mood') as MoodId | null;
  const initialMood = moodParam && MOODS.some((m) => m.id === moodParam) ? moodParam : null;

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeMood, setActiveMood] = useState<MoodId | null>(initialMood);
  const [browseMode, setBrowseMode] = useState<BrowseMode>(initialMood ? 'moods' : 'categories');
  const [loading, setLoading] = useState(true);
  const [backfilled, setBackfilled] = useState(false);

  useEffect(() => {
    async function load() {
      const saved: LibraryBook[] = (() => {
        try {
          const raw = localStorage.getItem('bookflix_library');
          return raw ? JSON.parse(raw).map((b: LibraryBook) => ({ ...b, moods: normalizeMoods(b.moods) })) : [];
        } catch {
          return [];
        }
      })();

      if (!backfilled && isBackfillNeeded()) {
        backfillFromLibrary(
          saved.map(b => ({ slug: b.slug, title: b.title, author: b.author, category: b.category }))
        );
        setBackfilled(true);
      } else {
        setBackfilled(true);
      }

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
  }, [backfilled]);

  const getMoodBooks = (moodId: MoodId): LibraryBook[] => {
    const storeEntries = getBooksByMood(moodId);
    if (storeEntries.length === 0) return [];

    const result: LibraryBook[] = [];

    for (const entry of storeEntries) {
      const existing = books.find(b => b.slug === entry.slug);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          slug: entry.slug,
          title: entry.title,
          author: '',
          category: '',
          tagline: '',
          coverUrl: null,
          moods: [{ mood: moodId, score: entry.score }],
        });
      }
    }

    return result;
  };

  const filtered =
    browseMode === 'categories'
      ? activeCategory === 'All'
        ? books
        : books.filter(
            (b) =>
              b.category?.toLowerCase().trim() === activeCategory.toLowerCase()
          )
      : activeMood === null
        ? books.length > 0 ? books : (() => {
            const slugs = new Set<string>();
            const all: LibraryBook[] = [];
            for (const mood of MOODS) {
              for (const e of getBooksByMood(mood.id)) {
                if (!slugs.has(e.slug)) {
                  slugs.add(e.slug);
                  all.push({
                    slug: e.slug,
                    title: e.title,
                    author: '',
                    category: '',
                    tagline: '',
                    coverUrl: null,
                    moods: [{ mood: e.mood, score: e.score }],
                  });
                }
              }
            }
            return all.slice(0, 50);
          })()
        : getMoodBooks(activeMood);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Explore</h1>
        <p className="text-zinc-400 mb-8">Discover books by category or mood</p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setBrowseMode('categories'); setActiveMood(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              browseMode === 'categories'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => { setBrowseMode('moods'); setActiveCategory('All'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              browseMode === 'moods'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Moods
          </button>
        </div>

        {browseMode === 'categories' ? (
          <FilterChips
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        ) : (
          <div className="mb-8">
            <MoodSelector
              activeMood={activeMood}
              onMoodChange={setActiveMood}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Loading books...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg mb-2">
              {browseMode === 'moods'
                ? 'No books match this mood'
                : 'No books in this category'}
            </p>
            <p className="text-zinc-600">
              {browseMode === 'moods'
                ? 'Try a different mood or generate a new book'
                : 'Try selecting a different category'}
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

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </main>
    }>
      <ExploreContent />
    </Suspense>
  );
}
