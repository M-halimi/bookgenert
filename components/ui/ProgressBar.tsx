'use client';

export default function ProgressBar({
  completed,
  total = 6,
}: {
  completed: number;
  total?: number;
}) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-zinc-400 mb-1">
        <span>Progress</span>
        <span>
          {completed} / {total} episodes
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
