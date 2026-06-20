'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReaderEngine from '@/components/reader/ReaderEngine';
import type { BookEpisodes, LangCode, MultilingualText } from '@/lib/groq';

const TOTAL_EPISODES = 10;

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const epParam = params.ep as string;
  const episodeNumber = parseInt(epParam, 10);
  const langParam = (searchParams.get('lang') || 'ar') as LangCode;
  const lang: LangCode = ['ar', 'fr', 'en', 'de'].includes(langParam) ? langParam : 'ar';

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const cached = localStorage.getItem(`bookflix_episodes_${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.episodes?.length > 0) {
            if (!cancelled) setData(parsed);
            if (!cancelled) setLoading(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch(`/api/books/content?slug=${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const bookData: BookEpisodes = {
              title: json.episodes?.title || { ar: json.title, fr: json.title, en: json.title },
              author: json.author || 'AI Generated',
              category: json.category || 'General',
              tagline: json.episodes?.tagline || { ar: '', fr: '', en: '' },
              description: json.description || '',
              coverPrompt: json.coverPrompt || '',
              relatedBooks: json.episodes?.relatedBooks || { ar: '', fr: '', en: '' },
              deepExplanation: json.episodes?.deepExplanation || { ar: '', fr: '', en: '' },
              finalSummary: json.episodes?.finalSummary ||
                (json.finalSummary ? { ar: json.finalSummary, fr: json.finalSummary, en: json.finalSummary } : { ar: '', fr: '', en: '' }),
              mainConcepts: json.episodes?.mainConcepts ||
                (json.mainConcepts ? { ar: '', fr: '', en: '' } : { ar: '', fr: '', en: '' }),
              keyLessons: json.episodes?.keyLessons || json.keyLessons || [],
              keyInsights: json.episodes?.keyInsights || json.keyInsights || [],
              implementationGuide: json.episodes?.implementationGuide ||
                (json.implementationGuide ? { ar: json.implementationGuide, fr: json.implementationGuide, en: json.implementationGuide } : { ar: '', fr: '', en: '' }),
              episodes: json.chapters?.length > 0
                ? json.chapters.map((ch: { number?: number; title?: MultilingualText; hook?: MultilingualText; content?: MultilingualText; keyIdeas?: MultilingualText; actionableTips?: MultilingualText; importantQuotes?: MultilingualText; practicalExamples?: MultilingualText; keyTakeaway?: MultilingualText; cliffhanger?: MultilingualText; summary?: MultilingualText; wordCount?: number }) => ({
                    number: ch.number || 0,
                    title: ch.title || { ar: '', fr: '', en: '' },
                    hook: ch.hook || { ar: '', fr: '', en: '' },
                    content: ch.content || { ar: '', fr: '', en: '' },
                    keyIdeas: ch.keyIdeas || { ar: '', fr: '', en: '' },
                    actionableTips: ch.actionableTips || { ar: '', fr: '', en: '' },
                    importantQuotes: ch.importantQuotes || { ar: '', fr: '', en: '' },
                    practicalExamples: ch.practicalExamples || { ar: '', fr: '', en: '' },
                    keyTakeaway: ch.keyTakeaway || { ar: '', fr: '', en: '' },
                    cliffhanger: ch.cliffhanger || { ar: '', fr: '', en: '' },
                    summary: ch.summary || { ar: '', fr: '', en: '' },
                    wordCount: ch.wordCount || 300,
                  }))
                : json.episodes?.episodes || [],
            };
            setData(bookData);
          }
        }
      } catch {}

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
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

  if (!data || episodeNumber < 1 || episodeNumber > TOTAL_EPISODES) {
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
          totalEpisodes={TOTAL_EPISODES}
          lang={lang}
        />
      </div>
    </main>
  );
}
