import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthFlowPage from './AuthFlowPage';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});

vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth')>('@/features/auth');
  return {
    ...actual,
    LoginComponent: ({ onRecoverClick }: { onRecoverClick: () => void }) => <button type="button" onClick={onRecoverClick}>Forgot password?</button>,
    RegisterComponent: () => null,
    DeviceRecoveryComponent: ({ initialUsername, onBack }: { initialUsername?: string; onBack: () => void }) => <div>
      <p>device flow for {initialUsername || 'nobody'}</p><button type="button" onClick={onBack}>Try another way</button>
    </div>,
    RecoveryKeyComponent: ({ initialUsername }: { initialUsername?: string }) => <p>key flow for {initialUsername || 'nobody'}</p>,
    EmailRecoveryComponent: ({ initialIdentifier }: { initialIdentifier?: string }) => <p>email flow for {initialIdentifier || 'nobody'}</p>,
  };
});

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><AuthFlowPage onLoginSuccess={() => {}} /></MemoryRouter>);

describe('AuthFlowPage recovery chooser', () => {
  it('opens the chooser from "Forgot password?" and shows all three ways back in', () => {
    renderAt('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { name: 'Get back into your account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve on another device/ })).toHaveTextContent('Fastest');
    expect(screen.getByRole('button', { name: /Use my recovery key/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Email me a reset link/ })).toBeInTheDocument();
  });

  it('passes the typed username to the device flow and comes back to the chooser', () => {
    renderAt('/recover-username');
    fireEvent.change(screen.getByLabelText('Username or recovery email'), { target: { value: ' Anna.K ' } });
    fireEvent.click(screen.getByRole('button', { name: /Approve on another device/ }));
    expect(screen.getByText('device flow for anna.k')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try another way' }));
    expect(screen.getByLabelText('Username or recovery email')).toHaveValue(' Anna.K ');
    fireEvent.click(screen.getByRole('button', { name: /Use my recovery key/ }));
    expect(screen.getByText('key flow for anna.k')).toBeInTheDocument();
  });

  it('passes an email address only to the email flow', () => {
    renderAt('/recover-username');
    fireEvent.change(screen.getByLabelText('Username or recovery email'), { target: { value: 'anna@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Email me a reset link/ }));
    expect(screen.getByText('email flow for anna@example.test')).toBeInTheDocument();
  });

  it('does not treat an email address as a username', () => {
    renderAt('/recover-username');
    fireEvent.change(screen.getByLabelText('Username or recovery email'), { target: { value: 'anna@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Use my recovery key/ }));
    expect(screen.getByText('key flow for nobody')).toBeInTheDocument();
  });
});

const ReturnPath = () => {
  const state = useLocation().state as { notificationReturnPath?: string } | null;
  return <p>return to {state?.notificationReturnPath ?? 'nothing'}</p>;
};

describe('AuthFlowPage QR approval link', () => {
  it('shows the sign-in form for a signed-out visitor and keeps the approval page as the return path', () => {
    const id = 'q'.repeat(32);
    render(<MemoryRouter initialEntries={[`/qr/${id}`]}><AuthFlowPage onLoginSuccess={() => {}} /><ReturnPath /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
    expect(screen.getByText('Sign in on this device first to approve the sign-in on your other device.')).toBeInTheDocument();
    expect(screen.getByText(`return to /qr/${id}`)).toBeInTheDocument();
  });
});
