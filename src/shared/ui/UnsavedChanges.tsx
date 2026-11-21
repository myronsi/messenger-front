import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

interface UnsavedChangesBarProps {
  isSaving: boolean;
  canSave?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({ isSaving, canSave = true, onSave, onDiscard }) => {
  const { translations } = useLanguage();
  return (
    <div role="status" aria-label={translations.unsavedChanges} className="motion-selection-bar flex items-center gap-2 border-t border-border bg-background px-5 py-3">
      <Button type="button" variant="outline" className="flex-1" onClick={onDiscard} disabled={isSaving}>{translations.discardChanges}</Button>
      <Button type="button" className="flex-1" onClick={onSave} disabled={isSaving || !canSave}>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {translations.saveAllChanges}
      </Button>
    </div>
  );
};

interface LeaveUnsavedDialogProps {
  open: boolean;
  text: string;
  isSaving: boolean;
  canSave?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

export const LeaveUnsavedDialog: React.FC<LeaveUnsavedDialogProps> = ({ open, text, isSaving, canSave = true, onSave, onDiscard, onStay }) => {
  const { translations } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && !next && onStay()}>
      <DialogContent className="z-[1300] max-w-sm" overlayClassName="z-[1300]">
        <DialogHeader>
          <DialogTitle>{translations.leaveUnsavedTitle}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onSave} disabled={isSaving || !canSave}>{translations.saveAllChanges}</Button>
          <Button type="button" variant="outline" disabled={isSaving} onClick={onDiscard}>{translations.discardChanges}</Button>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onStay}>{translations.stayOnPage}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
