import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { EmojiPackLinkDialog } from './EmojiPackLinkDialog';

const report = vi.fn(() => ({ unwrap: () => Promise.resolve() }));
const mobile = vi.fn(() => false);
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => mobile() }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ CustomEmoji: ({ shortcode }: { shortcode: string }) => <span>{shortcode}</span> }));
vi.mock('@/entities/emoji', () => ({
  useGetEmojiPackByLinkQuery: () => ({
    data: { id: '5', title: 'Maimai', is_mine: false, is_installed: false, emoji: [{ id: '1', shortcode: 'cat' }] }, isLoading: false, isError: false,
  }),
  useSetEmojiPackInstalledMutation: () => [vi.fn(), { isLoading: false }],
  useReportEmojiPackMutation: () => [report],
}));

beforeEach(() => { report.mockClear(); mobile.mockReturnValue(false); });

it('opens the report as its own window over the pack on desktop', async () => {
  render(<EmojiPackLinkDialog slug="EBK" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: en.customEmoji.report }));
  expect(screen.getByTestId('pack-report-dialog')).toBeInTheDocument();
  expect(screen.getByTestId('emoji-pack-preview')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.back })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.reportReasonCopyright) }));
  fireEvent.click(screen.getByRole('button', { name: en.reportPackSend }));
  expect(report).toHaveBeenCalledWith({ packId: '5', reason: 'copyright' });
  await waitFor(() => expect(screen.getByTestId('pack-report-sent')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: en.reportPackDone }));
  expect(screen.queryByTestId('pack-report-dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: en.customEmoji.reported })).toBeDisabled();
});

it('slides the report in place of the pack on a phone and goes back with the arrow', () => {
  mobile.mockReturnValue(true);
  render(<EmojiPackLinkDialog slug="EBK" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: en.customEmoji.report }));
  expect(screen.queryByTestId('emoji-pack-preview')).not.toBeInTheDocument();
  expect(screen.getByTestId('pack-report-page')).toHaveClass('profile-panel-slide-in-right');
  fireEvent.click(screen.getByRole('button', { name: en.back }));
  expect(screen.getByTestId('emoji-pack-preview')).toBeInTheDocument();
});
