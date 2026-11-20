import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { rememberSignedInUser } from '@/shared/auth/signedInUser';
import { SessionEntry } from './SessionEntry';

const mocks = vi.hoisted(() => ({
  token: null as string | null,
  dispatch: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@/shared/auth/session', () => ({
  getAccessToken: () => mocks.token,
  refreshAccessToken: mocks.refresh,
  subscribeToAccessToken: () => () => undefined,
  dropInvalidSession: vi.fn(),
}));
vi.mock('@/shared/api/currentUserApi', () => ({
  currentUserApi: { endpoints: { getCurrentUser: { initiate: () => 'verify' } }, util: { upsertQueryEntries: () => 'seed' } },
}));
vi.mock('@/entities/chat', () => ({ chatApi: { util: { prefetch: () => 'prefetch' } } }));
vi.mock('@/pages/auth', () => ({
  AuthFlowPage: () => <input aria-label="Password" />,
  PublicLinkPage: ({ target }: { target: { kind: string; name?: string; token?: string } }) => <p>public {target.kind} {target.name ?? target.token}</p>,
}));
vi.mock('@/pages/messenger', () => ({
  MessengerApp: ({ username }: { username: string }) => <p>Chats for {username}</p>,
}));

const setup = (path = '/') => render(<LanguageProvider><MemoryRouter initialEntries={[path]}><SessionEntry /></MemoryRouter></LanguageProvider>);

const tokenFor = (claims: Record<string, string>) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`;

beforeEach(() => {
  localStorage.clear();
  mocks.token = null;
  mocks.dispatch.mockReset();
  mocks.refresh.mockReset();
});

it('shows sign-in while a fresh browser checks for a refresh cookie', async () => {
  let finish!: (token: string | null) => void;
  mocks.refresh.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  setup();

  expect(await screen.findByLabelText('Password')).toBeVisible();
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  expect(mocks.dispatch).not.toHaveBeenCalled();
  await act(async () => { finish(null); });
  expect(mocks.dispatch).not.toHaveBeenCalled();
});

it('keeps chats hidden until the server verifies the saved session', async () => {
  mocks.token = 'saved';
  let finish!: (result: unknown) => void;
  mocks.dispatch.mockImplementation(action => action === 'verify' ? new Promise(resolve => { finish = resolve; }) : undefined);
  setup();

  expect(screen.queryByText('Chats for alex')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  await act(async () => { finish({ isSuccess: true, data: { username: 'alex' } }); });
  expect(await screen.findByText('Chats for alex')).toBeVisible();
});

it('shows the chats of the saved user at once and checks the session in the background', async () => {
  mocks.token = tokenFor({ sub: '1', sid: 's1' });
  rememberSignedInUser(mocks.token, { id: '1', username: 'alex' });
  let finish!: (result: unknown) => void;
  mocks.dispatch.mockImplementation(action => action === 'verify' ? new Promise(resolve => { finish = resolve; }) : undefined);
  setup();

  expect(await screen.findByText('Chats for alex')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(mocks.dispatch).toHaveBeenCalledWith('seed');
  await act(async () => { finish({ isSuccess: true, data: { username: 'alex' } }); });
  expect(screen.getByText('Chats for alex')).toBeVisible();
});

it('switches to sign-in when the server rejects the saved session', async () => {
  mocks.token = tokenFor({ sub: '1', sid: 's1' });
  rememberSignedInUser(mocks.token, { id: '1', username: 'alex' });
  let finish!: (result: unknown) => void;
  mocks.dispatch.mockImplementation(action => action === 'verify' ? new Promise(resolve => { finish = resolve; }) : undefined);
  setup();

  expect(await screen.findByText('Chats for alex')).toBeVisible();
  await act(async () => { finish({ isError: true, error: { status: 401 } }); });
  expect(await screen.findByLabelText('Password')).toBeVisible();
  expect(screen.queryByText('Chats for alex')).not.toBeInTheDocument();
});

it('waits for the server when the saved user belongs to another session', async () => {
  rememberSignedInUser(tokenFor({ sub: '1', sid: 'old' }), { id: '1', username: 'alex' });
  mocks.token = tokenFor({ sub: '1', sid: 's2' });
  mocks.dispatch.mockImplementation(action => action === 'verify' ? new Promise(() => undefined) : undefined);
  setup();

  expect(screen.getByRole('status')).toBeVisible();
  expect(screen.queryByText('Chats for alex')).not.toBeInTheDocument();
});

it.each([
  ['/@anna_k', 'public name anna_k'],
  [`/join/${'Ab3'.repeat(7)}x`, `public invite ${'Ab3'.repeat(7)}x`],
])('shows the public page of %s to a signed-out visitor at once', async (path, text) => {
  mocks.refresh.mockResolvedValue(null);
  setup(path);
  expect(await screen.findByText(text)).toBeVisible();
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
});

it('sends other unknown paths of a signed-out visitor to sign-in', async () => {
  mocks.refresh.mockResolvedValue(null);
  setup('/@an');
  expect(await screen.findByLabelText('Password')).toBeVisible();
});

it('opens chats, not the public page, for a signed-in user on a public link', async () => {
  mocks.token = tokenFor({ sub: '1', sid: 's1' });
  rememberSignedInUser(mocks.token, { id: '1', username: 'alex' });
  mocks.dispatch.mockImplementation(action => action === 'verify' ? new Promise(() => undefined) : undefined);
  setup('/@anna_k');
  expect(await screen.findByText('Chats for alex')).toBeVisible();
  expect(screen.queryByText(/^public/)).not.toBeInTheDocument();
});
