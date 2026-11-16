import { useEffect, useRef, useState } from 'react';
import type { Birthday, User } from '@/entities/user';
import { isValidBirthday } from '@/shared/ui/profile/birthday';

export interface BirthdayDraft {
  day: string;
  month: string;
  year: string;
}

const EMPTY_BIRTHDAY: BirthdayDraft = { day: '', month: '', year: '' };

export const birthdayDraftOf = (birthday?: Birthday | null): BirthdayDraft => (
  birthday ? { day: String(birthday.day), month: String(birthday.month), year: birthday.year === null ? '' : String(birthday.year) } : EMPTY_BIRTHDAY
);

export const birthdayFromDraft = (draft: BirthdayDraft): Birthday | null | 'invalid' => {
  if (!draft.day && !draft.month && !draft.year) return null;
  if (!draft.day || !draft.month) return 'invalid';
  const birthday: Birthday = { day: Number(draft.day), month: Number(draft.month), year: draft.year ? Number(draft.year) : null };
  return isValidBirthday(birthday) ? birthday : 'invalid';
};

const sameBirthday = (a: BirthdayDraft, b: BirthdayDraft) => a.day === b.day && a.month === b.month && a.year === b.year;

export type ProfileExtrasPatch = { pronouns?: string | null; birthday?: Birthday | null };

export const useProfileExtrasDraft = (user?: Pick<User, 'pronouns' | 'birthday'> | null) => {
  const [pronouns, setPronouns] = useState('');
  const [birthday, setBirthday] = useState<BirthdayDraft>(EMPTY_BIRTHDAY);
  const saved = useRef({ pronouns: '', birthday: EMPTY_BIRTHDAY });

  useEffect(() => {
    if (!user) return;
    const previous = saved.current;
    const next = { pronouns: user.pronouns || '', birthday: birthdayDraftOf(user.birthday) };
    saved.current = next;
    setPronouns((draft) => (draft === previous.pronouns ? next.pronouns : draft));
    setBirthday((draft) => (sameBirthday(draft, previous.birthday) ? next.birthday : draft));
  }, [user]);

  const pronounsChanged = pronouns.trim() !== saved.current.pronouns;
  const birthdayChanged = !sameBirthday(birthday, saved.current.birthday);
  const parsedBirthday = birthdayFromDraft(birthday);
  const birthdayInvalid = parsedBirthday === 'invalid';

  const patch = (): ProfileExtrasPatch => ({
    ...(pronounsChanged ? { pronouns: pronouns.trim() || null } : {}),
    ...(birthdayChanged && parsedBirthday !== 'invalid' ? { birthday: parsedBirthday } : {}),
  });

  const discard = () => {
    setPronouns(saved.current.pronouns);
    setBirthday(saved.current.birthday);
  };

  return {
    pronouns, setPronouns, birthday, setBirthday, birthdayInvalid,
    changed: pronounsChanged || birthdayChanged, patch, discard,
  };
};

export type ProfileExtrasDraft = ReturnType<typeof useProfileExtrasDraft>;
