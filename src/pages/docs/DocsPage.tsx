import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import changelog from '../../../CHANGELOG.md?raw';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseChangelog } from './model/parseChangelog';
import DocsContents from './ui/DocsContents';
import HelpSection from './ui/HelpSection';
import UpcomingSection from './ui/UpcomingSection';
import WhatsNewSection from './ui/WhatsNewSection';

const LANGUAGES = [
  { value: 'en', label: 'EN' },
  { value: 'ru', label: 'RU' },
] as const;

const DocsPage = () => {
  const { language, setLanguage, translations } = useLanguage();
  const { docs } = translations;
  const { hash } = useLocation();
  const releases = useMemo(() => parseChangelog(changelog), []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${docs.title} · Messenger`;
    return () => {
      document.title = previousTitle;
    };
  }, [docs.title]);

  // The page is lazy-loaded, so the browser cannot jump to /docs#section on its own.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [hash]);

  return (
    <div className="flex min-h-[100dvh] justify-center bg-gradient-to-br from-blue-100 to-white sm:px-4 sm:py-6">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-gray-950 sm:h-[calc(100dvh-3rem)] sm:max-w-xl sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-2xl">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/"
              aria-label={docs.backToApp}
              title={docs.backToApp}
              className="-ml-2 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <BookOpen className="h-5 w-5 shrink-0 text-gray-500" />
            <span className="truncate text-base font-semibold">{translations.docsLink}</span>
          </div>
          <div role="group" aria-label={translations.language} className="grid h-9 w-28 shrink-0 grid-cols-2 rounded-md border border-gray-200 bg-gray-100 p-1">
            {LANGUAGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={language === value}
                onClick={() => setLanguage(value)}
                className={`rounded px-3 text-xs font-medium transition-colors ${
                  language === value ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-gray-200 px-6 pb-5 pt-7 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-gray-950">{docs.title}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">{docs.subtitle}</p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <DocsContents docs={docs} />
            {docs.sections.map((section) => <HelpSection key={section.id} section={section} />)}
            {releases.length > 0 && <WhatsNewSection docs={docs} releases={releases} language={language} />}
            <UpcomingSection docs={docs} comingSoon={translations.comingSoon} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsPage;
