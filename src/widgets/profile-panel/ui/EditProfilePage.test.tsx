import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { EditProfilePage } from './EditProfilePage';
import type { ProfileExtrasDraft } from '../model/useProfileExtrasDraft';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/entities/emoji', async () => (await import('@/test/emojiMock')).emojiEntityMock());
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useGetUserAvatarHistoryQuery: () => ({ data: { avatars: [] } }) }));
vi.mock('@/features/profile', () => ({
  ProfileMusicEditor: ({ onChange }: { onChange: (value: null) => void }) => <button type="button" onClick={() => onChange(null)}>music editor</button>,
  ProfileBackgroundEditor: ({ onSave }: { onSave: (body: unknown, preview: unknown) => void }) => (
    <button type="button" onClick={() => onSave({ kind: 'preset', preset: 'sunset' }, { kind: 'preset', preset: 'sunset' })}>background editor</button>
  ),
}));

const t = en.profileExtras;
const extras = {
  pronouns: '', setPronouns: vi.fn(), birthday: { day: '', month: '', year: '' }, setBirthday: vi.fn(), birthdayInvalid: false,
  changed: false, patch: () => ({}), discard: vi.fn(),
} as unknown as ProfileExtrasDraft;

type Props = ComponentProps<typeof EditProfilePage>;
const renderPropsBase = (): Props => ({
    username: 'myron', avatarUrl: '/a.png', hasCustomAvatar: false, isUploadingAvatar: false, onPickAvatar: vi.fn(), onOpenAvatar: vi.fn(),
    name: 'Myron', nameInvalid: false, onNameChange: vi.fn(), bio: '', onBioChange: vi.fn(), extras,
    music: null, onMusicChange: vi.fn(), background: null, onBackgroundChange: vi.fn(async () => undefined), mediaVersion: 0,
    hasChanges: false, canSave: true, isSaving: false, onSave: vi.fn(async () => true), onDiscard: vi.fn(), onBack: vi.fn(),
});
const renderPage = (overrides: Partial<Props> = {}) => {
  const props: Props = {
    username: 'myron', avatarUrl: '/a.png', hasCustomAvatar: false, isUploadingAvatar: false, onPickAvatar: vi.fn(), onOpenAvatar: vi.fn(),
    name: 'Myron', nameInvalid: false, onNameChange: vi.fn(), bio: '', onBioChange: vi.fn(), extras,
    music: null, onMusicChange: vi.fn(), background: null, onBackgroundChange: vi.fn(async () => undefined), mediaVersion: 0,
    hasChanges: false, canSave: true, isSaving: false, onSave: vi.fn(async () => true), onDiscard: vi.fn(), onBack: vi.fn(), ...overrides,
  };
  render(<EditProfilePage {...props} />);
  return props;
};

const SystemBack = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>system back</button>;
};

const withRouter = (overrides: Partial<Props>) => {
  const props = { ...renderPropsBase(), ...overrides };
  render(<MemoryRouter><EditProfilePage {...props} /><SystemBack /></MemoryRouter>);
  return props;
};

describe('EditProfilePage back button', () => {
  const width = window.innerWidth;
  afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width }));

  it('leaves edit mode with the back button when nothing changed', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const { onBack } = withRouter({});
    act(() => screen.getByText('system back').click());
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('asks before leaving with unsaved changes and asks again after Stay', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const { onBack } = withRouter({ hasChanges: true });
    act(() => screen.getByText('system back').click());
    expect(await screen.findByText(en.leaveUnsavedText)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.stayOnPage }));
    await waitFor(() => expect(screen.queryByText(en.leaveUnsavedText)).not.toBeInTheDocument());
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    act(() => screen.getByText('system back').click());
    expect(await screen.findByText(en.leaveUnsavedText)).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('EditProfilePage', () => {
  it('edits the name and bio in place and saves only when something changed', () => {
    const { onNameChange, onBioChange } = renderPage();
    expect(screen.getByRole('heading', { name: en.editProfileAction })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.editSave })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(t.nameLabel), { target: { value: 'Myron 2' } });
    expect(onNameChange).toHaveBeenCalledWith('Myron 2');
    fireEvent.change(screen.getByLabelText(en.bio), { target: { value: 'Hi' } });
    expect(onBioChange).toHaveBeenCalledWith('Hi');
    expect(screen.getByText('@myron')).toBeInTheDocument();
  });

  it('saves everything from the header and blocks saving an invalid name', async () => {
    const { onSave } = renderPage({ hasChanges: true });
    fireEvent.click(screen.getByRole('button', { name: t.editSave }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('keeps Save off and shows why when the name is invalid', () => {
    renderPage({ hasChanges: true, canSave: false, nameInvalid: true });
    expect(screen.getByRole('button', { name: t.editSave })).toBeDisabled();
    expect(screen.getByText(en.displayNameError)).toBeInTheDocument();
  });

  it('leaves at once on Cancel without changes and asks first with changes', () => {
    const first = renderPage();
    fireEvent.click(screen.getByRole('button', { name: t.editCancel }));
    expect(first.onBack).toHaveBeenCalled();
  });

  it('asks before throwing changes away', () => {
    const { onBack, onDiscard } = renderPage({ hasChanges: true });
    fireEvent.click(screen.getByRole('button', { name: t.editCancel }));
    expect(onBack).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: en.discardChanges }));
    expect(onDiscard).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  it('opens music and background as rows and hands their drafts up', () => {
    const { onMusicChange, onBackgroundChange } = renderPage({
      music: { attachment: { id: '1' }, title: 'Bed of Roses', artist: 'MSI' } as Props['music'],
    });
    expect(screen.getByText('MSI – Bed of Roses')).toBeInTheDocument();
    expect(screen.getByText(t.noBackground)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.music) }));
    fireEvent.click(screen.getByRole('button', { name: 'music editor' }));
    expect(onMusicChange).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: t.changeBackground }));
    fireEvent.click(screen.getByRole('button', { name: 'background editor' }));
    expect(onBackgroundChange).toHaveBeenCalledWith({ kind: 'preset', preset: 'sunset' }, { kind: 'preset', preset: 'sunset' });
  });

  it('opens the photo history from the avatar and takes a new photo from the camera button', () => {
    const { onOpenAvatar, onPickAvatar } = renderPage({ hasCustomAvatar: true });
    fireEvent.click(screen.getByRole('button', { name: /Open profile photos/ }));
    expect(onOpenAvatar).toHaveBeenCalledWith(0);
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(en.changeAvatar, { selector: 'input' }), { target: { files: [file] } });
    expect(onPickAvatar).toHaveBeenCalledWith(file);
  });
});
