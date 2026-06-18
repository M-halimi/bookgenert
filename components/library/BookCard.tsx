import Link from 'next/link';
import { MOODS, MOOD_COLORS, MOOD_SCORE_THRESHOLD, type ScoredMood } from '@/lib/moods';
import BookCover from '@/components/ui/BookCover';

export default function BookCard({
  slug,
  title,
  author,
  category,
  coverUrl,
  tagline,
  moods,
}: {
  slug: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string | null;
  tagline?: string;
  moods?: ScoredMood[];
}) {
  const displayMoods = (moods ?? []).filter(m => m.score > MOOD_SCORE_THRESHOLD);

  return (
    <Link
      href={`/book/${slug}?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&cover=${encodeURIComponent(coverUrl || '')}`}
      className="group block"
    >
      <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden mb-3 relative">
        <BookCover slug={slug} title={title} coverUrl={coverUrl || null} />
        {displayMoods.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {displayMoods.slice(0, 2).map((sm) => {
              const mood = MOODS.find((m) => m.id === sm.mood);
              if (!mood) return null;
              return (
                <span
                  key={sm.mood}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${MOOD_COLORS[mood.color]} backdrop-blur-sm`}
                >
                  {mood.emoji} {mood.label}
                </span>
              );
            })}
            {displayMoods.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900/80 text-zinc-400 border border-zinc-700 backdrop-blur-sm">
                +{displayMoods.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      <h3 className="font-semibold text-white group-hover:text-red-500 transition-colors truncate">
        {title}
      </h3>
      <p className="text-zinc-400 text-sm truncate">{author}</p>
      {tagline && (
        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{tagline}</p>
      )}
      <span className="inline-block mt-2 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded">
        {category}
      </span>
    </Link>
  );
}
