import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ProfileExtrasDraft } from '../model/useProfileExtrasDraft';
import { BirthdayPicker } from './BirthdayPicker';

const FIELD = 'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring';
const PRONOUNS_MAX = 40;
const CHIP = 'motion-press rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

export const ProfileExtrasFields = ({ extras }: { extras: ProfileExtrasDraft }) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const suggestions = t.pronounSuggestions.split(',').filter(Boolean);
  const { birthday, setBirthday } = extras;
  return (
    <div className="space-y-5">
      <div>
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
      </div>
      <div>
        <BirthdayPicker value={birthday} onChange={setBirthday} />
        {extras.birthdayInvalid && <p className="mt-2 text-sm text-destructive">{t.birthdayInvalid}</p>}
      </div>
    </div>
  );
};
