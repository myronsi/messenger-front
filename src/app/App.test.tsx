import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { en } from '@/shared/lang/en';
import { AppRoutes } from './App';

const mocks = vi.hoisted(() => ({ leaveFor: vi.fn() }));

vi.mock('./SessionEntry', () => ({ SessionEntry: () => <div data-testid="session-entry" /> }));
vi.mock('@/shared/lib/helpSite', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/lib/helpSite')>(),
  leaveFor: mocks.leaveFor,
}));

const setup = (path: string) => render(<LanguageProvider>
  <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
</LanguageProvider>);

beforeEach(() => {
  localStorage.setItem('language', 'en');
  mocks.leaveFor.mockReset();
});

it.each(['/docs', '/docs#security', '/docs/settings'])('sends the old in-app help link %s to the help site', (path) => {
  setup(path);
  expect(mocks.leaveFor).toHaveBeenCalledWith('https://docs.messenger.viserix.com/');
  expect(screen.getByRole('link', { name: en.legal.help })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/');
  expect(screen.queryByTestId('session-entry')).not.toBeInTheDocument();
});

it('has no in-app help page any more', () => {
  expect(Object.keys(import.meta.glob('/src/pages/docs/**'))).toEqual([]);
  expect(en).not.toHaveProperty('docs');
  expect(en).not.toHaveProperty('docsLink');
});

it('leaves every other path to the app', () => {
  setup('/dm/@alice');
  expect(screen.getByTestId('session-entry')).toBeInTheDocument();
  expect(mocks.leaveFor).not.toHaveBeenCalled();
});
