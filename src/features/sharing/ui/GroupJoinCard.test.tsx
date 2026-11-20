import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/sonner';
import { GroupJoinCard } from './GroupJoinCard';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: vi.fn() }));
const join = vi.hoisted(() => vi.fn());
vi.mock('@/entities/group', () => ({ useJoinGroupMutation: () => [join, { isLoading: false }] }));

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname} {JSON.stringify(location.state)}</p>;
};

const group = { name: 'Hikers', public_name: 'hikers', description: 'Weekend trips', avatar_url: null, member_count: 3 };
const renderCard = (props: Partial<Parameters<typeof GroupJoinCard>[0]> = {}) => render(
  <MemoryRouter initialEntries={['/join/x']}><GroupJoinCard preview={{ group, chat_id: null }} token="tok" {...props} /><Where /></MemoryRouter>,
);
const failure = (status: number, code?: string) => ({ unwrap: () => Promise.reject({ status, data: code ? { code } : {} }) });

beforeEach(() => vi.clearAllMocks());

describe('GroupJoinCard', () => {
  it('joins by invite and opens the group chat', async () => {
    join.mockReturnValue({ unwrap: () => Promise.resolve({ id: '9', name: 'Hikers' }) });
    renderCard();
    expect(screen.getByText('@hikers')).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join group' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/chat/9'));
    expect(screen.getByTestId('where')).toHaveTextContent('"type":"group"');
    expect(join).toHaveBeenCalledWith({ token: 'tok' });
    expect(toast).toHaveBeenCalledWith('You joined Hikers');
  });

  it('joins a public group by name', async () => {
    join.mockReturnValue({ unwrap: () => Promise.resolve({ id: '9', name: 'Hikers' }) });
    renderCard({ token: undefined, name: 'hikers' });
    fireEvent.click(screen.getByRole('button', { name: 'Join group' }));
    await waitFor(() => expect(join).toHaveBeenCalledWith({ name: 'hikers' }));
  });

  it('opens the chat for a member without joining again', () => {
    renderCard({ preview: { group, chat_id: '4' } });
    expect(screen.getByText('You are already a member.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/chat/4');
    expect(join).not.toHaveBeenCalled();
  });

  it.each([
    [403, undefined, 'You were removed from this group and cannot join it again.'],
    [403, 'account_restricted', 'Your account cannot join groups by link right now.'],
    [429, undefined, 'You joined too many groups. Try again later.'],
    [404, undefined, 'This invite link does not work'],
    [500, undefined, 'Could not join. Try again.'],
  ])('explains a %i %s refusal', async (status, code, message) => {
    join.mockReturnValue(failure(status, code));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Join group' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByTestId('where')).toHaveTextContent('/join/x');
  });
});
