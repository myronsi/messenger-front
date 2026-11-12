import React, { useState } from 'react';
import { AlertCircle, Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';
import { authInputClass, fieldMessageId } from './authFieldStyles';
import { afterPointerRelease } from './pointerRelease';

export const AuthHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="flex flex-col gap-1.5">
    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
    {subtitle && <p className="text-sm text-subtle-foreground">{subtitle}</p>}
  </div>
);

interface AuthFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  valid?: boolean;
  alwaysShowHint?: boolean;
  labelAside?: React.ReactNode;
  footer?: (focused: boolean) => React.ReactNode;
  children: React.ReactNode;
}

export const AuthField: React.FC<AuthFieldProps> = ({ id, label, hint, error, valid, alwaysShowHint, labelAside, footer, children }) => {
  const [focused, setFocused] = useState(false);
  const showHint = Boolean(hint) && (alwaysShowHint || focused || valid);
  return (
    <div className="flex flex-col gap-1.5" onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) afterPointerRelease(() => setFocused(false)); }}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-medium text-subtle-foreground">{label}</Label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={fieldMessageId(id)} role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}
        </p>
      ) : hint ? (
        <p id={showHint ? fieldMessageId(id) : undefined} aria-hidden={showHint ? undefined : true}
          className={cn('flex min-h-4 items-start gap-1.5 text-xs', valid ? 'text-success' : 'text-muted-foreground', !showHint && 'invisible')}>
          {valid && <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />}{hint}
        </p>
      ) : null}
      {footer?.(focused)}
    </div>
  );
};

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  showLabel: string;
  invalid?: boolean;
  revealed?: boolean;
  copy?: { label: string; done: boolean; onCopy: () => void };
};

const iconButton = 'flex w-9 items-center justify-center rounded-md text-muted-foreground hover:text-subtle-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const PasswordInput: React.FC<PasswordInputProps> = ({ showLabel, invalid, revealed = false, copy, className, ...props }) => {
  const [held, setVisible] = useState(false);
  const visible = held || revealed;
  const hide = () => setVisible(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} aria-invalid={invalid || undefined}
        className={cn(authInputClass(invalid), copy ? 'pr-20' : 'pr-11', className)} />
      <div className="absolute inset-y-0 right-1 flex items-stretch py-1">
        {copy && (
          <button type="button" aria-label={copy.label} title={copy.label} onClick={copy.onCopy} className={cn(iconButton, copy.done && 'text-success')}>
            {copy.done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          aria-label={showLabel}
          aria-pressed={visible}
          title={showLabel}
          onPointerDown={() => setVisible(true)}
          onPointerUp={hide}
          onPointerCancel={hide}
          onPointerLeave={hide}
          onTouchEnd={hide}
          onTouchCancel={hide}
          onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setVisible(true); } }}
          onKeyUp={hide}
          onBlur={hide}
          className={iconButton}
        >
          {visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

export const AuthDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
    <span className="h-px flex-1 bg-border" />{label}<span className="h-px flex-1 bg-border" />
  </div>
);

export const AuthSwitchLink: React.FC<{ prompt: string; action: string; onClick: () => void }> = ({ prompt, action, onClick }) => (
  <p className="text-center text-sm text-subtle-foreground">
    {prompt}{' '}
    <button type="button" onClick={onClick} className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {action}
    </button>
  </p>
);
