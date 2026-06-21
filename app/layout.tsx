import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LOCALE_DIRS } from '@/lib/i18n/config';
import { LangProvider } from '@/lib/i18n/lang-context';

export const metadata: Metadata = {
  title: 'BookFlix — Bite-Sized Reading',
  description:
    'Turn any book into 6 short, engaging episodes. Read smarter, not harder.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={LOCALE_DIRS[locale as keyof typeof LOCALE_DIRS]}>
      <head />
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LangProvider initialLang={locale}>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
          </LangProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
