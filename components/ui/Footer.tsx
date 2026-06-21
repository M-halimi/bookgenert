'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4 text-center text-zinc-500 text-sm">
        <p className="mb-2">{t('footer.tagline')}</p>
        <p>
          {t('footer.made_with')} ❤️ {t('footer.by')}
        </p>
      </div>
    </footer>
  );
}
