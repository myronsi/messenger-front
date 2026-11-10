import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

const Probe = () => {
  const { language, setLanguage } = useLanguage();
  return <button type="button" onClick={() => setLanguage('ru')}>{language}</button>;
};

describe('LanguageProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('detects the browser language without saving it', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES', 'en-US']);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('es');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem('language')).toBeNull();
  });

  it('falls back to English for unsupported browser languages', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['xx-XX']);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('en');
  });

  it('saves the language only when the user picks one', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('ru');
    expect(localStorage.getItem('language')).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
  });
});
