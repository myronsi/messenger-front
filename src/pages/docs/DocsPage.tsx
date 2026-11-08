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

const DocsPage = ({ onClose }: { onClose?: () => void }) => {
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
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return; // malformed fragment such as /docs#%
    }
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [hash]);

  return (
    <div className={`flex justify-center sm:px-4 sm:py-6 ${onClose ? 'h-full bg-black/40' : 'min-h-[100dvh] bg-gradient-to-br from-primary/10 to-background'}`}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className={`flex w-full flex-col overflow-hidden bg-card text-foreground sm:max-w-xl sm:rounded-lg sm:border sm:border-border sm:shadow-2xl ${onClose ? 'h-full' : 'h-[100dvh] sm:h-[calc(100dvh-3rem)]'}`}>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-2">
            {onClose ? <button type="button" onClick={onClose} aria-label={docs.backToApp} title={docs.backToApp}
              className="-ml-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button> : <Link
              to="/"
              aria-label={docs.backToApp}
              title={docs.backToApp}
              className="-ml-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>}
            <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="truncate text-base font-semibold">{translations.docsLink}</span>
          </div>
          <div role="group" aria-label={translations.language} className="grid h-9 w-28 shrink-0 grid-cols-2 rounded-md border border-border bg-muted p-1">
            {LANGUAGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={language === value}
                onClick={() => setLanguage(value)}
                className={`rounded px-3 text-xs font-medium transition-colors ${
                  language === value ? 'bg-background text-foreground shadow-sm' : 'text-subtle-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-border px-6 pb-5 pt-7 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-foreground">{docs.title}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-subtle-foreground">{docs.subtitle}</p>
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
