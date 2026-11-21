import { cn } from '@/shared/lib/utils';

interface ReasonChipsProps<T extends string> {
  name: string;
  legend: string;
  reasons: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
}

export const ReasonChips = <T extends string>({ name, legend, reasons, labels, value, onChange }: ReasonChipsProps<T>) => (
  <fieldset className="mb-4">
    <legend className="mb-2 text-sm text-muted-foreground">{legend}</legend>
    <div className="flex flex-wrap gap-2">
      {reasons.map((key) => (
        <label key={key} className={cn(
          'motion-press cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
          value === key ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:bg-accent',
        )}>
          <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="sr-only" />
          {labels[key]}
        </label>
      ))}
    </div>
  </fieldset>
);
