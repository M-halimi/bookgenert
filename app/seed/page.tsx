'use client';

import { useState, useEffect } from 'react';
import type { SeedResult } from '@/lib/seed/types';

export default function SeedPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('seed_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const runSeed = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setStep('Fetching books from APIs...');

    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
        sessionStorage.setItem('seed_api_key', apiKey);
      }

      const res = await fetch('/api/seed/books?source=all', { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Seed failed');
      }

      const data: SeedResult = await res.json();
      setStep('Storing books in library...');
      setResult(data);

      let library: Record<string, unknown>[] = [];
      try {
        library = JSON.parse(localStorage.getItem('bookflix_library') || '[]');
      } catch (err) {
        console.error('[Seed] Failed to parse library cache:', err);
        library = [];
      }
      const existingSlugs = new Set(library.map((b) => b.slug));

      let added = 0;
      for (const book of data.books) {
        if (!existingSlugs.has(book.id)) {
          library.push({
            slug: book.id,
            title: book.title,
            author: book.author,
            category: book.category,
            tagline: `${book.title} — ${book.category}`,
            coverUrl: book.coverUrl || '',
          });
          added++;
        }
      }

      localStorage.setItem('bookflix_library', JSON.stringify(library));
      setStep(`Added ${added} new books to library (${library.length} total)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Book Seed</h1>
        <p className="text-zinc-400 mb-8">
          Fetch books from Google Books and Open Library APIs to populate your library.
          No AI generation involved.
        </p>

        <div className="mb-6">
          <input
            type="password"
            placeholder="API Secret Key (optional in dev)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={runSeed}
          disabled={loading}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl text-lg font-semibold transition-colors"
        >
          {loading ? 'Seeding...' : 'Start Seed'}
        </button>

        {step && (
          <p className="text-zinc-400 mt-4">{step}</p>
        )}

        {error && (
          <p className="text-red-500 mt-4">{error}</p>
        )}

        {result && (
          <div className="mt-8 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl text-left">
            <h2 className="text-xl font-bold text-white mb-4">Seed Results</h2>
            <dl className="space-y-2 text-zinc-300">
              <div className="flex justify-between">
                <dt>Total books</dt>
                <dd className="text-white font-mono">{result.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Google Books</dt>
                <dd className="text-white font-mono">{result.googleBooks}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Open Library</dt>
                <dd className="text-white font-mono">{result.openLibrary}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Duplicates removed</dt>
                <dd className="text-white font-mono">{result.duplicatesRemoved}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
