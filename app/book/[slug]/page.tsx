'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import EpisodeCard from '@/components/reader/EpisodeCard';
import ProgressBar from '@/components/ui/ProgressBar';
import LangSwitcher from '@/components/ui/LangSwitcher';
import type { BookEpisodes, LangCode, RichChapter } from '@/lib/groq';
import { MOODS, type MoodId, type ScoredMood } from '@/lib/moods';
import { assignMoods, classifyBook } from '@/lib/mood-store';

const TOTAL_EPISODES = 10;

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
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; similarity?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'chapters' | 'summary' | 'concepts' | 'guide'>('chapters');

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
    const loadFromDb = async () => {
      try {
        const cached = localStorage.getItem(`bookflix_episodes_${slug}`);
        if (cached) {
          setData(JSON.parse(cached));
          return;
        }
        const res = await fetch(`/api/books/content?slug=${slug}`);
        if (res.ok) {
          const json = await res.json();
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
              ? json.chapters.map((ch: RichChapter, i: number) => ({
                  number: i + 1,
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
          localStorage.setItem(`bookflix_episodes_${slug}`, JSON.stringify(bookData));
        }
      } catch {}
    };
    loadFromDb();
  }, [slug]);

  const generateEpisodes = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    setCacheInfo(null);
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

      const episodes: BookEpisodes & { _cached?: boolean; _cacheSimilarity?: number } = await res.json();
      setData(episodes);

      if (episodes._cached) {
        setCacheInfo({
          cached: true,
          similarity: episodes._cacheSimilarity,
        });
      }

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
            {[...Array(10)].map((_, i) => (
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
          {cacheInfo?.cached && (
            <span className="inline-block mt-2 ml-2 px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">
              Loaded from cache
              {cacheInfo.similarity && ` (${(cacheInfo.similarity * 100).toFixed(0)}% match)`}
            </span>
          )}
        </div>

        <ProgressBar completed={currentProgress} total={TOTAL_EPISODES} />

        {/* Premium Summary Tabs */}
        <div className="mt-6 mb-6">
          <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
            {(['chapters', 'summary', 'concepts', 'guide'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-red-400 border-b-2 border-red-600'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'chapters' ? (lang === 'ar' ? 'الفصول' : lang === 'fr' ? 'Chapitres' : 'Chapters') :
                 tab === 'summary' ? (lang === 'ar' ? 'الملخص' : lang === 'fr' ? 'Résumé' : 'Summary') :
                 tab === 'concepts' ? (lang === 'ar' ? 'المفاهيم' : lang === 'fr' ? 'Concepts' : 'Concepts') :
                 (lang === 'ar' ? 'التنفيذ' : lang === 'fr' ? 'Guide' : 'Guide')}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'chapters' && (
          <div className="space-y-3 mt-6">
            {data.episodes.map((ep, idx) => {
              const epNum = idx + 1;
              let status: 'locked' | 'current' | 'done';
              if (epNum <= currentProgress) status = 'done';
              else if (epNum === currentProgress + 1) status = 'current';
              else status = 'locked';

              const epTitle: string = ep.title[lang];
              const epSummary: string = ep.summary?.[lang] || '';

              return (
                <div key={epNum}>
                  {status === 'locked' ? (
                    <div>
                      <EpisodeCard number={epNum} title={epTitle} status={status} />
                    </div>
                  ) : (
                    <Link href={`/read/${slug}/${epNum}?lang=${lang}`}>
                      <EpisodeCard number={epNum} title={epTitle} status={status} />
                    </Link>
                  )}
                  {epSummary && status !== 'locked' && (
                    <p className="text-zinc-500 text-xs mt-1 ml-14 line-clamp-1">{epSummary}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6 mt-6">
            {data.finalSummary?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Final Summary</h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.finalSummary[lang]}
                </div>
              </div>
            )}

            {data.keyLessons && data.keyLessons.length > 0 && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Key Lessons</h2>
                <ul className="space-y-2">
                  {data.keyLessons.map((lesson, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{lesson[lang]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.keyInsights && data.keyInsights.length > 0 && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Key Insights</h2>
                <ul className="space-y-2">
                  {data.keyInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-purple-400 mt-1">✦</span>
                      <span>{insight[lang]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="space-y-6 mt-6">
            {data.mainConcepts?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Main Concepts</h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.mainConcepts[lang]}
                </div>
              </div>
            )}

            {data.relatedBooks?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Related Books & Concepts</h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.relatedBooks[lang]}
                </div>
              </div>
            )}

            {data.deepExplanation?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Deep Explanation</h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.deepExplanation[lang]}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-6 mt-6">
            {data.implementationGuide?.[lang] && (
              <div className="p-5 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">Implementation Guide</h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.implementationGuide[lang]}
                </div>
              </div>
            )}
            <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">Book Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Chapters</span>
                  <span className="text-zinc-300">{data.episodes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category</span>
                  <span className="text-zinc-300">{data.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Author</span>
                  <span className="text-zinc-300">{data.author}</span>
                </div>
                {cacheInfo?.cached && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Cache Status</span>
                    <span className="text-blue-400">Loaded from cache</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
      </div>
    </main>
  );
}
