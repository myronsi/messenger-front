import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { DocsLink } from '@/shared/ui/DocsLink';
import { en } from '@/shared/lang/en';
import { AppRoutes } from './App';

vi.mock('@/pages/messenger', () => ({ MessengerApp: () => <PreviousPage /> }));
vi.mock('@/pages/auth', () => ({ AuthFlowPage: () => null, RecoveryEmailLinkPage: () => null }));

function PreviousPage() {
  const [count, setCount] = useState(0);
  const location = useLocation();
  return <div data-testid="previous-page">
    <span data-testid="previous-url">{location.pathname}{location.search}{location.hash}</span>
    <input aria-label="Draft" />
    <button onClick={() => setCount(count + 1)}>Count {count}</button>
    <div data-testid="previous-scroll" style={{ height: 100, overflow: 'auto' }}><div style={{ height: 1000 }} /></div>
    <DocsLink>Open docs</DocsLink>
  </div>;
}

let navigate: NavigateFunction;
function LocationObserver() {
  navigate = useNavigate();
  const location = useLocation();
  return <span data-testid="current-url">{location.pathname}{location.search}{location.hash}</span>;
}

const previousUrl = '/dm/@alice/settings?from=chat#position';
const setup = (path = previousUrl) => render(<LanguageProvider>
  <MemoryRouter initialEntries={[path]}><LocationObserver /><AppRoutes /></MemoryRouter>
</LanguageProvider>);

beforeEach(() => {
  localStorage.setItem('language', 'en');
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

it('keeps the original URL, draft, local state and scroll position beneath Docs', async () => {
  const user = userEvent.setup();
  setup();
  await user.type(screen.getByLabelText('Draft'), 'Unsent message');
  await user.click(screen.getByText('Count 0'));
  const previous = screen.getByTestId('previous-page');
  const scroll = screen.getByTestId('previous-scroll');
  scroll.scrollTop = 300;
  await user.click(screen.getByText('Open docs'));
  await screen.findByRole('heading', { level: 1, name: en.docs.title });
  expect(screen.getByTestId('previous-url')).toHaveTextContent(previousUrl);
  expect(screen.getByTestId('current-url')).toHaveTextContent('/docs');
  await user.click(within(screen.getByRole('navigation')).getAllByRole('link')[0]);
  await user.click(screen.getByRole('button', { name: en.docs.backToApp }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: en.docs.title })).not.toBeInTheDocument());
  expect(screen.getByTestId('previous-page')).toBe(previous);
  expect(screen.getByTestId('current-url')).toHaveTextContent(previousUrl);
  expect(screen.getByLabelText('Draft')).toHaveValue('Unsent message');
  expect(screen.getByText('Count 1')).toBeInTheDocument();
  expect(scroll.scrollTop).toBe(300);
});

it('supports browser back and forward without remounting the previous page', async () => {
  const user = userEvent.setup();
  setup('/register');
  const previous = screen.getByTestId('previous-page');
  await user.click(screen.getByText('Open docs'));
  await screen.findByRole('heading', { level: 1, name: en.docs.title });
  act(() => { void navigate(-1); });
  await waitFor(() => expect(screen.queryByRole('heading', { name: en.docs.title })).not.toBeInTheDocument());
  expect(screen.getByTestId('previous-page')).toBe(previous);
  act(() => { void navigate(1); });
  await screen.findByRole('heading', { level: 1, name: en.docs.title });
  expect(screen.getByTestId('previous-page')).toBe(previous);
});

it('still serves direct links to public documentation', async () => {
  setup('/docs#security');
  await screen.findByRole('heading', { level: 1, name: en.docs.title });
  expect(screen.queryByTestId('previous-page')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: en.docs.backToApp })).toHaveAttribute('href', '/');
});
