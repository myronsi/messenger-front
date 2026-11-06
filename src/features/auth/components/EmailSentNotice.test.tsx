import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmailSentNotice } from './EmailSentNotice';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});

describe('EmailSentNotice', () => {
  it('uses neutral copy and disables resend while counting down', () => {
    render(<EmailSentNotice identifier="anna.k" resendIn={48} busy={false} message="" onResend={() => {}} onTryAnotherWay={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/^If anna\.k has a verified recovery email, we've sent a reset link to it\./);
    expect(screen.getByRole('button', { name: 'Resend in 0:48' })).toBeDisabled();
  });

  it('allows resending once the countdown is over', () => {
    const resend = vi.fn();
    render(<EmailSentNotice identifier="anna.k" resendIn={0} busy={false} message="" onResend={resend} onTryAnotherWay={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend link' }));
    expect(resend).toHaveBeenCalledOnce();
  });
});
