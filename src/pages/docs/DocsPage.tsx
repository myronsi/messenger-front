import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const DocsPage = () => {
  const { language, setLanguage, translations } = useLanguage();
  const { docs } = translations;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${docs.title} · Messenger`;
    return () => {
      document.title = previousTitle;
    };
  }, [docs.title]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {docs.backToApp}
          </Link>
          <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'ru')}>
            <SelectTrigger className="w-36" aria-label={translations.language}>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 opacity-70" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{docs.title}</h1>
          <p className="text-gray-600">{docs.subtitle}</p>
        </div>

        <nav aria-label={docs.contents} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">{docs.contents}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {docs.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-sm text-blue-600 hover:underline">{section.title}</a>
              </li>
            ))}
            <li>
              <a href="#upcoming" className="text-sm text-blue-600 hover:underline">{docs.upcomingTitle}</a>
            </li>
          </ul>
        </nav>

        {docs.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">{section.title}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
              {section.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        ))}

        <section id="upcoming" className="scroll-mt-20 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {docs.upcomingTitle}
          </h2>
          <p className="mb-3 text-sm text-gray-600">{docs.upcomingIntro}</p>
          <ul className="space-y-3">
            {docs.upcoming.map((item) => (
              <li key={item.title} className="rounded-md bg-white p-3">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
