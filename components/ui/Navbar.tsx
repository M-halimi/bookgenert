'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Navbar() {
  const t = useTranslations();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-red-600">
          BookFlix
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-zinc-300 hover:text-white transition-colors">
            {t('nav.home')}
          </Link>
          <Link href="/explore" className="text-zinc-300 hover:text-white transition-colors">
            {t('nav.explore')}
          </Link>
          <Link href="/write" className="text-zinc-300 hover:text-white transition-colors">
            {t('nav.write')}
          </Link>
          <Link href="/analytics" className="text-zinc-300 hover:text-white transition-colors">
            {t('nav.analytics')}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
