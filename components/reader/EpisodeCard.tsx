export default function EpisodeCard({
  number,
  title,
  status,
  subtitle,
}: {
  number: number;
  title: string;
  status: 'locked' | 'current' | 'done';
  subtitle?: string;
}) {
  const statusStyles = {
    locked: 'border-zinc-800 opacity-50',
    current: 'border-red-600 bg-red-600/10',
    done: 'border-green-600 bg-green-600/10',
  };

  const statusIcons = {
    locked: (
      <svg
        className="w-5 h-5 text-zinc-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    current: (
      <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    done: (
      <svg
        className="w-5 h-5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border ${statusStyles[status]}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-500">Chapter {number}</p>
        <p
          className={`font-medium truncate ${
            status === 'locked' ? 'text-zinc-600' : 'text-white'
          }`}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex-shrink-0">{statusIcons[status]}</div>
    </div>
  );
}
