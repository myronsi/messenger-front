import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AvatarHistoryViewer from './AvatarHistoryViewer';

let history: { data?: { avatars: { id: string; avatar_url: string; created_at: string; is_current: boolean }[] } } = {};
vi.mock('@/entities/user', () => ({ useGetUserAvatarHistoryQuery: () => history }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { previousImage: 'Previous image', nextImage: 'Next image', deletePhoto: 'Delete photo', deletePhotoConfirm: 'Delete this photo?', photoDeleteFailed: 'Could not delete', delete: 'Delete', cancel: 'Cancel' } }) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

const current = 'http://localhost:3000/api/v2/users/7/avatar';
const item = (version: string, isCurrent: boolean) => ({ id: version, avatar_url: `/api/v2/users/7/avatar?version=${version}`, created_at: '2026-11-02T10:00:00Z', is_current: isCurrent });
const shownSrc = () => screen.getByRole('dialog').querySelector('img')?.getAttribute('src');

describe('AvatarHistoryViewer', () => {
  it('shows the current avatar at once while the history loads', () => {
    history = {};
    render(<AvatarHistoryViewer username="alice" displayName="Alice" currentAvatarUrl={current} onClose={vi.fn()} />);
    expect(shownSrc()).toBe(current);
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
  });

  it('opens the avatar history as a gallery in the shared image viewer', () => {
    history = { data: { avatars: [item('3', true), item('2', false)] } };
    render(<AvatarHistoryViewer username="alice" displayName="Alice" currentAvatarUrl={current} onClose={vi.fn()} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(shownSrc()).toContain('version=3');
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(shownSrc()).toContain('version=2');
  });

  it('deletes the shown avatar after a confirmation', async () => {
    history = { data: { avatars: [item('3', true), item('2', false)] } };
    const onDeleteAvatar = vi.fn(async () => undefined);
    render(<AvatarHistoryViewer username="alice" displayName="Alice" currentAvatarUrl={current} onClose={vi.fn()} onDeleteAvatar={onDeleteAvatar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    expect(onDeleteAvatar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleteAvatar).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('says so when the avatar could not be deleted', async () => {
    history = { data: { avatars: [item('3', true)] } };
    render(<AvatarHistoryViewer username="alice" displayName="Alice" currentAvatarUrl={current} onClose={vi.fn()} onDeleteAvatar={vi.fn(async () => { throw new Error('nope'); })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Could not delete')).toBeInTheDocument();
  });

  it('offers no delete for the avatars of somebody else', () => {
    history = { data: { avatars: [item('3', true)] } };
    render(<AvatarHistoryViewer username="alice" displayName="Alice" currentAvatarUrl={current} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Delete photo' })).not.toBeInTheDocument();
  });
});
