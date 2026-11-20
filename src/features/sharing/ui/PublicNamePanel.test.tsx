import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/sonner';
import { PublicNamePanel } from './PublicNamePanel';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
vi.mock('@/shared/ui/sonner', () => ({ toast: vi.fn() }));
vi.mock('@/shared/lib/webOrigin', () => ({ publicWebOrigin: () => 'https://chat.example' }));
const api = vi.hoisted(() => ({ available: true as boolean | undefined, asked: [] as string[], save: vi.fn(), clear: vi.fn() }));
vi.mock('@/entities/group', () => ({
  useGetPublicNameAvailabilityQuery: (name: string, { skip }: { skip: boolean }) => {
    if (!skip) api.asked.push(name);
    return { data: skip ? undefined : api.available, isFetching: false };
  },
  useSetGroupPublicNameMutation: () => [api.save, { isLoading: false }],
  useClearGroupPublicNameMutation: () => [api.clear, { isLoading: false }],
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  api.available = true;
  api.asked = [];
});
afterEach(() => vi.useRealTimers());

const type = (value: string) => {
  fireEvent.change(screen.getByLabelText('Public name'), { target: { value } });
  act(() => { vi.advanceTimersByTime(400); });
};

describe('PublicNamePanel', () => {
  it('checks the name after typing stops and saves a free one', async () => {
    api.save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<PublicNamePanel chatId="5" groupName="Hikers" publicName={null} />);
    fireEvent.change(screen.getByLabelText('Public name'), { target: { value: 'hikers' } });
    expect(screen.getByText('Checking…')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(400); });
    expect(api.asked).toEqual(['hikers']);
    expect(screen.getByText('This name is free')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Make public' })); });
    expect(api.save).toHaveBeenCalledWith({ chatId: '5', name: 'hikers' });
    expect(toast).toHaveBeenCalledWith('The group is public at https://chat.example/@hikers');
  });

  it('blocks a taken or malformed name', () => {
    api.available = false;
    render(<PublicNamePanel chatId="5" groupName="Hikers" publicName={null} />);
    type('taken_name');
    expect(screen.getByText('This name is taken')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make public' })).toBeDisabled();
    type('no spaces');
    expect(screen.getByText('3 to 32 letters, digits or _.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make public' })).toBeDisabled();
  });

  it('shows the link of a public group, allows a case change without a check and makes it private', async () => {
    api.clear.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<PublicNamePanel chatId="5" groupName="Hikers" publicName="hikers" />);
    expect(screen.getByTestId('public-group-link')).toHaveTextContent('https://chat.example/@hikers');
    type('Hikers');
    expect(api.asked).toEqual([]);
    expect(screen.getByRole('button', { name: 'Save name' })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Make private' })); });
    expect(api.clear).toHaveBeenCalledWith('5');
    expect(toast).toHaveBeenCalledWith('The group is private now');
  });

  it('explains a name taken in the meantime', async () => {
    api.save.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { code: 'already_exists' } }) });
    render(<PublicNamePanel chatId="5" groupName="Hikers" publicName={null} />);
    type('hikers');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Make public' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('This name is taken');
  });
});
