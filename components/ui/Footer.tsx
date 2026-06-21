'use client';

import { useTranslations } from 'next-intl';
import { useLang } from '@/lib/i18n/lang-context';

const linkSections = [
  {
    key: 'product',
    label: { en: 'Product', ar: 'المنتج', fr: 'Produit', de: 'Produkt' },
    links: [
      { label: { en: 'Features', ar: 'المميزات', fr: 'Fonctionnalités', de: 'Funktionen' }, href: '#features' },
      { label: { en: 'Pricing', ar: 'التسعير', fr: 'Tarifs', de: 'Preise' }, href: '#pricing' },
    ],
  },
  {
    key: 'company',
    label: { en: 'Company', ar: 'الشركة', fr: 'Entreprise', de: 'Unternehmen' },
    links: [
      { label: { en: 'About', ar: 'حول', fr: 'À propos', de: 'Über uns' }, href: '#about' },
      { label: { en: 'Contact', ar: 'اتصل بنا', fr: 'Contact', de: 'Kontakt' }, href: '#contact' },
    ],
  },
  {
    key: 'resources',
    label: { en: 'Resources', ar: 'المصادر', fr: 'Ressources', de: 'Ressourcen' },
    links: [
      { label: { en: 'Blog', ar: 'المدونة', fr: 'Blog', de: 'Blog' }, href: '#blog' },
      { label: { en: 'Docs', ar: 'الوثائق', fr: 'Documentation', de: 'Dokumentation' }, href: '#docs' },
    ],
  },
  {
    key: 'legal',
    label: { en: 'Legal', ar: 'قانوني', fr: 'Juridique', de: 'Rechtliches' },
    links: [
      { label: { en: 'Privacy Policy', ar: 'سياسة الخصوصية', fr: 'Politique de confidentialité', de: 'Datenschutz' }, href: '#privacy' },
      { label: { en: 'Terms of Service', ar: 'شروط الخدمة', fr: "Conditions d'utilisation", de: 'Nutzungsbedingungen' }, href: '#terms' },
    ],
  },
];

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default function Footer() {
  const t = useTranslations();
  const { lang } = useLang();

  const l = (labels: Record<string, string>) => labels[lang] || labels.en;

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">
          <div className="col-span-2">
            <span className="text-xl font-bold tracking-tight text-white">
              BookFlix
            </span>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {linkSections.map((section) => (
            <div key={section.key}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-zinc-500">
                {l(section.label)}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label.en}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-400 transition-colors duration-200 hover:text-white"
                    >
                      {l(link.label)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800/60">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-xs text-zinc-600 order-3 sm:order-1">
              &copy; {new Date().getFullYear()} BookFlix. All rights reserved.
            </p>

            <a
              href="https://mohadev.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 order-2 transition-colors duration-200 hover:text-white"
            >
              Built with <span className="text-red-500">&hearts;</span> by Mohammed Halimi
            </a>

            <div className="flex items-center gap-3 order-1 sm:order-3">
              <a
                href="https://www.instagram.com/mohammed_halimi1/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors duration-200 hover:text-pink-500"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://github.com/M-halimi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors duration-200 hover:text-white"
                aria-label="GitHub"
              >
                <GitHubIcon />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors duration-200 hover:text-blue-400"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
