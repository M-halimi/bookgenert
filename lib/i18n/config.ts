export type Locale = 'en' | 'fr' | 'ar' | 'de';

export const LOCALES: Locale[] = ['en', 'fr', 'ar', 'de'];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  de: 'Deutsch',
};

export const LOCALE_DIRS: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  fr: 'ltr',
  ar: 'rtl',
  de: 'ltr',
};

export function isLocale(lang: string): lang is Locale {
  return LOCALES.includes(lang as Locale);
}

export function resolveLocale(lang?: string | null): Locale {
  if (lang && isLocale(lang)) return lang;
  return DEFAULT_LOCALE;
}

export const COOKIE_NAME = 'bookflix_lang';
