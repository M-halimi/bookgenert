import 'server-only';
import { type Locale, DEFAULT_LOCALE, LOCALES, resolveLocale, COOKIE_NAME } from './config';

type LocaleMessages = Record<string, Record<string, string> | string>;
type MessagesCache = Record<string, LocaleMessages>;

const cache: MessagesCache = {};

function parseCookies(cookieHeader?: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key && value) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function getLocaleFromCookies(cookieHeader?: string | null): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const cookies = parseCookies(cookieHeader);
  const lang = cookies[COOKIE_NAME];
  if (lang && LOCALES.includes(lang as Locale)) return lang as Locale;
  return DEFAULT_LOCALE;
}

export function getLocaleFromHeaders(headers?: Headers | Record<string, string | string[] | undefined>): Locale {
  if (!headers) return DEFAULT_LOCALE;
  const getHeader = (key: string): string | undefined => {
    if (typeof headers.get === 'function') return (headers as Headers).get(key) ?? undefined;
    const h = headers as Record<string, string | string[] | undefined>;
    const val = h[key];
    return Array.isArray(val) ? val[0] : val;
  };
  const cookie = getHeader('cookie');
  return getLocaleFromCookies(cookie);
}

export async function getTranslations(locale: Locale): Promise<(key: string, fallback?: string) => string> {
  const messages = await loadMessages(locale);
  return (key: string, fallback?: string): string => {
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
  };
}

async function loadMessages(locale: Locale): Promise<LocaleMessages> {
  if (cache[locale]) return cache[locale];
  try {
    const mod = await import(`../../locales/${locale}.json`);
    const messages = mod.default ?? mod;
    cache[locale] = messages;
    return messages;
  } catch {
    if (locale !== DEFAULT_LOCALE) return loadMessages(DEFAULT_LOCALE);
    cache[DEFAULT_LOCALE] = {};
    return {};
  }
}

export { resolveLocale, DEFAULT_LOCALE, LOCALES };
export type { Locale };
