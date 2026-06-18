'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import EpisodeCard from '@/components/reader/EpisodeCard';
import ProgressBar from '@/components/ui/ProgressBar';
import LangSwitcher from '@/components/ui/LangSwitcher';
import type { BookEpisodes, LangCode } from '@/lib/groq';
import { MOODS, type MoodId, type ScoredMood } from '@/lib/moods';
import { assignMoods, classifyBook } from '@/lib/mood-store';

interface LibraryEntry {
  slug: string;
  title: string;
  author: string;
  category: string;
  tagline: string;
  coverUrl: string;
  moods?: ScoredMood[];
}

export default function BookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodMessage, setMoodMessage] = useState('');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [lang, setLang] = useState<LangCode>('ar');

  const title =
    searchParams.get('title') ||
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  const author = searchParams.get('author') || '';
  const coverUrl = searchParams.get('cover') || '';

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('bookflix_progress');
      if (savedProgress) setProgress(JSON.parse(savedProgress));
    } catch {}
  }, []);

  useEffect(() => {
    if (!slug) return;
    try {
      const cached = localStorage.getItem(`bookflix_episodes_${slug}`);
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch {}
  }, [slug]);

  const generateEpisodes = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author: author || undefined, lang }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const episodes: BookEpisodes = await res.json();
      setData(episodes);
      localStorage.setItem(
        `bookflix_episodes_${slug}`,
        JSON.stringify(episodes)
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [slug, title, author, lang]);

  const analyzeMoods = useCallback(async () => {
    if (!slug || !data) return;
    setMoodLoading(true);
    setMoodMessage('');
    try {
      const episodeTexts = data.episodes.map(
        (ep) => ep.content?.en || ep.content?.ar || ''
      );
      const res = await fetch('/api/moods/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          category: data.category,
          episodeContents: episodeTexts,
        }),
      });

      let scoredMoods: ScoredMood[] = [];

      if (res.ok) {
        const moodData = await res.json();
        const validIds = new Set(MOODS.map(m => m.id));
        const rawMoods: ScoredMood[] = moodData?.moods || [];
        scoredMoods = rawMoods
          .filter(m => m && typeof m.mood === 'string' && typeof m.score === 'number' && validIds.has(m.mood))
          .map(m => ({ mood: m.mood as MoodId, score: Math.round(m.score) }));
      }

      if (scoredMoods.length === 0) {
        scoredMoods = classifyBook(slug, title, {
          title,
          author,
          category: data.category,
        }, data.episodes.map(e => e.content?.en || ''));
      } else {
        assignMoods(slug, title, scoredMoods, 'ai');
      }

      try {
        const library = JSON.parse(
          localStorage.getItem('bookflix_library') || '[]'
        );
        const existing = library.findIndex((b: LibraryEntry) => b.slug === slug);
        const entry: LibraryEntry = {
          slug,
          title,
          author,
          category: data.category,
          tagline: data.tagline?.ar || `${title} — ${data.category}`,
          coverUrl,
          moods: scoredMoods,
        };
        if (existing >= 0) library[existing] = entry;
        else library.push(entry);
        localStorage.setItem('bookflix_library', JSON.stringify(library));
      } catch {}

      setMoodMessage('Mood analysis complete!');
    } catch {
      setMoodMessage('Mood analysis failed. Try again.');
    } finally {
      setMoodLoading(false);
    }
  }, [slug, data, title, author, coverUrl]);

  const currentProgress = progress[slug] || 0;
  const currentTitle = data?.title?.[lang] || title;
  const currentTagline = data?.tagline?.[lang] || '';

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
            <div className="h-2 bg-zinc-800 rounded w-full mt-8" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded-lg" />
            ))}
          </div>
          <p className="text-zinc-500 text-center mt-8">
            Generating book with AI... This may take a moment.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={generateEpisodes}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
          {author && <p className="text-zinc-400 mb-8">by {author}</p>}
          <p className="text-zinc-500 mb-8">No episodes yet. Generate them with AI.</p>
          <button
            onClick={generateEpisodes}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-semibold"
          >
            Generate Episodes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <LangSwitcher value={lang} onChange={setLang} />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{currentTitle}</h1>
          <p className="text-zinc-400">by {data.author}</p>
          {currentTagline && (
            <p className="text-zinc-500 mt-1 italic">{currentTagline}</p>
          )}
          <span className="inline-block mt-2 px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full">
            {data.category}
          </span>
        </div>

        <ProgressBar completed={currentProgress} total={6} />

        <div className="mt-8 space-y-3">
          {data.episodes.map((ep, idx) => {
            const epNum = idx + 1;
            let status: 'locked' | 'current' | 'done';
            if (epNum <= currentProgress) status = 'done';
            else if (epNum === currentProgress + 1) status = 'current';
            else status = 'locked';

            const epTitle: string = ep.title[lang];

            return status === 'locked' ? (
              <div key={epNum}>
                <EpisodeCard number={epNum} title={epTitle} status={status} />
              </div>
            ) : (
              <Link key={epNum} href={`/read/${slug}/${epNum}?lang=${lang}`}>
                <EpisodeCard number={epNum} title={epTitle} status={status} />
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          {moodMessage && (
            <p className="text-zinc-400 text-sm">{moodMessage}</p>
          )}
          <button
            onClick={analyzeMoods}
            disabled={moodLoading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {moodLoading ? 'Analyzing Moods...' : 'Analyze Moods'}
          </button>
        </div>

        {data.relatedBooks?.[lang] && (
          <div className="mt-12 p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-3">
              {lang === 'ar' ? 'كتب ومفاهيم ذات صلة' :
               lang === 'fr' ? 'Livres et concepts connexes' :
               'Related Books & Concepts'}
            </h2>
            <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
              {data.relatedBooks[lang]}
            </div>
          </div>
        )}

        {data.deepExplanation?.[lang] && (
          <div className="mt-6 p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-3">
              {lang === 'ar' ? 'شرح معمق' :
               lang === 'fr' ? 'Explication approfondie' :
               'Deep Explanation'}
            </h2>
            <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
              {data.deepExplanation[lang]}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
