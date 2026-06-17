import SearchBar from '@/components/ui/SearchBar';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-950">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          Read <span className="text-red-600">Smarter</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-md mx-auto">
          Turn any book into 6 bite-sized episodes. Read in minutes, retain for
          life.
        </p>
      </div>
      <SearchBar />
      <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg text-center">
        <div>
          <p className="text-2xl font-bold text-white">Search</p>
          <p className="text-zinc-500 text-sm mt-1">Pick any book or topic</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">Generate</p>
          <p className="text-zinc-500 text-sm mt-1">AI creates 6 episodes</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">Read</p>
          <p className="text-zinc-500 text-sm mt-1">3-5 min per episode</p>
        </div>
      </div>
    </main>
  );
}
