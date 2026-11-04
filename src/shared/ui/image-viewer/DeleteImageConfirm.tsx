import React from 'react';
import { trapFocus } from '@/shared/lib/trapFocus';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';

interface DeleteImageConfirmProps {
  busy: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteImageConfirm: React.FC<DeleteImageConfirmProps> = ({ busy, failed, onCancel, onConfirm }) => {
  const { translations } = useLanguage();
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button type="button" tabIndex={-1} aria-hidden="true" disabled={busy} onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/40" />
      <div role="alertdialog" aria-modal="true" aria-label={translations.deletePhotoConfirm} onKeyDown={trapFocus}
        className="motion-panel-in relative w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
        <h3 className="mb-2 text-lg font-semibold leading-none tracking-tight">{translations.deletePhotoConfirm}</h3>
        {failed && <p className="text-sm text-destructive">{translations.photoDeleteFailed}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" autoFocus onClick={onCancel}>{translations.cancel}</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>{translations.delete}</Button>
        </div>
      </div>
    </div>
  );
};
