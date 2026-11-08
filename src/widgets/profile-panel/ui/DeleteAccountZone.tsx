import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export const DeleteAccountZone: React.FC<{ onDelete: () => void; isDeleting: boolean }> = ({ onDelete, isDeleting }) => {
  const { translations } = useLanguage();
  return (
    <section aria-labelledby="delete-account-title" className="flex flex-wrap items-center gap-4 rounded-xl border border-destructive/30 bg-destructive-soft p-4">
      <div className="min-w-[220px] flex-1">
        <h3 id="delete-account-title" className="text-[15px] font-semibold text-destructive">{translations.deleteAccount}</h3>
        <p className="mt-1 text-[13px] text-destructive">{translations.appShell.deleteAccountHint}</p>
      </div>
      <button type="button" onClick={onDelete} disabled={isDeleting}
        className="flex h-10 items-center gap-2 rounded-lg border border-destructive bg-card px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50">
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {translations.deleteAccount}
      </button>
    </section>
  );
};
