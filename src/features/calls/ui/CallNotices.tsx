import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { confirmTakeover } from '../model/callController';
import { cancelTakeover, dismissCallNotice } from '../model/callControls';
import type { CallSession } from '../model/stores';
import { noticeText } from './callHooks';

const CallNotices: React.FC<{ session: CallSession }> = ({ session }) => {
  const { translations } = useLanguage();
  const message = session.notice ? noticeText(translations, session.notice) : session.otherTab && !session.callId ? translations.callInOtherTab : '';
  return (
    <>
      {message && (
        <div role={session.notice && session.notice !== 'ended' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-start gap-2 rounded-xl border border-border bg-background p-3 text-sm shadow-lg">
          <span className="min-w-0 flex-1">{message}</span>
          <button type="button" onClick={dismissCallNotice} aria-label={translations.callDismiss}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <AlertDialog open={!!session.takeoverCallId} onOpenChange={(open) => { if (!open) cancelTakeover(); }}>
        <AlertDialogContent className="z-[1050]" overlayClassName="z-[1050]">
          <AlertDialogHeader>
            <AlertDialogTitle>{translations.callTakeoverTitle}</AlertDialogTitle>
            <AlertDialogDescription>{translations.callTakeoverText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations.callCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void confirmTakeover(); }}>{translations.callTakeoverConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CallNotices;
