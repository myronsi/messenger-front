import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { ProfileHero } from './ProfileHero';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
const { history } = vi.hoisted(() => ({ history: { avatars: [] as { id: number; avatar_url: string; created_at: string; is_current: boolean }[] } }));
vi.mock('@/entities/user', () => ({ useGetUserAvatarHistoryQuery: (_: string, { skip }: { skip: boolean }) => ({ data: skip ? undefined : history }) }));

const t = en.appShell;
const photo = (id: number, current = false) => ({ id, avatar_url: `/media/avatars/${id}.png`, created_at: '2026-11-01T10:00:00Z', is_current: current });
const renderHero = (hasCustomAvatar: boolean) => {
  const props = { onOpenAvatar: vi.fn(), onPickAvatar: vi.fn() };
  render(<ProfileHero username="myron" displayName="Myron" avatarUrl={hasCustomAvatar ? '/media/avatars/1.png' : ''} hasCustomAvatar={hasCustomAvatar}
    isUploadingAvatar={false} {...props} />);
  return props;
};

describe('ProfileHero', () => {
  it('opens the photo history at the current photo or at an earlier one from the strip', () => {
    history.avatars = [photo(1, true), photo(2), photo(3), photo(4), photo(5)];
    const { onOpenAvatar } = renderHero(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile photos (5)' }));
    expect(onOpenAvatar).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Profile photo 3 of 5' }));
    expect(onOpenAvatar).toHaveBeenLastCalledWith(2);
    expect(screen.queryByRole('button', { name: 'Profile photo 5 of 5' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1 more photos' }));
    expect(onOpenAvatar).toHaveBeenLastCalledWith(4);
    expect(screen.getByText(t.earlierPhotos)).toBeInTheDocument();
  });

  it('hides the strip when there is only the current photo', () => {
    history.avatars = [photo(1, true)];
    renderHero(true);
    expect(screen.queryByText(t.earlierPhotos)).not.toBeInTheDocument();
    expect(screen.getByLabelText(en.changeAvatar)).toBeInTheDocument();
  });

  it('asks for a first photo when there is none', () => {
    const { onPickAvatar, onOpenAvatar } = renderHero(false);
    expect(screen.queryByRole('button', { name: /Open profile photos/ })).not.toBeInTheDocument();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(t.addPhoto, { selector: 'input' }), { target: { files: [file] } });
    expect(onPickAvatar).toHaveBeenCalledWith(file);
    expect(onOpenAvatar).not.toHaveBeenCalled();
  });
});
