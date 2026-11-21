import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditGroupPage from './EditGroupPage';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/features/message-composer', () => ({ EmojiAutocomplete: () => null }));
vi.mock('@/shared/ui/BackToClose', () => ({ BackToClose: () => null }));
vi.mock('@/features/profile', () => ({
  ProfileBackgroundEditor: ({ onSave }: { onSave: (body: unknown, preview: unknown) => Promise<unknown> }) => (
    <button type="button" onClick={() => void onSave({ kind: 'preset', preset: 'aurora' }, { kind: 'preset', preset: 'aurora' })}>pick aurora</button>
  ),
}));

const renderPage = (onSave = vi.fn().mockResolvedValue(true), onBack = vi.fn()) => {
  render(<EditGroupPage name="Team" description="Old about" avatarUrl="/a.png" background={null} isSaving={false} onSave={onSave} onBack={onBack} />);
  return { onSave, onBack };
};

describe('EditGroupPage', () => {
  it('saves name, description and background together with one Save', async () => {
    const { onSave, onBack } = renderPage();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Group Name' }), { target: { value: 'Dev Team' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'About' }), { target: { value: 'New about' } });
    fireEvent.click(screen.getByRole('button', { name: /Background/ }));
    fireEvent.click(screen.getByRole('button', { name: 'pick aurora' }));
    fireEvent.click(save);
    await waitFor(() => expect(onBack).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({
      info: { name: 'Dev Team', description: 'New about' },
      background: { kind: 'preset', preset: 'aurora' },
    });
  });

  it('sends only what changed', async () => {
    const { onSave } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Background/ }));
    fireEvent.click(screen.getByRole('button', { name: 'pick aurora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ background: { kind: 'preset', preset: 'aurora' } }));
  });

  it('cannot save an empty name', () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Group Name' }), { target: { value: '  ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('asks before leaving with changes and leaves at once without', () => {
    const first = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(first.onBack).toHaveBeenCalledOnce();
  });

  it('keeps the page open and asks when cancelling with unsaved changes', () => {
    const { onBack } = renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'About' }), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Discard/ })).toBeInTheDocument();
  });
});
