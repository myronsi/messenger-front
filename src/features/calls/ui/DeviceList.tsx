import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { DeviceOption } from '../model/stores';

interface DeviceListProps {
  label: string;
  defaultLabel: string;
  value: string;
  options: DeviceOption[];
  icon: LucideIcon;
  onChange: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ label, defaultLabel, value, options, icon: Icon, onChange }) => {
  const selected = options.some((option) => option.id === value) ? value : '';
  const rows = [{ id: '', label: defaultLabel }, ...options];
  return (
    <section className="py-1">
      <p className="px-1 pb-1 pt-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const active = row.id === selected;
          return (
            <button key={row.id || 'default'} type="button" role="radio" aria-checked={active} onClick={() => onChange(row.id)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-primary/10 text-foreground' : 'hover:bg-accent',
              )}>
              <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default DeviceList;
