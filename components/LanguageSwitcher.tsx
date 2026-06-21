'use client';

import { useRouter } from 'next/navigation';
import { LOCALE_LABELS } from '@/lib/i18n/config';
import { routing } from '@/lib/i18n/routing';
import { useLang } from '@/lib/i18n/lang-context';
import { useState, useRef, useEffect } from 'react';

const FLAGS: Record<string, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  fr: '\u{1F1EB}\u{1F1F7}',
  ar: '\u{1F1F8}\u{1F1E6}',
  de: '\u{1F1E9}\u{1F1EA}',
};

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchLocale(next: string) {
    const code = next as 'en' | 'fr' | 'ar' | 'de';
    setLang(code);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative" dir="ltr">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
        aria-label="Switch language"
      >
        <span>{FLAGS[lang] || ''}</span>
        <span>{lang.toUpperCase()}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
          {routing.locales.map((localeCode) => (
            <button
              key={localeCode}
              onClick={() => switchLocale(localeCode)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors ${
                lang === localeCode
                  ? 'bg-red-600/20 text-red-400'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
              aria-label={`Switch to ${LOCALE_LABELS[localeCode]}`}
            >
              <span>{FLAGS[localeCode]}</span>
              <span>{LOCALE_LABELS[localeCode]}</span>
              {lang === localeCode && (
                <svg className="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
