'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';
import BookCard from '@/components/library/BookCard';
import { MOODS, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from '@/lib/moods';
import { getBooksByMood, getMoodCounts, backfillFromLibrary, isBackfillNeeded } from '@/lib/mood-store';
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

function getLangFromCookie(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : 'en';
}

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({});
  const [backfilled, setBackfilled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const lang = getLangFromCookie();
        const res = await fetch(`/api/books/library?limit=50&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          const dbBooks: LibraryBook[] = (data.books || []).map((b: LibraryBook) => ({
            slug: b.slug,
            title: b.title,
            author: b.author || 'AI Generated',
            category: b.category || '',
            tagline: b.tagline || '',
            coverUrl: b.coverUrl || null,
          }));
          setLibrary(dbBooks);

          if (!backfilled && isBackfillNeeded()) {
            const counts = backfillFromLibrary(
              dbBooks.map(b => ({ slug: b.slug, title: b.title, author: b.author, category: b.category }))
            );
            setMoodCounts(counts as unknown as Record<string, number>);
            setBackfilled(true);
            return;
          }
        }
        if (!backfilled) {
          setMoodCounts(getMoodCounts() as unknown as Record<string, number>);
          setBackfilled(true);
        }
      } catch (err) {
        console.error('[Home] Failed to load library:', err);
      }
    }
    load();
  }, [backfilled]);

  const bookCount = (moodId: MoodId): number => {
    const storeCount = moodCounts[moodId] || 0;
    if (storeCount > 0) return storeCount;
    return library.filter((b) =>
      b.moods?.some(m => m.mood === moodId && m.score > MOOD_SCORE_THRESHOLD)
    ).length;
  };

  const moodBooks = (moodId: MoodId): LibraryBook[] => {
    const storeEntries = getBooksByMood(moodId).slice(0, 5);
    if (storeEntries.length === 0) return [];

    const result: LibraryBook[] = [];
    for (const entry of storeEntries) {
      const existing = library.find(b => b.slug === entry.slug);
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

  const hasContent = library.length > 0 || Object.values(moodCounts).some(c => c > 0);

  return (
    <main className="min-h-screen bg-zinc-950">
      <section className="flex flex-col items-center justify-center px-4 pt-32 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            {t('home.hero_title')}
          </h1>
          <p className="text-xl text-zinc-400 max-w-md mx-auto">
            {t('home.hero_subtitle')}
          </p>
        </div>
        <SearchBar />
      </section>

      {hasContent && (
        <section className="px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {t('home.popular_moods')}
              </h2>
              <Link
                href="/explore"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {t('home.start_reading')}
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {MOODS.map((mood) => {
                const count = bookCount(mood.id);
                return (
                  <Link
                    key={mood.id}
                    href={`/explore?mood=${mood.id}`}
                    className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 transition-all hover:-translate-y-0.5"
                  >
                    <span className="text-2xl block mb-2">{mood.emoji}</span>
                    <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                      {mood.label}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {count > 0
                        ? `${count} ${t('book.episodes')}`
                        : mood.description}
                    </p>
                  </Link>
                );
              })}
            </div>

            {MOODS.map((mood) => {
              const books = moodBooks(mood.id);
              if (books.length === 0) return null;
              return (
                <div key={mood.id} className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{mood.emoji}</span>
                    <h3 className="text-lg font-semibold text-white">
                      {mood.label}
                    </h3>
                    <span className="text-zinc-600 text-sm">
                      — {mood.description}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {books.map((book) => (
                      <BookCard key={book.slug} {...book} lang={locale} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {library.length > 0 && !hasContent && (
        <section className="px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {t('home.featured')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {library.slice(0, 10).map((book) => (
                <BookCard key={book.slug} {...book} lang={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-24">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{t('common.search')}</p>
            <p className="text-zinc-500 text-sm mt-1">{t('home.search_placeholder')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{t('home.generate_button')}</p>
            <p className="text-zinc-500 text-sm mt-1">{t('home.hero_subtitle')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{t('book.read')}</p>
            <p className="text-zinc-500 text-sm mt-1">{t('home.start_reading')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
