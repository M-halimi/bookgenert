'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';
import BookCard from '@/components/library/BookCard';
import { MOODS, normalizeMoods, MOOD_SCORE_THRESHOLD, type MoodId, type ScoredMood } from '@/lib/moods';
import { getBooksByMood, getMoodCounts, backfillFromLibrary, isBackfillNeeded } from '@/lib/mood-store';

interface LibraryBook {
  slug: string;
  title: string;
  author: string;
  category: string;
  tagline: string;
  coverUrl: string | null;
  moods?: ScoredMood[];
}

export default function Home() {
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({});
  const [backfilled, setBackfilled] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bookflix_library');
      let books: LibraryBook[] = [];
      if (raw) {
        books = JSON.parse(raw).map((b: LibraryBook) => ({ ...b, moods: normalizeMoods(b.moods) }));
        setLibrary(books);
      }

      if (!backfilled && isBackfillNeeded()) {
        const counts = backfillFromLibrary(
          books.map(b => ({ slug: b.slug, title: b.title, author: b.author, category: b.category }))
        );
        setMoodCounts(counts as unknown as Record<string, number>);
        setBackfilled(true);
      } else {
        setMoodCounts(getMoodCounts() as unknown as Record<string, number>);
        setBackfilled(true);
      }
    } catch {}
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

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-32 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Read <span className="text-red-600">Smarter</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-md mx-auto">
            Turn any book into 6 bite-sized episodes. Read in minutes, retain
            for life.
          </p>
        </div>
        <SearchBar />
      </section>

      {/* Mood Discovery */}
      {(library.length > 0 || Object.values(moodCounts).some(c => c > 0)) && (
        <section className="px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Discover by Mood
              </h2>
              <Link
                href="/explore"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Browse all
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
                        ? `${count} book${count !== 1 ? 's' : ''}`
                        : mood.description}
                    </p>
                  </Link>
                );
              })}
            </div>

            {/* Mood rows */}
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
                      <BookCard key={book.slug} {...book} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="px-4 pb-24">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-white">Search</p>
            <p className="text-zinc-500 text-sm mt-1">Pick any book or topic</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">Generate</p>
            <p className="text-zinc-500 text-sm mt-1">AI creates 6 episodes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">Read</p>
            <p className="text-zinc-500 text-sm mt-1">3-5 min per episode</p>
          </div>
        </div>
      </section>
    </main>
  );
}
