import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmojiAutocomplete } from './EmojiAutocomplete';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));
vi.mock('@/entities/emoji', () => ({
  rememberEmoji: vi.fn(),
  useEmojiPacks: () => [{
    id: '1', title: 'Cats', version: 0, is_mine: true, is_installed: true, is_hidden: false, can_edit: true,
    emoji: [
      { id: '10', pack_id: '1', shortcode: 'party', is_animated: false, url: '' },
      { id: '11', pack_id: '1', shortcode: 'parrot', is_animated: false, url: '' },
    ],
  }],
}));

const Composer = ({ onSend }: { onSend: () => void }) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);
  return (
    <div className="relative">
      <textarea aria-label="message" ref={ref} value={value} onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') onSend(); }} />
      <EmojiAutocomplete inputRef={ref} value={value} onChange={setValue} />
    </div>
  );
};

describe('EmojiAutocomplete', () => {
  it('suggests custom emoji for :shortcode and picks one with the keyboard', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('message');
    fireEvent.change(field, { target: { value: 'hi :par', selectionStart: 7 } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([':party:', ':parrot:']);
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(field.value).toBe('hi :parrot: ');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes on Escape and lets Enter send again', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('message');
    fireEvent.change(field, { target: { value: ':pa', selectionStart: 3 } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).toHaveBeenCalled();
  });
});
