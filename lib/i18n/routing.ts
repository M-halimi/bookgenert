import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'fr', 'en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: true,
});
