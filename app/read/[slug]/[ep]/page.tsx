'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReaderEngine from '@/components/reader/ReaderEngine';
import type { BookEpisodes, LangCode, MultilingualText } from '@/lib/groq';
import { makeMultilingualText, ALL_LANGS } from '@/lib/groq';
import { useLang } from '@/lib/i18n/lang-context';

const TOTAL_EPISODES = 10;

function getCacheKey(slug: string, lang: LangCode): string {
  return `bookflix_episodes_${slug}_${lang}`;
}

export default function ReadPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 px-4"><div className="max-w-2xl mx-auto animate-pulse h-8 bg-zinc-800 rounded w-3/4" /></div>}>
      <ReadPage />
    </Suspense>
  );
}

function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const epParam = params.ep as string;
  const episodeNumber = parseInt(epParam, 10);
  const { lang, setLang: setContextLang } = useLang();

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const urlLang = searchParams.get('lang') as LangCode;
    if (urlLang && (ALL_LANGS as readonly string[]).includes(urlLang) && urlLang !== lang) {
      setContextLang(urlLang);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const needsTranslation = useCallback((book: BookEpisodes, l: LangCode): boolean => {
    if (!book.episodes?.length) return false;
    const sample = book.episodes[0];
    const content = sample.content?.[l];
    return !content || !content.trim();
  }, []);

  const translateContent = useCallback(async (l: LangCode): Promise<BookEpisodes | null> => {
    setTranslating(true);
    try {
      const cacheKey = getCacheKey(slug, l);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.episodes?.length > 0) {
          const sample = parsed.episodes[0];
          if (sample.content?.[l]?.trim()) {
            return parsed;
          }
        }
      }
      const res = await fetch('/api/translate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, targetLang: l }),
      });
      if (res.ok) {
        const json = await res.json();
        const translated: BookEpisodes = json.content;
        if (translated?.episodes?.length > 0) {
          const sample = translated.episodes[0];
          if (sample.content?.[l]?.trim()) {
            try { localStorage.setItem(cacheKey, JSON.stringify(translated)); } catch { /* noop */ }
            return translated;
          }
        }
      }
    } catch (err) {
      console.error('[ReadPage] Translation failed:', err);
    } finally {
      setTranslating(false);
    }
    return null;
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      const currentLang = lang;

      try {
        const res = await fetch(`/api/books/content?slug=${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const mt = (val: unknown): MultilingualText => {
              if (val && typeof val === 'object' && !Array.isArray(val) && 'ar' in val) {
                return { ...makeMultilingualText(''), ...(val as unknown as MultilingualText) };
              }
              return makeMultilingualText(typeof val === 'string' ? val : '', 'en');
            };

            const bookData: BookEpisodes = {
              title: mt(json.episodes?.title ?? json.title),
              author: json.author || 'AI Generated',
              category: json.category || 'General',
              tagline: mt(json.episodes?.tagline),
              description: json.description || '',
              coverPrompt: json.coverPrompt || '',
              relatedBooks: mt(json.episodes?.relatedBooks),
              deepExplanation: mt(json.episodes?.deepExplanation),
              finalSummary: mt(json.episodes?.finalSummary ?? json.finalSummary),
              mainConcepts: mt(json.episodes?.mainConcepts ?? json.mainConcepts),
              keyLessons: (json.episodes?.keyLessons || json.keyLessons || []).map((l: unknown) => mt(l)),
              keyInsights: (json.episodes?.keyInsights || json.keyInsights || []).map((i: unknown) => mt(i)),
              implementationGuide: mt(json.episodes?.implementationGuide ?? json.implementationGuide),
              episodes: json.chapters?.length > 0
                ? json.chapters.map((ch: Record<string, unknown>) => ({
                    number: typeof ch.number === 'number' ? ch.number : 0,
                    title: mt(ch.title),
                    hook: mt(ch.hook),
                    content: mt(ch.content),
                    keyIdeas: mt(ch.keyIdeas),
                    actionableTips: mt(ch.actionableTips),
                    importantQuotes: mt(ch.importantQuotes),
                    practicalExamples: mt(ch.practicalExamples),
                    keyTakeaway: mt(ch.keyTakeaway),
                    cliffhanger: mt(ch.cliffhanger),
                    summary: mt(ch.summary),
                    wordCount: typeof ch.wordCount === 'number' ? ch.wordCount : 300,
                  }))
                : json.episodes?.episodes || [],
            };

            if (needsTranslation(bookData, currentLang)) {
              const translated = await translateContent(currentLang);
              if (translated && !cancelled) {
                setData(translated);
              } else if (!cancelled) {
                setData(bookData);
              }
            } else {
              const cacheKey = getCacheKey(slug, currentLang);
              if (!cancelled) setData(bookData);
              try { localStorage.setItem(cacheKey, JSON.stringify(bookData)); } catch { /* noop */ }
            }
          }
        }
      } catch (err) {
        console.error('[ReadPage] Failed to fetch book content:', err);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [slug, lang, needsTranslation, translateContent]);

  if (loading || translating) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-1/4 mx-auto" />
            <div className="h-8 bg-zinc-800 rounded w-3/4 mx-auto" />
            <div className="h-64 bg-zinc-800 rounded" />
          </div>
          {translating && (
            <p className="text-zinc-500 mt-8">
              {lang === 'ar' ? 'جاري الترجمة...' :
               lang === 'fr' ? 'Traduction en cours...' :
               lang === 'de' ? 'Übersetzung läuft...' :
               'Translating...'}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (!data || episodeNumber < 1 || episodeNumber > TOTAL_EPISODES) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-zinc-400 text-lg mb-4">
            {lang === 'ar' ? 'الفصل غير موجود' :
             lang === 'fr' ? 'Chapitre introuvable' :
             lang === 'de' ? 'Kapitel nicht gefunden' :
             'Chapter not found'}
          </p>
          <button
            onClick={() => router.push(`/book/${slug}?lang=${lang}`)}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            {lang === 'ar' ? 'العودة إلى الفصول' :
             lang === 'fr' ? 'Retour aux chapitres' :
             lang === 'de' ? 'Zurück zu den Kapiteln' :
             'Back to Chapters'}
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
        />
      </div>
    </main>
  );
}
