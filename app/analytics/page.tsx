'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SavedBook {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  coverUrl: string | null;
  category: string | null;
  language: string | null;
  author: string;
  source: string;
  generatedAt: string;
}

interface ProviderMetric {
  provider: string;
  totalCalls: number;
  successes: number;
  failures: number;
  avgLatency: number;
  successRate: number;
}

interface DashboardStats {
  totalBooks: number;
  totalChapters: number;
  cacheHits: number;
  cacheSavings: number;
  totalGenerations: number;
  avgGenerationTime: number;
  providerMetrics: ProviderMetric[];
  fallbackCount: number;
  topCategories: { category: string; count: number }[];
  topBooks: { title: string; views: number; slug: string }[];
  recentActivity: { eventType: string; createdAt: string; book?: string; bookSlug?: string }[];
  generationTrend: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'analytics' | 'saved'>('saved');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStats(), fetchSavedBooks()]);
      setLoading(false);
    }
    loadData();
  }, [timeframe]);

  async function fetchStats() {
    try {
      const res = await fetch(`/api/analytics/stats?timeframe=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('[Analytics] Failed to fetch stats:', err);
    }
  }

  async function fetchSavedBooks() {
    try {
      const res = await fetch('/api/books/library?limit=200');
      if (res.ok) {
        const data = await res.json();
        setSavedBooks(data.books || []);
      }
    } catch (err) {
      console.error('[Analytics] Failed to fetch saved books:', err);
    }
  }

  function formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const langLabels: Record<string, string> = {
    ar: 'العربية',
    fr: 'Français',
    en: 'English',
    de: 'Deutsch',
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-800 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-800 rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
      <div className="max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-4">
          <button
            onClick={() => setTab('saved')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'saved' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Saved Books ({savedBooks.length})
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'analytics' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Analytics Dashboard
          </button>
        </div>

        {tab === 'saved' ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Saved Books</h1>
                <p className="text-zinc-400 mt-1">
                  {savedBooks.length} book{savedBooks.length !== 1 ? 's' : ''} generated and saved
                </p>
              </div>
            </div>

            {savedBooks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-500 text-lg mb-2">No books generated yet</p>
                <p className="text-zinc-600 text-sm">
                  Generate your first book from the{' '}
                  <Link href="/explore" className="text-red-400 hover:text-red-300">
                    Explore
                  </Link>{' '}
                  page
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {savedBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.slug}`}
                    className="flex items-center gap-4 p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl hover:bg-zinc-800/60 hover:border-zinc-600 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-lg font-bold">
                        {book.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate group-hover:text-red-400 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-zinc-500 text-sm truncate">
                        {book.author} · {book.category || 'General'}
                      </p>
                      {book.description && (
                        <p className="text-zinc-600 text-xs truncate mt-0.5">
                          {book.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                        {langLabels[book.language || 'en'] || book.language || 'en'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {formatDate(book.generatedAt)}
                      </span>
                      <svg
                        className="w-5 h-5 text-zinc-600 group-hover:text-red-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-zinc-400 mt-1">Track your AI book generation performance</p>
              </div>
              <div className="flex gap-2">
                {(['7d', '30d', 'all'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeframe === t
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <MetricCard title="Books Generated" value={stats?.totalBooks ?? 0} color="blue" />
              <MetricCard title="Cache Hits" value={stats?.cacheHits ?? 0} color="green" />
              <MetricCard
                title="Avg Generation Time"
                value={stats?.avgGenerationTime ? formatTime(stats.avgGenerationTime) : '0ms'}
                color="purple"
              />
              <MetricCard title="Total Chapters" value={stats?.totalChapters ?? 0} color="yellow" />
            </div>

            {stats?.providerMetrics && stats.providerMetrics.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white mb-4">AI Provider Usage</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {stats.providerMetrics.map((pm) => (
                    <div key={pm.provider} className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          pm.successRate >= 80 ? 'bg-green-500' :
                          pm.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-white font-semibold capitalize">{pm.provider}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Calls</span>
                          <span className="text-zinc-200">{pm.totalCalls}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Success</span>
                          <span className="text-green-400">{pm.successes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Failed</span>
                          <span className="text-red-400">{pm.failures}</span>
                        </div>
                        <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full ${
                              pm.successRate >= 80 ? 'bg-green-500' :
                              pm.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${pm.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                <h2 className="text-lg font-bold text-white mb-4">Top Categories</h2>
                {stats?.topCategories && stats.topCategories.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topCategories.map((cat) => {
                      const maxCount = Math.max(...stats.topCategories.map(c => c.count));
                      const pct = (cat.count / maxCount) * 100;
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-300">{cat.category}</span>
                            <span className="text-zinc-500">{cat.count} books</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div className="bg-red-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No data yet</p>
                )}
              </div>

              <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                <h2 className="text-lg font-bold text-white mb-4">Most Viewed Books</h2>
                {stats?.topBooks && stats.topBooks.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topBooks.map((book, i) => (
                      <Link
                        key={i}
                        href={`/book/${book.slug}`}
                        className="flex items-center justify-between group rounded-lg hover:bg-zinc-700/30 px-2 py-1 -mx-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 text-sm w-6">{i + 1}.</span>
                          <span className="text-zinc-300 text-sm truncate max-w-[200px] group-hover:text-red-400 transition-colors">
                            {book.title}
                          </span>
                        </div>
                        <span className="text-zinc-500 text-sm">{book.views} views</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No data yet</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl mb-8">
              <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActivity.slice(0, 10).map((event, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-700/30 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          event.eventType === 'book_generated' ? 'bg-green-500' :
                          event.eventType === 'book_cache_hit' ? 'bg-blue-500' :
                          event.eventType === 'book_written' ? 'bg-purple-500' : 'bg-zinc-500'
                        }`} />
                        <span className="text-zinc-300 text-sm capitalize whitespace-nowrap">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        {event.book && (
                          <Link
                            href={`/book/${event.bookSlug || event.book.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)}`}
                            className="text-zinc-400 text-sm truncate hover:text-red-400 transition-colors"
                          >
                            — {event.book}
                          </Link>
                        )}
                      </div>
                      <span className="text-zinc-500 text-xs flex-shrink-0 ml-2">{formatDate(event.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">No activity yet. Generate some books to see analytics.</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-green-900/20 border border-green-700/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-green-400 font-semibold">AI Cost Savings</h3>
                    <p className="text-green-300/70 text-sm">
                      By reusing {stats?.cacheHits ?? 0} cached books, saved approximately{' '}
                      <strong className="text-green-300">${((stats?.cacheSavings ?? 0) * 0.01).toFixed(2)}</strong> in AI API costs.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-yellow-400 font-semibold">Provider Fallbacks</h3>
                    <p className="text-yellow-300/70 text-sm">
                      System switched providers <strong className="text-yellow-300">{stats?.fallbackCount ?? 0} times</strong> due to failures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
  };

  return (
    <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400 text-sm">{title}</span>
        <div className={`w-10 h-10 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
