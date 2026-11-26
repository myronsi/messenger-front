import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmojiInputButton } from './EmojiInputButton';

vi.mock('@/entities/emoji', async () => (await import('@/test/emojiMock')).emojiEntityMock());
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: new Proxy({}, { get: (_target, key) => String(key) }), language: 'en' }),
}));
vi.mock('./StickerTab', () => ({ StickerTab: () => null }));
vi.mock('@/shared/lib/emojiSets', () => ({ EMOJI_SETS: [{ label: 'emojiSmileys', emoji: ['😀', '😃'] }] }));

const NameField = ({ initial, maxLength }: { initial: string; maxLength?: number }) => {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} aria-label="name" value={value} onChange={(event) => setValue(event.target.value)} />
      <EmojiInputButton inputRef={ref} value={value} onChange={setValue} maxLength={maxLength} />
    </>
  );
};

describe('EmojiInputButton', () => {
  it('inserts the picked emoji at the cursor of the field, with only an emoji panel', () => {
    render(<NameField initial="Myron" />);
    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' });
    field.setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole('button', { name: 'emojiTab' }));
    expect(screen.queryByRole('tab', { name: 'stickersTab' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '😀' }));
    expect(field).toHaveValue('My😀ron');
  });

  it('does not grow the name past its limit', () => {
    render(<NameField initial="abcd" maxLength={5} />);
    fireEvent.click(screen.getByRole('button', { name: 'emojiTab' }));
    fireEvent.click(screen.getByRole('button', { name: '😀' }));
    expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('abcd');
  });
});
