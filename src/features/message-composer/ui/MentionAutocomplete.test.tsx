import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUsernameContext } from '@/shared/contexts/CurrentUsernameContext';
import { MentionAutocomplete } from './MentionAutocomplete';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));

const members = [
  { username: 'anna', display_name: 'Anna Keller' },
  { username: 'andrej', display_name: 'Andrej' },
  { username: 'me', display_name: 'Me' },
];

const Composer = ({ onSend, canMentionAll = false }: { onSend: () => void; canMentionAll?: boolean }) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);
  return (
    <CurrentUsernameContext.Provider value="me">
      <div className="relative">
        <textarea aria-label="message" ref={ref} value={value} onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') onSend(); }} />
        <MentionAutocomplete inputRef={ref} members={members} canMentionAll={canMentionAll} value={value} onChange={setValue} />
      </div>
    </CurrentUsernameContext.Provider>
  );
};

describe('MentionAutocomplete', () => {
  it('suggests group members after @ and inserts the picked name', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('message');
    fireEvent.change(field, { target: { value: 'hi @an', selectionStart: 6 } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Anna Keller@anna', 'Andrej@andrej']);
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(field.value).toBe('hi @andrej ');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('never suggests the sender and offers @all to admins', () => {
    render(<Composer onSend={() => undefined} canMentionAll />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('message');
    fireEvent.change(field, { target: { value: '@', selectionStart: 1 } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Everyone in this group@all', 'Anna Keller@anna', 'Andrej@andrej']);
    fireEvent.mouseDown(screen.getAllByRole('option')[0]);
    expect(field.value).toBe('@all ');
  });

  it('closes on Escape and lets Enter send again', () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const field = screen.getByLabelText<HTMLTextAreaElement>('message');
    fireEvent.change(field, { target: { value: '@an', selectionStart: 3 } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).toHaveBeenCalled();
  });
});
