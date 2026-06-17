import Link from 'next/link';

export default function BookCard({
  slug,
  title,
  author,
  category,
  coverUrl,
  tagline,
}: {
  slug: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string | null;
  tagline?: string;
}) {
  return (
    <Link
      href={`/book/${slug}?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&cover=${encodeURIComponent(coverUrl || '')}`}
      className="group block"
    >
      <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden mb-3">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
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
