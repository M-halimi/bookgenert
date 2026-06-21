'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LangCode } from '@/lib/groq';
import { ALL_LANGS } from '@/lib/groq';
import { LOCALE_DIRS } from '@/lib/i18n/config';

const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 31536000;

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function resolveLang(val: string | null | undefined): LangCode {
  if (val && (ALL_LANGS as readonly string[]).includes(val)) return val as LangCode;
  return 'en';
}

interface LangContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
});

export function LangProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: string;
}) {
  const [lang, setLangState] = useState<LangCode>(resolveLang(initialLang));

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    setCookie(NEXT_LOCALE_COOKIE, next);
    document.documentElement.lang = next;
    document.documentElement.dir = LOCALE_DIRS[next as keyof typeof LOCALE_DIRS] || 'ltr';
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
