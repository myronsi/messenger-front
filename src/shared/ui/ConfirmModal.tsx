
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ConfirmModalProps {
  title: string;
  message: string;
  consequences?: string[];
  // With passwordPrompt the dialog asks for the password (its label) and hands it to onConfirm.
  onConfirm: (password?: string) => void;
  onCancel: () => void;
  passwordPrompt?: string;
  confirmText?: string;
  cancelText?: string;
  isError?: boolean;
  isDestructive?: boolean;
  contained?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  consequences,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isError = false,
  isDestructive = false,
  contained = false,
  passwordPrompt,
}) => {
  const { translations } = useLanguage();
  const [password, setPassword] = useState('');
  const needsPassword = Boolean(passwordPrompt) && !isError;

  return (
    <div className={`${contained ? 'absolute' : 'fixed'} inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4`}>
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
        {!consequences?.length && !needsPassword && <div className="mb-4" />}
        {needsPassword && (
          <label className="mb-4 grid gap-1 text-sm">
            <span>{passwordPrompt}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && password) onConfirm(password); }}
              className="rounded-md border border-input bg-background px-3 py-2"
              autoFocus
            />
          </label>
        )}
        <div className="flex justify-end space-x-2">
          {!isError && (
            <button
              onClick={onCancel}
              className="motion-press px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              {cancelText || translations.cancel}
            </button>
          )}
          <button
            onClick={isError ? onCancel : () => onConfirm(needsPassword ? password : undefined)}
            disabled={needsPassword && !password}
            className={`motion-press px-4 py-2 rounded-md transition-colors ${
              isError || isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            {isError ? translations.close : confirmText || translations.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
