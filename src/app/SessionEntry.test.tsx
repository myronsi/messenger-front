import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
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
}));
vi.mock('@/shared/api/currentUserApi', () => ({
  currentUserApi: { endpoints: { getCurrentUser: { initiate: () => 'verify' } } },
}));
vi.mock('@/entities/chat', () => ({ chatApi: { util: { prefetch: () => 'prefetch' } } }));
vi.mock('@/pages/auth', () => ({ AuthFlowPage: () => <input aria-label="Password" /> }));
vi.mock('@/pages/messenger', () => ({
  MessengerApp: ({ username }: { username: string }) => <p>Chats for {username}</p>,
}));

const setup = () => render(<LanguageProvider><MemoryRouter><SessionEntry /></MemoryRouter></LanguageProvider>);

beforeEach(() => {
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
