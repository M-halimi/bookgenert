'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import EpisodeCard from '@/components/reader/EpisodeCard';
import ProgressBar from '@/components/ui/ProgressBar';
import LangSwitcher from '@/components/ui/LangSwitcher';
import type { BookEpisodes, LangCode, MultilingualText } from '@/lib/groq';
import { makeMultilingualText, ALL_LANGS } from '@/lib/groq';
import { MOODS, type MoodId, type ScoredMood } from '@/lib/moods';
import { assignMoods, classifyBook } from '@/lib/mood-store';
import { useLang } from '@/lib/i18n/lang-context';

const TOTAL_EPISODES = 10;

function getCacheKey(slug: string, lang: LangCode): string {
  return `bookflix_book_${slug}_${lang}`;
}

const TAB_LABELS: Record<string, Record<LangCode, string>> = {
  chapters: { ar: 'الفصول', fr: 'Chapitres', en: 'Chapters', de: 'Kapitel' },
  summary: { ar: 'الملخص', fr: 'Résumé', en: 'Summary', de: 'Zusammenfassung' },
  concepts: { ar: 'المفاهيم', fr: 'Concepts', en: 'Concepts', de: 'Konzepte' },
  guide: { ar: 'التنفيذ', fr: 'Guide', en: 'Guide', de: 'Umsetzung' },
};

export default function BookPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 px-4"><div className="max-w-2xl mx-auto animate-pulse h-8 bg-zinc-800 rounded w-3/4" /></div>}>
      <BookPage />
    </Suspense>
  );
}

function BookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const { lang, setLang: setContextLang } = useLang();

  const [data, setData] = useState<BookEpisodes | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodMessage, setMoodMessage] = useState('');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'chapters' | 'summary' | 'concepts' | 'guide'>('chapters');

  useEffect(() => {
    const urlLang = searchParams.get('lang') as LangCode;
    if (urlLang && (ALL_LANGS as readonly string[]).includes(urlLang) && urlLang !== lang) {
      setContextLang(urlLang);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title =
    searchParams.get('title') ||
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  const author = searchParams.get('author') || '';

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('bookflix_progress');
      if (savedProgress) setProgress(JSON.parse(savedProgress));
    } catch (err) {
      console.error('[BookPage] Failed to parse localStorage progress:', err);
    }
  }, []);

  const needsTranslationFor = useCallback((book: BookEpisodes, l: LangCode): boolean => {
    if (!book.episodes?.length) return false;
    const sample = book.episodes[0];
    const content = sample.content?.[l];
    return !content || !content.trim();
  }, []);

  const translateBookLang = useCallback(async (l: LangCode): Promise<BookEpisodes | null> => {
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
      console.error('[BookPage] Translation failed:', err);
    } finally {
      setTranslating(false);
    }
    return null;
  }, [slug]);

  const handleLangChange = useCallback((newLang: LangCode) => {
    setContextLang(newLang);
  }, [setContextLang]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const mt = (val: unknown): MultilingualText => {
      if (val && typeof val === 'object' && !Array.isArray(val) && 'ar' in val) {
        return { ...makeMultilingualText(''), ...(val as unknown as MultilingualText) };
      }
      return makeMultilingualText(typeof val === 'string' ? val : '', 'en');
    };

    const loadFromDb = async () => {
      const currentLang = lang;

      try {
        const res = await fetch(`/api/books/content?slug=${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
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

            if (needsTranslationFor(bookData, currentLang)) {
              const translated = await translateBookLang(currentLang);
              if (translated && !cancelled) {
                setData(translated);
              } else if (!cancelled) {
                setData(bookData);
              }
            } else {
              if (!cancelled) setData(bookData);
            }
          }
        }
      } catch (err) {
        console.error('[BookPage] Failed to load book from DB:', err);
      }
    };
    loadFromDb();
    return () => { cancelled = true; };
  }, [slug, lang, needsTranslationFor, translateBookLang]);

  const generateEpisodes = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author: author || undefined, lang }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(text ? `Server error: ${text.slice(0, 200)}` : 'Generation timed out. Try again.');
      }

      const result: BookEpisodes & { _error?: string } = await res.json();

      if (result._error) {
        throw new Error(result._error);
      }

      if (!res.ok) {
        throw new Error('Generation failed');
      }

      setData(result);
      const cacheKey = getCacheKey(slug, lang);
      try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* noop */ }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation timed out. Try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    } finally {
      setLoading(false);
    }
  }, [slug, title, author, lang]);

  const analyzeMoods = useCallback(async () => {
    if (!slug || !data) return;
    setMoodLoading(true);
    setMoodMessage('');
    try {
      const episodeTexts = data.episodes.map((ep) =>
        ep.content?.[lang] || ep.content?.en || ep.content?.ar || ''
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
        }, data.episodes.map(e => e.content?.[lang] || e.content?.en || ''));
      } else {
        assignMoods(slug, title, scoredMoods, 'ai');
      }

      setMoodMessage(
        lang === 'ar' ? 'اكتمل تحليل المشاعر!' :
        lang === 'fr' ? 'Analyse des ambiances terminée !' :
        lang === 'de' ? 'Stimmungsanalyse abgeschlossen!' :
        'Mood analysis complete!'
      );
    } catch {
      setMoodMessage(
        lang === 'ar' ? 'فشل تحليل المشاعر. حاول مرة أخرى.' :
        lang === 'fr' ? 'Échec de l\'analyse des ambiances. Réessayez.' :
        lang === 'de' ? 'Stimmungsanalyse fehlgeschlagen. Versuchen Sie es erneut.' :
        'Mood analysis failed. Try again.'
      );
    } finally {
      setMoodLoading(false);
    }
  }, [slug, data, title, author, lang]);

  const currentProgress = progress[slug] || 0;
  const currentTitle = data?.title?.[lang] || title;
  const currentTagline = data?.tagline?.[lang] || '';

  if (loading || translating) {
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
            {translating
              ? (lang === 'ar' ? 'جاري الترجمة...' :
                 lang === 'fr' ? 'Traduction en cours...' :
                 lang === 'de' ? 'Übersetzung läuft...' :
                 'Translating content...')
              : (lang === 'ar' ? 'جاري إنشاء الكتاب باستخدام الذكاء الاصطناعي...' :
                 lang === 'fr' ? 'Génération du livre avec l\'IA...' :
                 lang === 'de' ? 'Buch wird mit KI generiert...' :
                 'Generating book with AI...')}
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
            {lang === 'ar' ? 'حاول مرة أخرى' :
             lang === 'fr' ? 'Réessayer' :
             lang === 'de' ? 'Erneut versuchen' :
             'Try Again'}
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold text-white mb-4">{currentTitle}</h1>
          {author && (
            <p className="text-zinc-400 mb-8">
              {lang === 'ar' ? 'بواسطة' : lang === 'fr' ? 'par' : lang === 'de' ? 'von' : 'by'} {author}
            </p>
          )}
          <p className="text-zinc-500 mb-8">
            {lang === 'ar' ? 'لا توجد حلقات بعد. قم بإنشائها باستخدام الذكاء الاصطناعي.' :
             lang === 'fr' ? 'Pas encore d\'épisodes. Générez-les avec l\'IA.' :
             lang === 'de' ? 'Noch keine Episoden. Generieren Sie sie mit KI.' :
             'No episodes yet. Generate them with AI.'}
          </p>
          <button
            onClick={generateEpisodes}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-semibold"
          >
            {lang === 'ar' ? 'توليد الحلقات' :
             lang === 'fr' ? 'Générer les épisodes' :
             lang === 'de' ? 'Episoden generieren' :
             'Generate Episodes'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <LangSwitcher value={lang} onChange={handleLangChange} />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{currentTitle}</h1>
          <p className="text-zinc-400">
            {lang === 'ar' ? 'بواسطة' : lang === 'fr' ? 'par' : lang === 'de' ? 'von' : 'by'} {data.author}
          </p>
          {currentTagline && (
            <p className="text-zinc-500 mt-1 italic">{currentTagline}</p>
          )}
          <span className="inline-block mt-2 px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full">
            {data.category}
          </span>
        </div>

        <ProgressBar completed={currentProgress} total={TOTAL_EPISODES} lang={lang} />

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
                {TAB_LABELS[tab][lang]}
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

              const epTitle: string = ep.title?.[lang] || `${lang === 'ar' ? 'الفصل' : lang === 'fr' ? 'Chapitre' : lang === 'de' ? 'Kapitel' : 'Chapter'} ${epNum}`;
              const epSummary: string = ep.summary?.[lang] || '';

              return (
                <div key={epNum}>
                  {status === 'locked' ? (
                    <div>
                      <EpisodeCard number={epNum} title={epTitle} status={status} lang={lang} />
                    </div>
                  ) : (
                    <Link href={`/read/${slug}/${epNum}?lang=${lang}`}>
                      <EpisodeCard number={epNum} title={epTitle} status={status} lang={lang} />
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
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'الملخص النهائي' :
                   lang === 'fr' ? 'Résumé final' :
                   lang === 'de' ? 'Abschließende Zusammenfassung' :
                   'Final Summary'}
                </h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.finalSummary[lang]}
                </div>
              </div>
            )}

            {data.keyLessons && data.keyLessons.length > 0 && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'الدروس الرئيسية' :
                   lang === 'fr' ? 'Leçons clés' :
                   lang === 'de' ? 'Wichtige Lektionen' :
                   'Key Lessons'}
                </h2>
                <ul className="space-y-2">
                  {data.keyLessons.map((lesson, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{lesson[lang] || lesson.en || lesson.ar || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.keyInsights && data.keyInsights.length > 0 && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'الرؤى الأساسية' :
                   lang === 'fr' ? 'Points de vue' :
                   lang === 'de' ? 'Wichtige Erkenntnisse' :
                   'Key Insights'}
                </h2>
                <ul className="space-y-2">
                  {data.keyInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-300">
                      <span className="text-purple-400 mt-1">✦</span>
                      <span>{insight[lang] || insight.en || insight.ar || ''}</span>
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
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'المفاهيم الرئيسية' :
                   lang === 'fr' ? 'Concepts principaux' :
                   lang === 'de' ? 'Hauptkonzepte' :
                   'Main Concepts'}
                </h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.mainConcepts[lang]}
                </div>
              </div>
            )}

            {data.relatedBooks?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'كتب ومفاهيم ذات صلة' :
                   lang === 'fr' ? 'Livres et concepts connexes' :
                   lang === 'de' ? 'Verwandte Bücher und Konzepte' :
                   'Related Books & Concepts'}
                </h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.relatedBooks[lang]}
                </div>
              </div>
            )}

            {data.deepExplanation?.[lang] && (
              <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'شرح معمق' :
                   lang === 'fr' ? 'Explication approfondie' :
                   lang === 'de' ? 'Tiefgehende Erklärung' :
                   'Deep Explanation'}
                </h2>
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
                <h2 className="text-xl font-bold text-white mb-3">
                  {lang === 'ar' ? 'دليل التطبيق' :
                   lang === 'fr' ? 'Guide de mise en œuvre' :
                   lang === 'de' ? 'Umsetzungsleitfaden' :
                   'Implementation Guide'}
                </h2>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {data.implementationGuide[lang]}
                </div>
              </div>
            )}
            <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'تفاصيل الكتاب' :
                 lang === 'fr' ? 'Détails du livre' :
                 lang === 'de' ? 'Buchdetails' :
                 'Book Details'}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {lang === 'ar' ? 'الفصول' : lang === 'fr' ? 'Chapitres' : lang === 'de' ? 'Kapitel' : 'Chapters'}
                  </span>
                  <span className="text-zinc-300">{data.episodes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {lang === 'ar' ? 'التصنيف' : lang === 'fr' ? 'Catégorie' : lang === 'de' ? 'Kategorie' : 'Category'}
                  </span>
                  <span className="text-zinc-300">{data.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {lang === 'ar' ? 'المؤلف' : lang === 'fr' ? 'Auteur' : lang === 'de' ? 'Autor' : 'Author'}
                  </span>
                  <span className="text-zinc-300">{data.author}</span>
                </div>
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
            {moodLoading
              ? (lang === 'ar' ? 'جاري تحليل المشاعر...' :
                 lang === 'fr' ? 'Analyse des ambiances...' :
                 lang === 'de' ? 'Stimmungsanalyse läuft...' :
                 'Analyzing Moods...')
              : (lang === 'ar' ? 'تحليل المشاعر' :
                 lang === 'fr' ? 'Analyser les ambiances' :
                 lang === 'de' ? 'Stimmungen analysieren' :
                 'Analyze Moods')}
          </button>
        </div>
      </div>
    </main>
  );
}
