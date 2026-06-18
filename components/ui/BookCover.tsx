'use client';

import { useState } from 'react';
import { KNOWN_COVERS, getGradientPlaceholder, getFirstLetters, getCachedCover } from '@/lib/cover-resolver';

export default function BookCover({
  slug,
  title,
  coverUrl,
}: {
  slug: string;
  title: string;
  coverUrl: string | null;
}) {
  const resolvedUrl = coverUrl || getCachedCover(slug) || KNOWN_COVERS[slug] || null;
  const [error, setError] = useState(false);

  if (resolvedUrl && !error) {
    return (
      <img
        src={resolvedUrl}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={() => setError(true)}
      />
    );
  }

  const gradient = getGradientPlaceholder(title);
  const letters = getFirstLetters(title);

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-3xl font-bold text-white/80 select-none">
        {letters}
      </span>
    </div>
  );
}
