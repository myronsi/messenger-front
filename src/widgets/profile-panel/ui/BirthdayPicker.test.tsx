import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { BirthdayPicker } from './BirthdayPicker';
import type { BirthdayDraft } from '../model/useProfileExtrasDraft';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => false }));

const t = en.profileExtras;
const Harness = ({ initial, onChange }: { initial: BirthdayDraft; onChange: (draft: BirthdayDraft) => void }) => {
  const [value, setValue] = useState(initial);
  return <BirthdayPicker value={value} onChange={(next) => { setValue(next); onChange(next); }} />;
};
const wheel = (name: string) => screen.getByRole('listbox', { name });

describe('BirthdayPicker', () => {
  it('offers to add a birthday and saves the picked day and month without a year', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ day: '', month: '', year: '' }} onChange={onChange} />);
    expect(screen.getByTestId('birthday-row')).toHaveTextContent(t.birthdayAdd);
    fireEvent.click(screen.getByTestId('birthday-row'));
    const sheet = screen.getByTestId('birthday-sheet');
    expect(within(sheet).getAllByRole('listbox').map((list) => list.getAttribute('aria-label'))).toEqual([t.birthdayDay, t.birthdayMonth, t.birthdayYear]);
    fireEvent.click(within(wheel(t.birthdayMonth)).getByRole('option', { name: 'August' }));
    fireEvent.click(within(wheel(t.birthdayDay)).getByRole('option', { name: '20' }));
    expect(screen.getByTestId('birthday-preview')).toHaveTextContent('20 August');
    fireEvent.click(screen.getByRole('button', { name: t.birthdayDone }));
    expect(onChange).toHaveBeenLastCalledWith({ day: '20', month: '8', year: '' });
    expect(screen.getByTestId('birthday-row')).toHaveTextContent('20 August');
  });

  it('keeps the day valid when the month or year changes', () => {
    render(<Harness initial={{ day: '31', month: '1', year: '' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('birthday-row'));
    fireEvent.click(within(wheel(t.birthdayMonth)).getByRole('option', { name: 'April' }));
    expect(within(wheel(t.birthdayDay)).getByRole('option', { selected: true })).toHaveTextContent('30');
    fireEvent.click(within(wheel(t.birthdayMonth)).getByRole('option', { name: 'February' }));
    expect(within(wheel(t.birthdayDay)).getByRole('option', { selected: true })).toHaveTextContent('29');
    fireEvent.click(within(wheel(t.birthdayYear)).getByRole('option', { name: '2026' }));
    expect(within(wheel(t.birthdayDay)).getByRole('option', { selected: true })).toHaveTextContent('28');
  });

  it('cancels without changes and removes a saved birthday', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ day: '20', month: '8', year: '2003' }} onChange={onChange} />);
    expect(screen.getByTestId('birthday-row')).toHaveTextContent('20 August 2003');
    fireEvent.click(screen.getByTestId('birthday-row'));
    fireEvent.click(screen.getByRole('button', { name: t.editCancel }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('birthday-row'));
    fireEvent.click(screen.getByRole('button', { name: t.removeBirthday }));
    expect(onChange).toHaveBeenLastCalledWith({ day: '', month: '', year: '' });
    expect(screen.getByTestId('birthday-row')).toHaveTextContent(t.birthdayAdd);
  });
});
