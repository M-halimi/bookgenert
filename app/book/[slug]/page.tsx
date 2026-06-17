'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import EpisodeCard from '@/components/reader/EpisodeCard';
import ProgressBar from '@/components/ui/ProgressBar';
import LangSwitcher from '@/components/ui/LangSwitcher';
import type { BookEpisodes, LangCode } from '@/lib/groq';

interface LibraryEntry {
  slug: string;
  title: string;
  author: string;
  category: string;
  tagline: string;
  coverUrl: string;
}

export default function BookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

    const cached = localStorage.getItem(`bookflix_episodes_${slug}`);
    if (cached) {
      setData(JSON.parse(cached));
      setLoading(false);
      return;
    }

    const fetchEpisodes = async () => {
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

        try {
          const library = JSON.parse(
            localStorage.getItem('bookflix_library') || '[]'
          );
          const existing = library.findIndex((b: LibraryEntry) => b.slug === slug);
          const entry = {
            slug,
            title,
            author,
            category: episodes.category,
            tagline: episodes.tagline?.ar || episodes.tagline,
            coverUrl,
          };
          if (existing >= 0) library[existing] = entry;
          else library.push(entry);
          localStorage.setItem('bookflix_library', JSON.stringify(library));
        } catch {}
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [slug, title, author, coverUrl, lang]);

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
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

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
