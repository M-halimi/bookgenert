'use client';

const CATEGORIES = [
  'All',
  'Mindset',
  'Business',
  'Tech',
  'Science',
  'History',
  'Philosophy',
];

export default function FilterChips({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === cat
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
