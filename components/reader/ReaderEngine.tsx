'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LangSwitcher from '@/components/ui/LangSwitcher';
import type { RichChapter, LangCode } from '@/lib/groq';
import { resolveField } from '@/lib/groq';
import { useLang } from '@/lib/i18n/lang-context';

interface ReaderEngineProps {
  episode: RichChapter;
  slug: string;
  totalEpisodes: number;
}

export default function ReaderEngine({
  episode,
  slug,
  totalEpisodes,
}: ReaderEngineProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { lang: contextLang, setLang: setContextLang } = useLang();
  const router = useRouter();
  const indexRef = useRef(0);

  const displayLang = contextLang;

  const handleLangChange = useCallback((newLang: LangCode) => {
    setContextLang(newLang);
  }, [setContextLang]);

  const currentHook = resolveField(episode.hook, displayLang);
  const currentContent = resolveField(episode.content, displayLang);
  const currentTitle = resolveField(episode.title, displayLang);
  const currentTakeaway = resolveField(episode.keyTakeaway, displayLang);
  const currentCliffhanger = resolveField(episode.cliffhanger, displayLang);
  const currentKeyIdeas = resolveField(episode.keyIdeas, displayLang);
  const currentTips = resolveField(episode.actionableTips, displayLang);
  const currentQuotes = resolveField(episode.importantQuotes, displayLang);
  const currentExamples = resolveField(episode.practicalExamples, displayLang);

  const fullText = currentHook
    ? `${currentHook}\n\n${currentContent}`
    : currentContent;

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (indexRef.current < fullText.length) {
        setDisplayedText(fullText.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [fullText, displayLang]);

  useEffect(() => {
    if (isComplete) {
      try {
        const key = `bookflix_progress`;
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        saved[slug] = Math.max(saved[slug] || 0, episode.number);
        localStorage.setItem(key, JSON.stringify(saved));
      } catch (err) {
        console.error('[ReaderEngine] Failed to save progress:', err);
      }
    }
  }, [isComplete, slug, episode.number]);

  return (
    <div>
      <div className="mb-6">
        <LangSwitcher value={contextLang} onChange={handleLangChange} />
      </div>

      <div className="mb-8">
        <p className="text-zinc-400 text-sm mb-2">
          {displayLang === 'ar' ? `الفصل ${episode.number} من ${totalEpisodes}` :
           displayLang === 'fr' ? `Chapitre ${episode.number} sur ${totalEpisodes}` :
           displayLang === 'de' ? `Kapitel ${episode.number} von ${totalEpisodes}` :
           `Chapter ${episode.number} of ${totalEpisodes}`}
        </p>
        <h1 className="text-2xl font-bold text-white">{currentTitle}</h1>
      </div>

      <div className="prose prose-invert max-w-none mb-8" dir={displayLang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-lg">
          {displayedText}
          {!isComplete && <span className="animate-pulse text-red-500">|</span>}
        </div>
      </div>

      {isComplete && (
        <div className="space-y-6">
          {currentKeyIdeas && (
            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
              <h3 className="text-purple-400 font-semibold mb-2">
                {displayLang === 'ar' ? 'الأفكار الرئيسية' :
                 displayLang === 'fr' ? 'Idées clés' :
                 displayLang === 'de' ? 'Schlüsselideen' :
                 'Key Ideas'}
              </h3>
              <p className="text-zinc-300 whitespace-pre-line">{currentKeyIdeas}</p>
            </div>
          )}

          {currentTips && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2">
                {displayLang === 'ar' ? 'نصائح قابلة للتطبيق' :
                 displayLang === 'fr' ? 'Conseils actionnables' :
                 displayLang === 'de' ? 'Umsetzbare Tipps' :
                 'Actionable Tips'}
              </h3>
              <p className="text-zinc-300 whitespace-pre-line">{currentTips}</p>
            </div>
          )}

          {currentExamples && (
            <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
              <h3 className="text-yellow-400 font-semibold mb-2">
                {displayLang === 'ar' ? 'أمثلة عملية' :
                 displayLang === 'fr' ? 'Exemples pratiques' :
                 displayLang === 'de' ? 'Praktische Beispiele' :
                 'Practical Examples'}
              </h3>
              <p className="text-zinc-300 whitespace-pre-line">{currentExamples}</p>
            </div>
          )}

          {currentQuotes && (
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4 italic">
              <h3 className="text-blue-400 font-semibold mb-2 not-italic">
                {displayLang === 'ar' ? 'اقتباسات مهمة' :
                 displayLang === 'fr' ? 'Citations importantes' :
                 displayLang === 'de' ? 'Wichtige Zitate' :
                 'Important Quotes'}
              </h3>
              <p className="text-zinc-300">{currentQuotes}</p>
            </div>
          )}

          {currentTakeaway && (
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
              <h3 className="text-red-500 font-semibold mb-1">
                {displayLang === 'ar' ? 'الخلاصة الرئيسية' :
                 displayLang === 'fr' ? 'Point clé' :
                 displayLang === 'de' ? 'Wichtigste Erkenntnis' :
                 'Key Takeaway'}
              </h3>
              <p className="text-zinc-300">{currentTakeaway}</p>
            </div>
          )}

          {currentCliffhanger && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 italic">
              <p className="text-zinc-400">{currentCliffhanger}</p>
            </div>
          )}

          <div className="flex gap-4" dir="ltr">
            {episode.number < totalEpisodes && (
              <button
                onClick={() => router.push(`/read/${slug}/${episode.number + 1}?lang=${displayLang}`)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {displayLang === 'ar' ? 'الفصل التالي' :
                 displayLang === 'fr' ? 'Chapitre suivant' :
                 displayLang === 'de' ? 'Nächstes Kapitel' :
                 'Next Chapter'}
              </button>
            )}
            {episode.number === totalEpisodes && (
              <button
                onClick={() => router.push(`/book/${slug}?lang=${displayLang}`)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                {displayLang === 'ar' ? 'اكتمل! العودة إلى الفصول' :
                 displayLang === 'fr' ? 'Terminé! Voir les chapitres' :
                 displayLang === 'de' ? 'Abgeschlossen! Zu den Kapiteln' :
                 'Complete! Go to Chapters'}
              </button>
            )}
            <button
              onClick={() => router.push(`/book/${slug}?lang=${displayLang}`)}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
            >
              {displayLang === 'ar' ? 'قائمة الفصول' :
               displayLang === 'fr' ? 'Liste des chapitres' :
               displayLang === 'de' ? 'Kapitelliste' :
               'Chapter List'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
