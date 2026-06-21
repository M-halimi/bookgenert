import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? routing.defaultLocale;

  try {
    const messages = (await import(`../../locales/${locale}.json`)).default;
    return { locale, messages };
  } catch {
    const messages = (await import(`../../locales/${routing.defaultLocale}.json`)).default;
    return { locale: routing.defaultLocale, messages };
  }
});
