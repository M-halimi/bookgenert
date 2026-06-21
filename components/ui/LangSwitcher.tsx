'use client';

import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';

interface Props {
  value: Locale;
  onChange: (lang: Locale) => void;
}

export default function LangSwitcher({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-fit" dir="ltr">
      {LOCALES.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === lang
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
          aria-label={`Switch to ${LOCALE_LABELS[lang]}`}
        >
          {LOCALE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
