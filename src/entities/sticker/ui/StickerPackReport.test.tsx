import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { StickerPackReport } from './StickerPackReport';

const report = vi.fn();
const state = vi.fn();
vi.mock('../api/ownPacksApi', () => ({ useReportStickerPackMutation: () => [report, state()] }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));

beforeEach(() => {
  report.mockReset();
  state.mockReturnValue({ isLoading: false, isSuccess: false, error: undefined });
});

it('sends the chosen reason', () => {
  render(<StickerPackReport packId="3" />);
  fireEvent.click(screen.getByRole('button', { name: en.reportStickerPack }));
  fireEvent.click(screen.getByLabelText(en.reportReasonCopyright));
  fireEvent.click(screen.getByRole('button', { name: en.reportStickerPack }));
  expect(report).toHaveBeenCalledWith({ packId: '3', reason: 'copyright' });
});

it('thanks after a report and explains the daily limit', () => {
  state.mockReturnValue({ isLoading: false, isSuccess: true });
  const { unmount } = render(<StickerPackReport packId="3" />);
  expect(screen.getByRole('status')).toHaveTextContent(en.reportStickerPackSent);
  unmount();
  state.mockReturnValue({ isLoading: false, isSuccess: false, error: { status: 429 } });
  render(<StickerPackReport packId="3" />);
  fireEvent.click(screen.getByRole('button', { name: en.reportStickerPack }));
  expect(screen.getByRole('alert')).toHaveTextContent(en.reportStickerPackLimit);
});
