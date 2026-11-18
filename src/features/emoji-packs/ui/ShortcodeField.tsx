interface ShortcodeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const ShortcodeField = ({ label, value, onChange, onSubmit }: ShortcodeFieldProps) => (
  <label className="flex min-w-0 flex-1 items-center rounded-xl border border-input bg-background px-2.5 text-sm focus-within:ring-2 focus-within:ring-ring">
    <span aria-hidden="true" className="text-muted-foreground">:</span>
    <input aria-label={label} placeholder={label} value={value} maxLength={32}
      onChange={(event) => onChange(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onSubmit(); } }}
      className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground" />
    <span aria-hidden="true" className="text-muted-foreground">:</span>
  </label>
);
