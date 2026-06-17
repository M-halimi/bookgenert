'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReaderEngine from '@/components/reader/ReaderEngine';
import type { BookEpisodes, LangCode } from '@/lib/groq';

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const epParam = params.ep as string;
  const episodeNumber = parseInt(epParam, 10);
  const langParam = (searchParams.get('lang') || 'ar') as LangCode;
  const lang: LangCode = ['ar', 'fr', 'en'].includes(langParam) ? langParam : 'ar';

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    try {
      const cached = localStorage.getItem(`bookflix_episodes_${slug}`);
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch {}
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/4" />
          <div className="h-8 bg-zinc-800 rounded w-3/4" />
          <div className="h-64 bg-zinc-800 rounded" />
        </div>
      </main>
    );
  }

  if (!data || episodeNumber < 1 || episodeNumber > 6) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-zinc-400 text-lg mb-4">Chapter not found</p>
          <button
            onClick={() => router.push(`/book/${slug}`)}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            Back to Chapters
          </button>
        </div>
      </main>
    );
  }

  const episode = data.episodes[episodeNumber - 1];

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <ReaderEngine
          episode={episode}
          slug={slug}
          totalEpisodes={6}
          lang={lang}
        />
      </div>
    </main>
  );
}
