import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginComponent from './LoginComponent';
import { samples } from '@/test/samples';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});

vi.mock('./api/authApi', () => ({
  useLoginMutation: () => [vi.fn(), { isLoading: false }],
  useLoginTwoFactorMutation: () => [vi.fn()],
}));

describe('LoginComponent', () => {
  it('enables sign in only when username and password are filled', () => {
    render(<LoginComponent onLoginSuccess={() => {}} onRegisterClick={() => {}} onRecoverClick={() => {}} />);
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alex_m' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: samples.login } });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: '  ' } });
    expect(button).toBeDisabled();
  });

  it('shows the compact QR code button with a full accessible name', () => {
    render(<LoginComponent onLoginSuccess={() => {}} onRegisterClick={() => {}} onRecoverClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sign in with QR code' })).toHaveTextContent('QR code');
  });
});
