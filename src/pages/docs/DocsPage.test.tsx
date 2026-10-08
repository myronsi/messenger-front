import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import DocsPage from './DocsPage';

const renderDocs = () => render(
  <LanguageProvider>
    <MemoryRouter initialEntries={['/docs']}>
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
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute('href', `#${section.id}`);
    }
    for (const item of en.docs.upcoming) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: en.docs.backToApp })).toHaveAttribute('href', '/');
  });

  it('defaults to Russian like the rest of the app', () => {
    renderDocs();
    expect(screen.getByRole('heading', { level: 1, name: ru.docs.title })).toBeInTheDocument();
  });

  it('keeps the same sections in both languages', () => {
    expect(ru.docs.sections.map((section) => section.id)).toEqual(en.docs.sections.map((section) => section.id));
    expect(ru.docs.upcoming).toHaveLength(en.docs.upcoming.length);
  });
});
