import { ModalSurface } from '@/shared/ui/ModalSurface';

import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';

interface ConfirmModalProps {
  title: string;
  message: string;
  consequences?: string[];
  onConfirm: (password?: string) => void;
  requirePassword?: boolean;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  isError?: boolean;
  isDestructive?: boolean;
  contained?: boolean;
  details?: React.ReactNode;
  overlayClassName?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  checkbox?: { label: string; checked: boolean; onChange: (checked: boolean) => void };
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  consequences,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  hideCancel = false,
  isError = false,
  isDestructive = false,
  contained = false,
  requirePassword = false,
  details, overlayClassName, returnFocusRef, checkbox,
}) => {
  const { translations } = useLanguage();
  const [password, setPassword] = React.useState('');

  return (
    <ModalSurface label={title} returnFocusRef={returnFocusRef}
      className={cn(`${contained ? 'absolute' : 'fixed'} inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4`, overlayClassName)}
      onClick={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}
      onTouchEnd={event => event.stopPropagation()} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}>
      <div className="motion-panel-in relative bg-card w-full max-w-lg p-6 rounded-lg shadow-lg border border-border">
        <button
          onClick={onCancel}
          className="motion-press absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{translations.close}</span>
        </button>
        <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">{title}</h3>
        <p className="text-muted-foreground mb-3">{message}</p>
        {details}
        {!!consequences?.length && (
          <ul className="mb-4 space-y-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {consequences.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {!consequences?.length && <div className="mb-4" />}
        {checkbox && (
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={checkbox.checked} onChange={event => checkbox.onChange(event.target.checked)} className="h-4 w-4 accent-destructive" />
            <span>{checkbox.label}</span>
          </label>
        )}
        {requirePassword && (
          <label className="mb-4 block text-sm">
            {translations.password}
            <input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
          </label>
        )}
        <div className="flex justify-end space-x-2">
          {!isError && !hideCancel && (
            <button
              onClick={onCancel}
              className="motion-press px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              {cancelText || translations.cancel}
            </button>
          )}
          <button
            onClick={isError ? onCancel : () => onConfirm(password)}
            disabled={requirePassword && !password}
            className={`motion-press px-4 py-2 rounded-md transition-colors ${
              isError || isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isError ? translations.close : confirmText || translations.confirm}
          </button>
        </div>
      </div>
    </ModalSurface>
  );
};

export default ConfirmModal;
