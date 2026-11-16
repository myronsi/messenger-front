import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';
import { monthNames } from '@/shared/ui/profile/birthday';
import type { ProfileExtrasDraft } from '../model/useProfileExtrasDraft';

const FIELD = 'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring';
const PRONOUNS_MAX = 40;
const CHIP = 'motion-press rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

export const ProfileExtrasFields = ({ extras }: { extras: ProfileExtrasDraft }) => {
  const { translations, language } = useLanguage();
  const t = translations.profileExtras;
  const suggestions = t.pronounSuggestions.split(',').filter(Boolean);
  const months = monthNames(localeOf(language));
  const { birthday, setBirthday } = extras;
  const hasBirthday = !!(birthday.day || birthday.month || birthday.year);
  return (
    <>
      <section className="rounded-lg border border-border p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="profile-pronouns" className="text-sm font-medium text-foreground">{t.pronouns}</label>
            <span className="shrink-0 text-xs text-muted-foreground">{extras.pronouns.length}/{PRONOUNS_MAX}</span>
          </div>
          <input id="profile-pronouns" type="text" value={extras.pronouns} maxLength={PRONOUNS_MAX} placeholder={t.pronounsHint}
            onChange={(event) => extras.setPronouns(event.target.value)} className={FIELD} />
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((value) => (
              <button key={value} type="button" onClick={() => extras.setPronouns(value)}
                className={CHIP}>
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-border p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{t.birthday}</span>
            {hasBirthday && (
              <button type="button" onClick={() => setBirthday({ day: '', month: '', year: '' })} aria-label={t.removeBirthday}
                className="motion-press flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-[5rem_1fr_6rem] gap-2">
            <select aria-label={t.birthdayDay} value={birthday.day} className={FIELD}
              onChange={(event) => setBirthday({ ...birthday, day: event.target.value })}>
              <option value="">{t.birthdayDay}</option>
              {Array.from({ length: 31 }, (_, index) => <option key={index} value={String(index + 1)}>{index + 1}</option>)}
            </select>
            <select aria-label={t.birthdayMonth} value={birthday.month} className={FIELD}
              onChange={(event) => setBirthday({ ...birthday, month: event.target.value })}>
              <option value="">{t.birthdayMonth}</option>
              {months.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
            </select>
            <input aria-label={t.birthdayYear} inputMode="numeric" placeholder={t.birthdayYear} value={birthday.year} maxLength={4}
              onChange={(event) => setBirthday({ ...birthday, year: event.target.value.replace(/\D/g, '') })} className={FIELD} />
          </div>
          {extras.birthdayInvalid && <p className="text-sm text-destructive">{t.birthdayInvalid}</p>}
        </div>
      </section>
    </>
  );
};
