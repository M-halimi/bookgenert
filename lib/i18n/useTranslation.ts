'use client';

import { useCallback, useEffect, useState } from 'react';
import { type Locale, DEFAULT_LOCALE, resolveLocale, COOKIE_NAME, LOCALES } from './config';

type LocaleMessages = Record<string, Record<string, string> | string>;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function getStoredLocale(): Locale {
  const fromCookie = getCookie(COOKIE_NAME);
  if (fromCookie) return resolveLocale(fromCookie);
  const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem(COOKIE_NAME) : null;
  if (fromStorage) return resolveLocale(fromStorage);
  return DEFAULT_LOCALE;
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<LocaleMessages | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    loadLocale(stored).then(setMessages).finally(() => setLoaded(true));
  }, []);

  const switchTo = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setCookie(COOKIE_NAME, newLocale);
    try { localStorage.setItem(COOKIE_NAME, newLocale); } catch { /* noop */ }
    loadLocale(newLocale).then(setMessages);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (!messages) return fallback ?? key;
      const parts = key.split('.');
      let current: Record<string, unknown> | string | undefined = messages as Record<string, unknown>;
      for (const part of parts) {
        if (typeof current === 'object' && current !== null && part in current) {
          current = current[part] as Record<string, unknown> | string;
        } else {
          return fallback ?? key;
        }
      }
      return typeof current === 'string' ? current : (fallback ?? key);
    },
    [messages],
  );

  return { locale, switchTo, t, loaded };
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setCookie(COOKIE_NAME, newLocale);
    try { localStorage.setItem(COOKIE_NAME, newLocale); } catch { /* noop */ }
  }, []);

  return { locale, setLocale };
}

async function loadLocale(locale: Locale): Promise<LocaleMessages> {
  try {
    const mod = await import(`../../locales/${locale}.json`);
    return mod.default ?? mod;
  } catch {
    if (locale !== DEFAULT_LOCALE) return loadLocale(DEFAULT_LOCALE);
    return {};
  }
}

export function getLocalizedValue(
  field: Record<string, string> | string | null | undefined,
  lang: Locale,
  fallbackLang: Locale = DEFAULT_LOCALE,
): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    if (field[lang] && field[lang].trim()) return field[lang];
    if (field[fallbackLang] && field[fallbackLang].trim()) return field[fallbackLang];
    for (const l of LOCALES) {
      if (field[l] && field[l].trim()) return field[l];
    }
    return null;
  }
  return null;
}
