import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { birthdayDraftOf, birthdayFromDraft, useProfileExtrasDraft } from './useProfileExtrasDraft';

describe('profile extras draft', () => {
  it('parses the birthday fields', () => {
    expect(birthdayFromDraft({ day: '', month: '', year: '' })).toBeNull();
    expect(birthdayFromDraft({ day: '29', month: '2', year: '' })).toEqual({ day: 29, month: 2, year: null });
    expect(birthdayFromDraft({ day: '29', month: '2', year: '2023' })).toBe('invalid');
    expect(birthdayFromDraft({ day: '5', month: '', year: '' })).toBe('invalid');
    expect(birthdayDraftOf({ day: 1, month: 12, year: 1990 })).toEqual({ day: '1', month: '12', year: '1990' });
  });

  it('sends only what changed and can be discarded', () => {
    const user = { pronouns: 'she/her', birthday: { day: 1, month: 5, year: null } };
    const { result } = renderHook(() => useProfileExtrasDraft(user));
    expect(result.current.changed).toBe(false);
    expect(result.current.patch()).toEqual({});

    act(() => result.current.setPronouns('  they/them '));
    expect(result.current.patch()).toEqual({ pronouns: 'they/them' });

    act(() => result.current.setBirthday({ day: '', month: '', year: '' }));
    expect(result.current.patch()).toEqual({ pronouns: 'they/them', birthday: null });

    act(() => result.current.setBirthday({ day: '31', month: '4', year: '' }));
    expect(result.current.birthdayInvalid).toBe(true);
    expect(result.current.patch()).toEqual({ pronouns: 'they/them' });

    act(() => result.current.discard());
    expect(result.current.changed).toBe(false);
    expect(result.current.pronouns).toBe('she/her');
  });
});
