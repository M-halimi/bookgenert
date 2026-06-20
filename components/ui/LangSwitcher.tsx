import type { LangCode } from '@/lib/groq';

const LANG_LABELS: Record<LangCode, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
};

export default function LangSwitcher({
  value,
  onChange,
}: {
  value: LangCode;
  onChange: (lang: LangCode) => void;
}) {
  const langs: LangCode[] = ['ar', 'fr', 'en', 'de'];

  return (
    <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-fit">
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === lang
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {LANG_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
