import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PersonalInfoPage from './PersonalInfoPage';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    translations: {
      changeAvatar: 'Change avatar', bio: 'Bio', profile: 'Profile', settings: 'Settings', unsavedChanges: 'Unsaved changes',
      appShell: { addPhoto: 'Add a profile photo', openPhotos: 'Open profile photos ({count})', earlierPhotos: 'Earlier photos' },
      saveAllChanges: 'Save all changes', discardChanges: 'Discard', leaveUnsavedTitle: 'Save before leaving?', stayOnPage: 'Stay',
    },
  }),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useGetUserAvatarHistoryQuery: () => ({ data: undefined }) }));

type Props = ComponentProps<typeof PersonalInfoPage>;

const renderPage = (overrides: Partial<Props> = {}) => {
  const props: Props = {
    avatarUrl: '/a.png', displayName: 'Ann', isUploadingAvatar: false, onPickAvatar: vi.fn(), newDisplayName: 'Ann',
    displayNameChanged: false, displayNameInvalid: false, isSaving: false, onDisplayNameChange: vi.fn(),
    bio: '', newBio: '', onBioChange: vi.fn(),
    onSaveAll: vi.fn(async () => true), onDiscard: vi.fn(), onBack: vi.fn(), ...overrides,
  };
  render(<PersonalInfoPage {...props} />);
  return props;
};

describe('PersonalInfoPage', () => {
  it('hands a picked photo to the crop step', () => {
    const { onPickAvatar } = renderPage({ hasCustomAvatar: true });
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Change avatar'), { target: { files: [file] } });
    expect(onPickAvatar).toHaveBeenCalledWith(file);
  });

  it('does not take a new photo while one is uploading', () => {
    renderPage({ isUploadingAvatar: true, hasCustomAvatar: true });
    expect(screen.getByLabelText('Change avatar')).toBeDisabled();
  });

  it('goes straight back when nothing changed', () => {
    const { onBack } = renderPage();
    expect(screen.queryByRole('status', { name: 'Unsaved changes' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('warns about unsaved changes and saves them all from the bar', () => {
    const { onSaveAll, onDiscard } = renderPage({ newBio: 'new bio' });
    expect(screen.getByRole('status', { name: 'Unsaved changes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save all changes' }));
    expect(onSaveAll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes and leaves once they are saved', async () => {
    const { onBack, onSaveAll } = renderPage({ displayNameChanged: true, newDisplayName: 'Anna' });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText('Save before leaving?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Save all changes' }).slice(-1)[0]);
    await waitFor(() => expect(onBack).toHaveBeenCalled());
    expect(onSaveAll).toHaveBeenCalled();
  });

  it('stays on the page when saving fails', async () => {
    const { onBack } = renderPage({ newBio: 'x', onSaveAll: vi.fn(async () => false) });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save all changes' }).slice(-1)[0]);
    await waitFor(() => expect(screen.getByText('Save before leaving?')).toBeInTheDocument());
    expect(onBack).not.toHaveBeenCalled();
  });
});
