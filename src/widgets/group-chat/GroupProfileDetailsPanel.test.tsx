import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupProfileDetailsPanel from './GroupProfileDetailsPanel';
import type { GroupProfileDialogProps } from './GroupProfileTypes';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/entities/message', () => ({ ProfileBio: ({ text }: { text: string }) => <p data-testid="profile-bio">{text}</p> }));
vi.mock('./GroupRoleHistoryRow', () => ({ default: ({ onOpen }: { onOpen: () => void }) => <button type="button" onClick={onOpen}>Role history</button> }));

const model = (description: string, onDeleteGroup = vi.fn()) => ({
  chatId: '31', groupDetails: { description, public_name: 'devteam' }, onDeleteGroup,
}) as unknown as GroupProfileDialogProps;

describe('GroupProfileDetailsPanel', () => {
  it('shows members the About text and the role history, but no management or delete', () => {
    render(<GroupProfileDetailsPanel model={model('Daily stand-up at 9')} canDeleteGroup={false} currentRole="member"
      onOpenRoleHistory={vi.fn()} onOpenSharing={vi.fn()} />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByTestId('profile-bio')).toHaveTextContent('Daily stand-up at 9');
    expect(screen.getByRole('button', { name: 'Role history' })).toBeInTheDocument();
    expect(screen.queryByText('Manage group')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete group/i })).not.toBeInTheDocument();
  });

  it('gives the owner the Manage group list and Delete group', () => {
    const onOpenSharing = vi.fn();
    const onDeleteGroup = vi.fn();
    render(<GroupProfileDetailsPanel model={model('', onDeleteGroup)} canDeleteGroup currentRole="owner"
      onOpenRoleHistory={vi.fn()} onOpenSharing={onOpenSharing} />);
    expect(screen.queryByText('About')).not.toBeInTheDocument();
    expect(screen.getByText('Manage group')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Invite links/ }));
    expect(onOpenSharing).toHaveBeenCalledWith('invites');
    expect(screen.getByRole('button', { name: /@devteam/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete group/i }));
    expect(onDeleteGroup).toHaveBeenCalledOnce();
  });
});
