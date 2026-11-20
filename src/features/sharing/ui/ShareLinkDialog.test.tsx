import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { copyText } from '@/shared/lib/copyText';
import { ShareLinkDialog } from './ShareLinkDialog';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
vi.mock('@/shared/lib/copyText', () => ({ copyText: vi.fn(async () => true) }));

afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(navigator, 'share');
});

const url = 'https://chat.example/@anna';

it('shows the link with a QR code and copies it', async () => {
  render(<ShareLinkDialog title="Share profile" hint="Anyone with this link" url={url} onClose={() => undefined} />);
  expect(screen.getByTestId('share-link-url')).toHaveTextContent(url);
  expect(screen.getByTitle(`QR code for ${url}`)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Share…' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument());
  expect(copyText).toHaveBeenCalledWith(url);
});

it('offers the system share sheet where the browser has one', () => {
  const share = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  render(<ShareLinkDialog title="Share profile" hint="hint" url={url} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
  expect(share).toHaveBeenCalledWith({ title: 'Share profile', url });
});

it('closes from the close button', () => {
  const onClose = vi.fn();
  render(<ShareLinkDialog title="Share profile" hint="hint" url={url} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalled();
});
