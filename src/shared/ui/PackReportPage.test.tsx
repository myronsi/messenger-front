import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en/bundle';
import { Dialog, DialogContent } from './dialog';
import { PackReportPage } from './PackReportPage';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en }) }));

const onSubmit = vi.fn();
const onBack = vi.fn();
const onDone = vi.fn();
const renderPage = () => render(<PackReportPage onSubmit={onSubmit} onBack={onBack} onDone={onDone} />);

describe('PackReportPage', () => {
  beforeEach(() => { onSubmit.mockReset(); onBack.mockReset(); onDone.mockReset(); });

  it('lists every reason with its hint and shows the send button only after a choice', () => {
    renderPage();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByRole('radio', { name: new RegExp(en.reportReasonCopyrightHint) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.reportPackSend })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.reportReasonCopyright) }));
    expect(screen.getByRole('radio', { name: new RegExp(en.reportReasonCopyright) })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: en.reportPackSend })).toBeEnabled();
  });

  it('sends the chosen reason and thanks afterwards', async () => {
    onSubmit.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.reportReasonSpam) }));
    fireEvent.click(screen.getByRole('button', { name: en.reportPackSend }));
    expect(onSubmit).toHaveBeenCalledWith('spam');
    await waitFor(() => expect(screen.getByTestId('pack-report-sent')).toHaveTextContent(en.reportStickerPackSent));
    fireEvent.click(screen.getByRole('button', { name: en.reportPackDone }));
    expect(onDone).toHaveBeenCalled();
  });

  it('explains the daily limit and keeps the choice so the user can try again later', async () => {
    onSubmit.mockRejectedValue({ status: 429 });
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.reportReasonHate) }));
    fireEvent.click(screen.getByRole('button', { name: en.reportPackSend }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(en.reportStickerPackLimit));
    expect(screen.getByRole('radio', { name: new RegExp(en.reportReasonHate) })).toHaveAttribute('aria-checked', 'true');
  });

  it('goes back without sending', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: en.back }));
    expect(onBack).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no slide and no back arrow inside a desktop window', () => {
    render(<Dialog open><DialogContent><PackReportPage inDialog onSubmit={onSubmit} onBack={onBack} onDone={onDone} /></DialogContent></Dialog>);
    expect(screen.getByTestId('pack-report-page')).not.toHaveClass('profile-panel-slide-in-right');
    expect(screen.queryByRole('button', { name: en.back })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: en.reportStickerPack })).toBeInTheDocument();
  });
});
