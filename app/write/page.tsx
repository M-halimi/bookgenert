'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { BookEpisodes, LangCode } from '@/lib/groq';

type WritingStyle = 'Conversational' | 'Academic' | 'Professional' | 'Creative' | 'Simple';
type TargetAudience = 'General' | 'Students' | 'Professionals' | 'Beginners' | 'Experts' | 'Children';
type BookLength = 'Short (5-10 min)' | 'Standard (15-20 min)' | 'Long (25-35 min)';

const WRITING_STYLES: WritingStyle[] = ['Conversational', 'Academic', 'Professional', 'Creative', 'Simple'];
const TARGET_AUDIENCES: TargetAudience[] = ['General', 'Students', 'Professionals', 'Beginners', 'Experts', 'Children'];
const BOOK_LENGTHS: BookLength[] = ['Short (5-10 min)', 'Standard (15-20 min)', 'Long (25-35 min)'];
const CATEGORIES = ['Mindset', 'Business', 'Tech', 'Science', 'History', 'Philosophy', 'Fiction', 'Self-Help', 'Education'];

interface GenerationProgress {
  status: 'idle' | 'generating' | 'completed' | 'error';
  progress: number;
  message: string;
  estimatedTime?: string;
}

export default function WritePage() {
  const router = useRouter();
  const locale = useLocale();
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [style, setStyle] = useState<WritingStyle>('Conversational');
  const [audience, setAudience] = useState<TargetAudience>('General');
  const [length, setLength] = useState<BookLength>('Standard (15-20 min)');
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [result, setResult] = useState<BookEpisodes | null>(null);
  const [lang] = useState<LangCode>('en');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!topic.trim() || !title.trim()) return;

    setProgress({
      status: 'generating',
      progress: 5,
      message: 'Starting book generation...',
      estimatedTime: 'About 30-60 seconds',
    });

    try {
      // Simulate progressive updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.progress < 90) {
            const messages = [
              'Researching topic...',
              'Creating outline...',
              'Writing chapter 1...',
              'Writing chapter 2...',
              'Writing chapter 3...',
              'Writing chapter 4...',
              'Writing chapter 5...',
              'Writing chapter 6...',
              'Writing chapter 7...',
              'Writing chapter 8...',
              'Writing chapter 9...',
              'Writing chapter 10...',
              'Generating summaries...',
              'Creating premium summary...',
              'Finalizing book...',
            ];
            const msgIndex = Math.min(
              Math.floor((prev.progress + 5) / 7),
              messages.length - 1
            );
            return {
              ...prev,
              progress: Math.min(prev.progress + 7, 90),
              message: messages[msgIndex],
            };
          }
          return prev;
        });
      }, 3000);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: title.trim(),
          category,
          style,
          audience,
          length,
        }),
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(text ? `Server error: ${text.slice(0, 200)}` : 'Generation timed out. Try again.');
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate book');
      }

      const data: BookEpisodes = await res.json();

      setProgress({
        status: 'completed',
        progress: 100,
        message: 'Book generated successfully!',
      });

      setResult(data);
    } catch (err) {
      setProgress({
        status: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Failed to generate book',
      });
    }
  }

  function handleRetry() {
    setProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  }

  function handleViewBook() {
    if (result) {
      const slug = result.title?.en
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      router.push(`/book/${slug}?title=${encodeURIComponent(title)}&author=${encodeURIComponent(result.author || 'AI Generated')}&lang=${encodeURIComponent(locale)}`);
    }
  }

  if (result) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{result.title?.[lang] || title}</h1>
            <p className="text-zinc-400">by {result.author || 'AI Generated'}</p>
            {result.category && (
              <span className="inline-block mt-2 px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full">
                {result.category}
              </span>
            )}
          </div>

          {result.tagline?.[lang] && (
            <p className="text-zinc-500 text-center italic mb-8">{result.tagline[lang]}</p>
          )}

          {result.finalSummary?.[lang] && (
            <div className="mb-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'الملخص النهائي' : lang === 'fr' ? 'Résumé final' : 'Final Summary'}
              </h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.finalSummary[lang]}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              {lang === 'ar' ? 'الفصول' : lang === 'fr' ? 'Chapitres' : 'Chapters'}
            </h2>
            <div className="space-y-3">
              {result.episodes?.map((ep, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{ep.title?.[lang]}</h3>
                      {ep.summary?.[lang] && (
                        <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{ep.summary[lang]}</p>
                      )}
                      {ep.keyIdeas?.[lang] && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-purple-400">Key ideas:</span>
                          <span className="text-xs text-zinc-500 line-clamp-1">{ep.keyIdeas[lang]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.mainConcepts?.[lang] && (
            <div className="mb-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'المفاهيم الرئيسية' : lang === 'fr' ? 'Concepts principaux' : 'Main Concepts'}
              </h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.mainConcepts[lang]}
              </div>
            </div>
          )}

          {result.keyLessons && result.keyLessons.length > 0 && (
            <div className="mb-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'الدروس الرئيسية' : lang === 'fr' ? 'Leçons clés' : 'Key Lessons'}
              </h2>
              <ul className="space-y-2">
                {result.keyLessons.map((lesson, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{lesson[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.implementationGuide?.[lang] && (
            <div className="mb-8 p-6 bg-blue-900/20 border border-blue-700/30 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'دليل التنفيذ' : lang === 'fr' ? 'Guide de mise en œuvre' : 'Implementation Guide'}
              </h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.implementationGuide[lang]}
              </div>
            </div>
          )}

          {result.relatedBooks?.[lang] && (
            <div className="mb-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'كتب ذات صلة' : lang === 'fr' ? 'Livres connexes' : 'Related Books'}
              </h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.relatedBooks[lang]}
              </div>
            </div>
          )}

          {result.deepExplanation?.[lang] && (
            <div className="mb-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-3">
                {lang === 'ar' ? 'شرح معمق' : lang === 'fr' ? 'Explication approfondie' : 'Deep Explanation'}
              </h2>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.deepExplanation[lang]}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleViewBook}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-semibold transition-colors"
            >
              View Book Details
            </button>
            <button
              onClick={handleRetry}
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-lg font-semibold transition-colors"
            >
              Write Another Book
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Write a Book</h1>
          <p className="text-zinc-400 text-lg">
            Describe your book and AI will generate a complete, professional-quality book
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                Book Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g., The Psychology of Habit Formation"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors"
                required
                disabled={progress.status === 'generating'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                Book Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., The Habit Loop: How to Build Lasting Habits"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors"
                required
                disabled={progress.status === 'generating'}
              />
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                disabled={progress.status === 'generating'}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Writing Style</label>
              <select
                value={style}
                onChange={e => setStyle(e.target.value as WritingStyle)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                disabled={progress.status === 'generating'}
              >
                {WRITING_STYLES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Target Audience</label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value as TargetAudience)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                disabled={progress.status === 'generating'}
              >
                {TARGET_AUDIENCES.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Book Length</label>
              <select
                value={length}
                onChange={e => setLength(e.target.value as BookLength)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                disabled={progress.status === 'generating'}
              >
                {BOOK_LENGTHS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {progress.status === 'generating' && (
            <div className="p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-300 text-sm">{progress.message}</span>
                <span className="text-zinc-500 text-sm">{progress.progress}%</span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.estimatedTime && (
                <p className="text-zinc-500 text-xs">{progress.estimatedTime}</p>
              )}
            </div>
          )}

          {progress.status === 'error' && (
            <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
              <p className="text-red-400 text-sm mb-3">{progress.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={progress.status === 'generating' || !topic.trim() || !title.trim()}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl text-lg font-semibold transition-colors"
          >
            {progress.status === 'generating' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating Book...
              </span>
            ) : (
              'Generate Book'
            )}
          </button>
        </form>

        <div className="mt-12 p-6 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
          <h3 className="text-white font-semibold mb-3">What you&apos;ll get:</h3>
          <ul className="space-y-2 text-zinc-400 text-sm">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete 10-chapter book with rich content
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Premium summary with main concepts and key lessons
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Implementation guide and action plan
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Available in Arabic, French, and English
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Auto-saved to your library
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
