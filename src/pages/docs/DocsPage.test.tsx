import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import DocsPage from './DocsPage';

const renderDocs = (path = '/docs') => render(
  <LanguageProvider>
    <MemoryRouter initialEntries={[path]}>
      <DocsPage />
    </MemoryRouter>
  </LanguageProvider>,
);

describe('DocsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders every help section and the upcoming features in the selected language', () => {
    localStorage.setItem('language', 'en');
    renderDocs();

    expect(screen.getByRole('heading', { level: 1, name: en.docs.title })).toBeInTheDocument();
    for (const section of en.docs.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.title })).toBeInTheDocument();
      expect(within(screen.getByRole('navigation')).getByRole('link', { name: new RegExp(section.title) })).toHaveAttribute('href', `#${section.id}`);
    }
    for (const item of en.docs.upcoming) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: en.docs.backToApp })).toHaveAttribute('href', '/');
  });

  it('shows the latest releases from the changelog', () => {
    localStorage.setItem('language', 'en');
    renderDocs();
    const whatsNew = screen.getByRole('region', { name: en.docs.whatsNewTitle });
    expect(within(whatsNew).getAllByRole('heading', { level: 3 })[0]).toHaveTextContent(/^Version \d+\.\d+\.\d+/);
  });

  it('switches the language from the header', async () => {
    localStorage.setItem('language', 'en');
    renderDocs();
    await userEvent.click(screen.getByRole('button', { name: 'RU' }));
    expect(screen.getByRole('heading', { level: 1, name: ru.docs.title })).toBeInTheDocument();
  });

  it('defaults to Russian like the rest of the app', () => {
    renderDocs();
    expect(screen.getByRole('heading', { level: 1, name: ru.docs.title })).toBeInTheDocument();
  });

  it('ignores a malformed anchor instead of crashing', () => {
    localStorage.setItem('language', 'en');
    renderDocs('/docs#%');
    expect(screen.getByRole('heading', { level: 1, name: en.docs.title })).toBeInTheDocument();
  });

  it('keeps the same sections in both languages', () => {
    expect(ru.docs.sections.map((section) => section.id)).toEqual(en.docs.sections.map((section) => section.id));
    expect(ru.docs.upcoming.map((item) => item.id)).toEqual(en.docs.upcoming.map((item) => item.id));
  });
});
