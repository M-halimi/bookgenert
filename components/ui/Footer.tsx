'use client';

import { useEffect, useState } from 'react';
export default function Footer() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? scrollTop / docHeight : 0);
      setShowBackToTop(scrollTop > 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const circumference = 2 * Math.PI * 14;

  return (
    <>
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center transition-all duration-300 ${
          showBackToTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <svg className="absolute inset-0 w-10 h-10 -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="20"
            cy="20"
            r="14"
            fill="none"
            stroke="url(#scrollProgress)"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - scrollProgress)}
            strokeLinecap="round"
            className="transition-all duration-150"
          />
          <defs>
            <linearGradient id="scrollProgress" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <svg
          className="w-3.5 h-3.5 text-zinc-400 relative z-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      <footer className="bg-zinc-950 border-t border-zinc-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} BookFlix.
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://mohadev.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-red-400 transition-colors"
              aria-label="Portfolio"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </a>
            <a
              href="https://instagram.com/mo7alimi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-red-400 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth={2} />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth={2} />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth={2} />
              </svg>
            </a>
          </div>
          <div className="text-xs text-zinc-500 text-center sm:text-right">
            Built by{' '}
            <a
              href="https://mohadev.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-red-400 transition-colors"
            >
              Mohammed Halimi
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
