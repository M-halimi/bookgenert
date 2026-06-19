import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-red-600">
          BookFlix
        </Link>
        <div className="flex gap-6">
          <Link href="/" className="text-zinc-300 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/explore" className="text-zinc-300 hover:text-white transition-colors">
            Explore
          </Link>
          <Link href="/write" className="text-zinc-300 hover:text-white transition-colors">
            Write
          </Link>
          <Link href="/analytics" className="text-zinc-300 hover:text-white transition-colors">
            Analytics
          </Link>
        </div>
      </div>
    </nav>
  );
}
