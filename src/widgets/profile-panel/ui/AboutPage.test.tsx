import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AboutPage from './AboutPage';

const mocks = vi.hoisted(() => ({ copyText: vi.fn(async () => true), toast: vi.fn() }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/versionApi', () => ({
  useGetServerVersionQuery: () => ({ data: { serverVersion: '1.38.0', commit: '3904a3a', apiVersion: '2.1.0-alpha.50', minClientApiVersion: '2.0.0-alpha.1' }, isLoading: false }),
}));
vi.mock('@/shared/lib/copyText', () => ({ copyText: mocks.copyText }));
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));

it('shows client and server details apart and copies the client details', async () => {
  render(<AboutPage onBack={vi.fn()} />);
  const server = screen.getByRole('heading', { name: 'Server' }).closest('section') as HTMLElement;
  expect(within(server).getByText('1.38.0')).toBeInTheDocument();
  expect(within(server).getByText('2.0.0-alpha.1')).toBeInTheDocument();
  const client = screen.getByRole('heading', { name: 'Client' }).closest('section') as HTMLElement;
  expect(within(client).getByText('Browser')).toBeInTheDocument();
  expect(within(client).getByText('Time zone')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Client info copied'));
  const [copied] = mocks.copyText.mock.calls[0] as unknown as [string];
  expect(copied).toMatch(/^App version: /);
  expect(copied).toContain('\nRunning as: ');
  expect(copied).not.toContain('1.38.0');
});
