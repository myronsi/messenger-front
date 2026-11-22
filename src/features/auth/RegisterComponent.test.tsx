import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegisterComponent from './RegisterComponent';
import { samples } from '@/test/samples';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations, setLanguage: () => {} }) };
});

vi.mock('./components/PasskeyOffer', () => ({
  PasskeyOffer: ({ onDone }: { onDone: () => void }) => <button type="button" onClick={onDone}>Not now</button>,
}));
vi.mock('@/shared/ui/RecoveryKeyReceipt', () => ({
  RecoveryKeyReceipt: ({ onContinue }: { onContinue: () => void }) => <button type="button" onClick={onContinue}>I saved it</button>,
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => null }));

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const fillName = (value: string) => fireEvent.change(screen.getByLabelText('Username'), { target: { value } });
const fillSecret = (value: string) => fireEvent.change(screen.getByLabelText('Password'), { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
const ageCheckbox = () => screen.getByRole('checkbox', { name: 'I am at least 13 years old. If I am under 16, a parent or guardian agrees.' });
const confirmAge = () => fireEvent.click(ageCheckbox());

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('RegisterComponent', () => {
  it('keeps the button disabled until the age confirmation is ticked', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    const button = screen.getByRole('button', { name: 'Create account' });
    fillName('alex_m');
    fillSecret(samples.strong);
    expect(ageCheckbox()).not.toBeChecked();
    expect(ageCheckbox()).toBeRequired();
    expect(button).toBeDisabled();
    confirmAge();
    expect(button).toBeEnabled();
    confirmAge();
    expect(button).toBeDisabled();
  });

  it('does not register on Enter before the age confirmation is ticked', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    fillName('alex_m');
    fillSecret(samples.strong);
    fireEvent.submit(screen.getByLabelText('Username').closest('form') as HTMLFormElement);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('links the Terms of Use and the Privacy Policy in the consent text', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    expect(screen.getByText(/By creating an account you accept the/)).toHaveTextContent(
      'By creating an account you accept the Terms of Use and have read the Privacy Policy.',
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/terms/en');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', 'https://docs.messenger.viserix.com/#/privacy/en');
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('target', '_blank');
  });

  it('shows a field error only after the field is left', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('al');
    expect(screen.queryByText('Use at least 3 characters.')).not.toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText('Username'));
    expect(screen.getByText('Use at least 3 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('enables the button only when every field has text', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    const button = screen.getByRole('button', { name: 'Create account' });
    expect(button).toBeDisabled();
    fillName('alex_m');
    expect(button).toBeDisabled();
    fillSecret(samples.tiny);
    expect(button).toBeEnabled();
    fillName('   ');
    expect(button).toBeDisabled();
  });

  it('disables the button while a field shows an error', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    const button = screen.getByRole('button', { name: 'Create account' });
    fillName('al');
    fillSecret(samples.strong);
    expect(button).toBeEnabled();
    fireEvent.blur(screen.getByLabelText('Username'));
    expect(screen.getByText('Use at least 3 characters.')).toBeInTheDocument();
    expect(button).toBeDisabled();
    fillName('alex');
    expect(screen.queryByText('Use at least 3 characters.')).not.toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('shows every format error on submit without calling the server', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('al');
    fillSecret(samples.tooShort);
    submit();
    expect(screen.getByText('Use at least 3 characters.')).toBeInTheDocument();
    expect(screen.getByText('Use 8 to 128 characters.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a taken username under the field and clears it when the name changes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(409, { code: 'already_exists', status: 409 })));
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('alex_m');
    fillSecret(samples.strong);
    submit();
    expect(await screen.findByText("That username's taken. Try another.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    fillName('alex_m2');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(screen.queryByText("That username's taken. Try another.")).not.toBeInTheDocument();
  });

  it('shows a rate limit message for the whole form', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(429, { code: 'rate_limited', status: 429 })));
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('alex_m');
    fillSecret(samples.strong);
    submit();
    expect(await screen.findByText('Too many sign-up attempts. Try again in a few minutes.')).toBeInTheDocument();
  });

  it('moves to the recovery key step and reports each step', async () => {
    const fetchMock = vi.fn(() => reply(201, { access_token: 'token', recovery_key: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH' }));
    vi.stubGlobal('fetch', fetchMock);
    const onStepChange = vi.fn();
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} onStepChange={onStepChange} />);
    confirmAge();
    fillName(' Alex_M ');
    fillSecret(samples.strong);
    submit();
    await waitFor(() => expect(onStepChange).toHaveBeenLastCalledWith('recovery'));
    expect(onStepChange).toHaveBeenCalledWith('account');
    expect(screen.getByText('Step 2 of 4 · Recovery key')).toBeInTheDocument();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.username).toBe('alex_m');
    expect(body.display_name).toBe('alex_m');
    expect(body.password).toBe(samples.strong);
    expect(body.terms_version).toBe('2026-11-19');
    expect(body.age_confirmed).toBe(true);
    expect(Object.keys(body).sort()).toEqual(['age_confirmed', 'display_name', 'password', 'terms_version', 'username']);
  });

  it('generates a visible strong password and copies it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    fireEvent.click(screen.getByRole('button', { name: 'Generate a strong password' }));
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'text');
    expect(input.value).toMatch(/^[A-Za-z0-9]{5}(-[A-Za-z0-9]{5}){3}$/);
    expect(screen.getByText('Strong password created. Save it in your password manager.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Password requirements' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy password' }));
    expect(writeText).toHaveBeenCalledWith(input.value);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'my-own-password' } });
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.queryByRole('button', { name: 'Copy password' })).not.toBeInTheDocument();
  });

  it('shows the password rules while typing and hides them once the password is strong', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    const input = screen.getByLabelText('Password');
    expect(screen.queryByRole('list', { name: 'Password requirements' })).not.toBeInTheDocument();
    act(() => input.focus());
    expect(screen.getByRole('list', { name: 'Password requirements' }).querySelectorAll('[data-met="true"]')).toHaveLength(0);
    fillSecret(samples.lowerOnly);
    expect(screen.getByText('8 or more characters').closest('li')).toHaveAttribute('data-met', 'true');
    expect(screen.getByText('An uppercase letter').closest('li')).toHaveAttribute('data-met', 'false');
    act(() => input.blur());
    expect(screen.getByText('Use a lowercase and an uppercase letter, a number and a special character.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument();
    act(() => input.focus());
    fillSecret(samples.allRules);
    expect(screen.getByRole('list', { name: 'Password requirements' }).querySelectorAll('[data-met="true"]')).toHaveLength(5);
    act(() => input.blur());
    expect(screen.queryByRole('list', { name: 'Password requirements' })).not.toBeInTheDocument();
  });

  it('shows the username rules before anything is typed', () => {
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={() => {}} />);
    confirmAge();
    const hint = '3 to 32 characters: letters, numbers and _.';
    const input = screen.getByLabelText('Username');
    expect(screen.getByText(hint)).not.toHaveClass('invisible');
    expect(input).toHaveAccessibleDescription(hint);
    act(() => input.focus());
    expect(screen.getByText(hint)).not.toHaveClass('invisible');
    act(() => input.blur());
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
  });

  it('sets the display name on the profile step', async () => {
    const fetchMock = vi.fn((url: string) => (url.endsWith('/auth/register')
      ? reply(201, { access_token: 'token', recovery_key: 'AAAA-BBBB' })
      : reply(200, { id: 1, username: 'alex_m', display_name: 'Alex Miller' })));
    vi.stubGlobal('fetch', fetchMock);
    const onLoginSuccess = vi.fn();
    render(<RegisterComponent onLoginSuccess={onLoginSuccess} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('alex_m');
    fillSecret(samples.strong);
    submit();
    fireEvent.click(await screen.findByRole('button', { name: 'I saved it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByLabelText('Display name')).toHaveValue('alex_m');
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  Alex   Miller ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith('alex_m'));
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/me$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ display_name: 'Alex Miller' });
  });

  it('keeps the username as display name when the profile step is skipped', async () => {
    const fetchMock = vi.fn(() => reply(201, { access_token: 'token', recovery_key: 'AAAA-BBBB' }));
    vi.stubGlobal('fetch', fetchMock);
    const onLoginSuccess = vi.fn();
    render(<RegisterComponent onLoginSuccess={onLoginSuccess} onBackToLogin={() => {}} />);
    confirmAge();
    fillName('alex_m');
    fillSecret(samples.strong);
    submit();
    fireEvent.click(await screen.findByRole('button', { name: 'I saved it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(onLoginSuccess).toHaveBeenCalledWith('alex_m');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('goes back to sign in from the footer link', () => {
    const onBackToLogin = vi.fn();
    render(<RegisterComponent onLoginSuccess={() => {}} onBackToLogin={onBackToLogin} />);
    confirmAge();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onBackToLogin).toHaveBeenCalled();
  });
});
