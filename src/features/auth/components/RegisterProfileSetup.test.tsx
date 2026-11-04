import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { RegisterProfileSetup } from './RegisterProfileSetup';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const setup = (overrides: Partial<React.ComponentProps<typeof RegisterProfileSetup>> = {}) => {
  const props = {
    profileAvatarFile: null, profileAvatarPreview: '', avatarCropFile: null, avatarCropPreview: '', profileBio: '',
    isSavingProfile: false, translations: en, onAvatarChange: vi.fn(), onRemoveAvatar: vi.fn(), onBioChange: vi.fn(),
    onSave: vi.fn(), onSkip: vi.fn(), onCancelCrop: vi.fn(), onConfirmCrop: vi.fn(), ...overrides,
  };
  render(<RegisterProfileSetup {...props} />);
  return props;
};

describe('RegisterProfileSetup', () => {
  it('offers only skipping while nothing is filled in', () => {
    const props = setup();
    expect(screen.queryByRole('button', { name: en.finish })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.skipForNow }));
    expect(props.onSkip).toHaveBeenCalled();
  });

  it('saves with Finish once there is a bio, and skipping still discards it', () => {
    const props = setup({ profileBio: 'hello' });
    fireEvent.click(screen.getByRole('button', { name: en.finish }));
    expect(props.onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: en.skipForNow }));
    expect(props.onSkip).toHaveBeenCalled();
  });

  it('treats a bio of spaces as empty and an avatar as something to save', () => {
    setup({ profileBio: '   ' });
    expect(screen.queryByRole('button', { name: en.finish })).not.toBeInTheDocument();
    setup({ profileAvatarFile: new File(['x'], 'a.png', { type: 'image/png' }) });
    expect(screen.getByRole('button', { name: en.finish })).toBeInTheDocument();
  });
});
