import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiProblem, problemCode } from '@/shared/api/problem';
import { en } from '@/shared/lang/en/bundle';
import { isTwoFactorCancelled, useTwoFactorConfirm } from './useTwoFactorConfirm';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: en }) }));

let confirm: ReturnType<typeof useTwoFactorConfirm>['confirm'];
const Harness = ({ enabled }: { enabled?: boolean }) => {
  const twoFactor = useTwoFactorConfirm(enabled);
  confirm = twoFactor.confirm;
  return twoFactor.dialog;
};
const problem = (code: string, status = 401) => new ApiProblem(status, { code, status, detail: `${code} detail` });
const enterCode = (code: string) => {
  fireEvent.change(screen.getByLabelText('Authenticator or backup code'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
};

afterEach(cleanup);

it('runs without a code and never opens the dialog when no second factor is needed', async () => {
  render(<Harness />);
  const run = vi.fn(async (code?: string) => code ?? 'none');
  let result: unknown;
  await act(async () => { result = await confirm(run); });
  expect(result).toBe('none');
  expect(run).toHaveBeenCalledWith();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('asks first when the account is known to use two-factor authentication', async () => {
  render(<Harness enabled />);
  const run = vi.fn(async (code?: string) => code);
  let pending!: Promise<unknown>;
  act(() => { pending = confirm(run); });
  expect(await screen.findByRole('dialog', { name: 'Confirm with two-factor authentication' })).toBeInTheDocument();
  expect(screen.getByLabelText('Authenticator or backup code')).toHaveFocus();
  expect(run).not.toHaveBeenCalled();
  enterCode(' 123456 ');
  await expect(pending).resolves.toBe('123456');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('opens the dialog when the server asks for a second factor and keeps it open on a wrong code', async () => {
  render(<Harness />);
  const run = vi.fn(async (code?: string) => {
    if (!code) throw problem('two_factor_required');
    if (code === 'wrong') throw problem('invalid_two_factor_code');
    return code;
  });
  let pending!: Promise<unknown>;
  act(() => { pending = confirm(run); });
  await screen.findByRole('dialog');
  enterCode('wrong');
  expect(await screen.findByRole('alert')).toHaveTextContent("That code didn't work");
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  enterCode('backup-code-1');
  await expect(pending).resolves.toBe('backup-code-1');
});

it('rejects with a cancellation the caller can ignore', async () => {
  render(<Harness enabled />);
  let pending!: Promise<unknown>;
  act(() => { pending = confirm(async () => 'never'); });
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
  const error = await pending.catch(caught => caught);
  expect(isTwoFactorCancelled(error)).toBe(true);
});

it('closes the dialog and passes other failures to the caller', async () => {
  render(<Harness enabled />);
  let pending!: Promise<unknown>;
  act(() => { pending = confirm(async () => { throw problem('rate_limited'); }); });
  enterCode('123456');
  await expect(pending).rejects.toBeInstanceOf(ApiProblem);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('shows a rejected recovery code in the dialog but leaves a wrong password to the form', async () => {
  render(<Harness enabled />);
  let pending!: Promise<unknown>;
  act(() => { pending = confirm(async code => { throw problem('invalid_credentials', code === 'public' ? 400 : 403); }); });
  enterCode('public');
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid_credentials detail');
  enterCode('signed-in');
  const error = await pending.catch(caught => caught);
  expect(problemCode(error)).toBe('invalid_credentials');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
