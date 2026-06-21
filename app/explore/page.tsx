'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FilterChips from '@/components/library/FilterChips';
import MoodSelector from '@/components/library/MoodSelector';
import BookCard from '@/components/library/BookCard';
import { fetchPopularBooks } from '@/lib/openlibrary';
import { MOODS, type MoodId, type ScoredMood } from '@/lib/moods';
import { getBooksByMood, isBackfillNeeded } from '@/lib/mood-store';
import { useLocale, useTranslations } from 'next-intl';
import { COOKIE_NAME } from '@/lib/i18n/config';

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

function getLangFromCookie(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : 'en';
}

function ExploreContent() {
  const t = useTranslations();
  const locale = useLocale();
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
      if (!backfilled && isBackfillNeeded()) {
        setBackfilled(true);
      } else {
        setBackfilled(true);
      }

      let dbBooks: LibraryBook[] = [];
      try {
        const lang = getLangFromCookie();
        const res = await fetch(`/api/books/library?limit=100&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          dbBooks = (data.books || []).map((b: LibraryBook) => ({
            slug: b.slug,
            title: b.title,
            author: b.author || 'AI Generated',
            category: b.category || '',
            tagline: b.tagline || '',
            coverUrl: b.coverUrl || null,
          }));
        }
      } catch (err) {
        console.error('[Explore] Failed to load DB books:', err);
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
        const dbSlugs = new Set(dbBooks.map((b) => b.slug));
        const merged = [
          ...dbBooks,
          ...popularBooks.filter((b) => !dbSlugs.has(b.slug)),
        ];
        setBooks(merged);
      } catch {
        setBooks(dbBooks);
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
        <h1 className="text-3xl font-bold text-white mb-2">{t('explore.title')}</h1>
        <p className="text-zinc-400 mb-8">{t('explore.search_placeholder')}</p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setBrowseMode('categories'); setActiveMood(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              browseMode === 'categories'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t('explore.filter_all')}
          </button>
          <button
            onClick={() => { setBrowseMode('moods'); setActiveCategory('All'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              browseMode === 'moods'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t('common.search')}
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
            <p className="text-zinc-500">{t('common.loading')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg mb-2">
              {t('explore.no_results')}
            </p>
            <p className="text-zinc-600">
              {t('explore.no_results')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtered.map((book) => (
              <BookCard key={book.slug} {...book} lang={locale} />
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
          <p className="text-zinc-500">{'common.loading'}</p>
        </div>
      </main>
    }>
      <ExploreContent />
    </Suspense>
  );
}
