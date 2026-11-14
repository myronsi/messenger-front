import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import GroupCreateModal from './GroupCreateModal';

const text = en.groupCreate;
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useSearchUsersQuery: () => ({ data: undefined, isFetching: false }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: { chats: [
    { id: 1, interlocutor_name: 'mailen', interlocutor_display_name: 'Mai' },
    { id: 2, interlocutor_name: 'alex', interlocutor_display_name: 'Alex' },
  ] } }),
}));

describe('GroupCreateModal', () => {
  it('creates a group from one screen with chips and a selected count', async () => {
    const onCreate = vi.fn();
    render(<GroupCreateModal currentUsername="me" onClose={vi.fn()} onCreate={onCreate} />);
    const create = screen.getByRole('button', { name: text.create });
    expect(create).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(text.groupNamePlaceholder), { target: { value: 'Weekend plans' } });
    expect(screen.getByText('W')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Mai/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Alex/ }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Mai/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alex' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(text.addDescription) }));
    fireEvent.change(screen.getByLabelText(text.description), { target: { value: 'Hiking' } });
    fireEvent.click(create);
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      groupName: 'Weekend plans', description: 'Hiking', participants: ['mailen'],
    })));
  });
});
