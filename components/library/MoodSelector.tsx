'use client';

import { MOODS, MOOD_COLORS, type MoodId } from '@/lib/moods';

export default function MoodSelector({
  activeMood,
  onMoodChange,
}: {
  activeMood: MoodId | null;
  onMoodChange: (mood: MoodId | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onMoodChange(null)}
        className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
          activeMood === null
            ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        All Moods
      </button>
      {MOODS.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodChange(activeMood === mood.id ? null : mood.id)}
          className={`px-3 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${
            activeMood === mood.id
              ? MOOD_COLORS[mood.color] + ' shadow-lg'
              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          }`}
        >
          <span className="mr-1">{mood.emoji}</span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}
