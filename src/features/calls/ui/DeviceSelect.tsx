import React from 'react';
import type { DeviceOption } from '../model/stores';

interface DeviceSelectProps {
  id: string;
  label: string;
  defaultLabel: string;
  value: string;
  options: DeviceOption[];
  onChange: (deviceId: string) => void;
}

const DeviceSelect: React.FC<DeviceSelectProps> = ({ id, label, defaultLabel, value, options, onChange }) => (
  <div className="flex min-w-0 flex-col gap-1 text-sm">
    <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
    <select
      id={id}
      value={options.some((option) => option.id === value) ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">{defaultLabel}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  </div>
);

export default DeviceSelect;
