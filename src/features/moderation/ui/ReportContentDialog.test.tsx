import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportContentDialog } from './ReportContentDialog';

const mocks = vi.hoisted(() => ({ reportMessage: vi.fn(), reportGroup: vi.fn(), toast: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: mocks.toast }));
vi.mock('../api/moderationApi', () => ({
  useReportMessageMutation: () => [mocks.reportMessage, { isLoading: false }],
  useReportGroupMutation: () => [mocks.reportGroup, { isLoading: false }],
}));

const result = (value: Promise<unknown>) => ({ unwrap: () => value });
const message = { kind: 'message' as const, chatId: '7', messageId: '99', name: 'Eve' };

describe('ReportContentDialog', () => {
  beforeEach(() => { mocks.reportMessage.mockReset(); mocks.reportGroup.mockReset(); mocks.toast.mockReset(); });

  it('tells what moderators see and reports the message with the reason and note', async () => {
    mocks.reportMessage.mockReturnValue(result(Promise.resolve()));
    const onClose = vi.fn();
    render(<ReportContentDialog request={message} onClose={onClose} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Report message from Eve' })).toBeInTheDocument();
    expect(screen.getByText(/up to 5 messages before and after it/)).toBeInTheDocument();
    expect(screen.getByText(/kept for 6 months/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Send report' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Scam or fraud' }));
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: '  fake shop  ' } });
    fireEvent.click(submit);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.reportMessage).toHaveBeenCalledWith({ chatId: '7', messageId: '99', reason: 'scam', note: 'fake shop' });
    expect(mocks.toast).toHaveBeenCalledWith('Report sent. Thank you.');
  });

  it('needs an explanation for illegal content and shows the notice statement', async () => {
    mocks.reportMessage.mockReturnValue(result(Promise.resolve()));
    render(<ReportContentDialog request={message} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Illegal content' }));
    const note = screen.getByLabelText('Why is this illegal?');
    expect(note).toBeRequired();
    expect(screen.getByText(/notice of illegal content/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Send report' });
    expect(submit).toBeDisabled();
    fireEvent.change(note, { target: { value: '   ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(note, { target: { value: 'Death threat against a named person.' } });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.reportMessage).toHaveBeenCalledWith({
      chatId: '7', messageId: '99', reason: 'illegal', note: 'Death threat against a named person.',
    }));
  });

  it('keeps the note at 1000 characters', () => {
    render(<ReportContentDialog request={message} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: 'x'.repeat(1200) } });
    expect((screen.getByLabelText('Details (optional)') as HTMLTextAreaElement).value).toHaveLength(1000);
    expect(screen.getByText('1000/1000')).toBeInTheDocument();
  });

  it('reports a group', async () => {
    mocks.reportGroup.mockReturnValue(result(Promise.resolve()));
    const onClose = vi.fn();
    render(<ReportContentDialog request={{ kind: 'group', chatId: '5', name: 'Free money' }} onClose={onClose} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Report Free money' })).toBeInTheDocument();
    expect(screen.getByText(/name, description and picture/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Offensive or inappropriate content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.reportGroup).toHaveBeenCalledWith({ chatId: '5', reason: 'inappropriate_profile', note: null });
    expect(mocks.reportMessage).not.toHaveBeenCalled();
  });

  it.each([[429, 'You sent too many reports today. Try again tomorrow.'], [500, 'Could not send the report. Try again.']])(
    'stays open and explains a %s failure',
    async (status, text) => {
      mocks.reportMessage.mockReturnValue(result(Promise.reject({ status })));
      const onClose = vi.fn();
      render(<ReportContentDialog request={message} onClose={onClose} />);
      fireEvent.click(screen.getByRole('radio', { name: 'Spam' }));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(onClose).not.toHaveBeenCalled();
    },
  );
});
