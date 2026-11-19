import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportUserDialog } from './ReportUserDialog';

const mocks = vi.hoisted(() => ({ report: vi.fn(), toast: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));
vi.mock('../api/moderationApi', () => ({ useReportUserMutation: () => [mocks.report, { isLoading: false }] }));

const result = (value: Promise<unknown>) => ({ unwrap: () => value });

describe('ReportUserDialog', () => {
  it('links the Community Guidelines', () => {
    render(<ReportUserDialog userId="42" name="Eve" onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Community Guidelines' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/guidelines/en');
  });

  beforeEach(() => { mocks.report.mockReset(); mocks.toast.mockReset(); });

  it('needs a reason, sends the note and blocks by default', async () => {
    mocks.report.mockReturnValue(result(Promise.resolve()));
    const onClose = vi.fn();
    const onReported = vi.fn();
    render(<ReportUserDialog userId="42" name="Eve" onClose={onClose} onReported={onReported} />);
    const submit = screen.getByRole('button', { name: 'Send report' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Also block Eve' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Scam or fraud' }));
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: '  sent a fake link  ' } });
    fireEvent.click(submit);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.report).toHaveBeenCalledWith({ userId: '42', reason: 'scam', note: 'sent a fake link', block: true });
    expect(mocks.toast).toHaveBeenCalledWith('Report sent and Eve blocked.');
    expect(onReported).toHaveBeenCalledWith(true);
  });

  it('reports without blocking when the box is cleared', async () => {
    mocks.report.mockReturnValue(result(Promise.resolve()));
    render(<ReportUserDialog userId="42" name="Eve" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Spam' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Also block Eve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Report sent. Thank you.'));
    expect(mocks.report).toHaveBeenCalledWith({ userId: '42', reason: 'spam', note: null, block: false });
  });

  it('keeps the note at 500 characters', () => {
    render(<ReportUserDialog userId="42" name="Eve" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: 'x'.repeat(600) } });
    expect((screen.getByLabelText('Details (optional)') as HTMLTextAreaElement).value).toHaveLength(500);
    expect(screen.getByText('500/500')).toBeInTheDocument();
  });

  it.each([[429, 'You sent too many reports today. Try again tomorrow.'], [500, 'Could not send the report. Try again.']])(
    'stays open and explains a %s failure',
    async (status, message) => {
      mocks.report.mockReturnValue(result(Promise.reject({ status })));
      const onClose = vi.fn();
      render(<ReportUserDialog userId="42" name="Eve" onClose={onClose} />);
      fireEvent.click(screen.getByRole('radio', { name: 'Harassment or bullying' }));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(onClose).not.toHaveBeenCalled();
    },
  );

  it('closes on cancel without reporting', () => {
    const onClose = vi.fn();
    render(<ReportUserDialog userId="42" name="Eve" onClose={onClose} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]);
    expect(onClose).toHaveBeenCalled();
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
