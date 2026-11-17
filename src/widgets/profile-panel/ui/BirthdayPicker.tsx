import { useState, type ReactElement } from 'react';
import { Cake, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { localeOf } from '@/shared/lang/languages';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';
import { SheetGrip } from '@/shared/ui/SheetGrip';
import {
  birthdayFieldOrder, birthdayYears, daysInMonth, formatBirthday, monthNames, type BirthdayField,
} from '@/shared/ui/profile/birthday';
import { WheelColumn } from '@/shared/ui/profile/WheelColumn';
import type { BirthdayDraft } from '../model/useProfileExtrasDraft';

interface Picked {
  day: number;
  month: number;
  year: number | null;
}

interface BirthdayPickerProps {
  value: BirthdayDraft;
  onChange: (next: BirthdayDraft) => void;
}

const fromDraft = (draft: BirthdayDraft, now = new Date()): Picked => (
  draft.day && draft.month
    ? { day: Number(draft.day), month: Number(draft.month), year: draft.year ? Number(draft.year) : null }
    : { day: now.getDate(), month: now.getMonth() + 1, year: null }
);

const toDraft = (picked: Picked): BirthdayDraft => ({ day: String(picked.day), month: String(picked.month), year: picked.year ? String(picked.year) : '' });

export const BirthdayPicker = ({ value, onChange }: BirthdayPickerProps) => {
  const { translations, language } = useLanguage();
  const t = translations.profileExtras;
  const locale = localeOf(language);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked>(() => fromDraft(value));
  const hasValue = !!(value.day && value.month);
  const shown = hasValue ? formatBirthday(fromDraft(value), locale) : '';

  const start = () => {
    setPicked(fromDraft(value));
    setOpen(true);
  };
  const update = (field: BirthdayField, next: number | null) => setPicked((current) => {
    const merged = { ...current, [field]: next } as Picked;
    return { ...merged, day: Math.min(merged.day, daysInMonth(merged.month, merged.year)) };
  });
  const finish = (next: BirthdayDraft | null) => {
    if (next) onChange(next);
    setOpen(false);
  };

  const columns: Record<BirthdayField, ReactElement> = {
    day: <WheelColumn key="day" label={t.birthdayDay} value={picked.day} onChange={(day) => update('day', day)}
      items={Array.from({ length: daysInMonth(picked.month, picked.year) }, (_, index) => ({ value: index + 1, label: String(index + 1) }))} />,
    month: <WheelColumn key="month" label={t.birthdayMonth} value={picked.month} onChange={(month) => update('month', month)} className="flex-[1.6]"
      items={monthNames(locale).map((name, index) => ({ value: index + 1, label: name }))} />,
    year: <WheelColumn<number | null> key="year" label={t.birthdayYear} value={picked.year} onChange={(year) => update('year', year)} className="flex-[1.2]"
      items={[{ value: null, label: t.birthdayNoYear }, ...birthdayYears().map((year) => ({ value: year, label: String(year) }))]} />,
  };
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const body = (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <Title className="text-base font-semibold">{t.birthdayPickerTitle}</Title>
        <p data-testid="birthday-preview" className="mt-1 text-sm text-primary">{formatBirthday(picked, locale)}</p>
      </div>
      <div className="flex gap-1">{birthdayFieldOrder(locale).map((field) => columns[field])}</div>
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={() => finish(toDraft(picked))}>{t.birthdayDone}</Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => finish(null)}>{t.editCancel}</Button>
          {hasValue && (
            <Button type="button" variant="ghost" className="flex-1 text-destructive hover:text-destructive"
              onClick={() => finish({ day: '', month: '', year: '' })}>{t.removeBirthday}</Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" data-testid="birthday-row" onClick={start}
        className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-accent">
        <Cake className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">{t.birthday}</span>
        <span className={`min-w-0 flex-1 truncate text-right text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>{shown || t.birthdayAdd}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
          <DrawerContent aria-describedby={undefined} data-testid="birthday-sheet" className="rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="-mt-px flex h-5 shrink-0 items-center justify-center"><SheetGrip /></div>
            {body}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent aria-describedby={undefined} data-testid="birthday-sheet" className="max-w-sm">{body}</DialogContent>
        </Dialog>
      )}
    </>
  );
};
