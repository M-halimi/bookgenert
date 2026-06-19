'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/stats?timeframe=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Use empty stats on error
    } finally {
      setLoading(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-800 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Books Generated"
            value={stats?.totalBooks ?? 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            color="blue"
          />
          <MetricCard
            title="Cache Hits"
            value={stats?.cacheHits ?? 0}
            subtitle={`Saved ~${stats?.cacheSavings?.toFixed(1) ?? 0} AI calls`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            color="green"
          />
          <MetricCard
            title="Avg Generation Time"
            value={stats?.avgGenerationTime ? formatTime(stats.avgGenerationTime) : '0ms'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="purple"
          />
          <MetricCard
            title="Total Chapters"
            value={stats?.totalChapters ?? 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="yellow"
          />
        </div>

        {/* Provider Metrics */}
        {stats?.providerMetrics && stats.providerMetrics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">AI Provider Usage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {stats.providerMetrics.map((pm) => (
                <div
                  key={pm.provider}
                  className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      pm.successRate >= 80 ? 'bg-green-500' :
                      pm.successRate >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
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
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Avg Latency</span>
                      <span className="text-zinc-200">{pm.avgLatency}ms</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${
                          pm.successRate >= 80 ? 'bg-green-500' :
                          pm.successRate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${pm.successRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-zinc-500">Success rate</span>
                      <span className="text-zinc-400">{pm.successRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Categories */}
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
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">No data yet</p>
            )}
          </div>

          {/* Most Viewed Books */}
          <div className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-4">Most Viewed Books</h2>
            {stats?.topBooks && stats.topBooks.length > 0 ? (
              <div className="space-y-3">
                {stats.topBooks.map((book, i) => (
                  <Link
                    key={i}
                    href={`/book/${book.slug}?title=${encodeURIComponent(book.title)}`}
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

        {/* Recent Activity */}
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
                      event.eventType === 'book_written' ? 'bg-purple-500' :
                      'bg-zinc-500'
                    }`} />
                    <span className="text-zinc-300 text-sm capitalize whitespace-nowrap">
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                    {event.book && event.bookSlug && (
                      <Link
                        href={`/book/${event.bookSlug}?title=${encodeURIComponent(event.book)}`}
                        className="text-zinc-400 text-sm truncate hover:text-red-400 transition-colors"
                      >
                        — {event.book}
                      </Link>
                    )}
                    {event.book && !event.bookSlug && (
                      <span className="text-zinc-500 text-sm truncate">— {event.book}</span>
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

        {/* AI Cost Savings Summary */}
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
                  By reusing {stats?.cacheHits ?? 0} cached books, you saved approximately{' '}
                  <strong className="text-green-300">
                    ${((stats?.cacheSavings ?? 0) * 0.01).toFixed(2)}
                  </strong>{' '}
                  in AI API costs.
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
                  The system automatically switched providers{' '}
                  <strong className="text-yellow-300">{stats?.fallbackCount ?? 0} times</strong>{' '}
                  due to failures or rate limits, ensuring uninterrupted service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
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
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
