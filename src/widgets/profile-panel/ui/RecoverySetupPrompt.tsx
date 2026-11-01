import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { RecoveryKeySettings } from './RecoveryKeySettings';

export const RecoverySetupPrompt = () => {
  const [open, setOpen] = useState(false);
  const [dismissBlocked, setDismissBlocked] = useState(false);
  const onDismissSafetyChange = useCallback((blocked: boolean) => setDismissBlocked(blocked), []);
  useEffect(() => {
    let active = true;
    void authFetch(`${import.meta.env.VITE_BASE_URL}/me`).then(async r => {
      if (r.ok) { const me = await r.json(); if (active) setOpen(me.recovery_setup_required === true); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <Dialog open={open} onOpenChange={next => { if (next || !dismissBlocked) setOpen(next); }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        hideClose={dismissBlocked}
        onEscapeKeyDown={event => { if (dismissBlocked) event.preventDefault(); }}
        onPointerDownOutside={event => { if (dismissBlocked) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Protect access to your account</DialogTitle>
          <DialogDescription>
            Create a recovery key for the updated account recovery system. You can also do this later in Security &amp; devices.
            Once a key is issued, save and acknowledge it before closing.
          </DialogDescription>
        </DialogHeader>
        {open && <RecoveryKeySettings onDismissSafetyChange={onDismissSafetyChange} />}
      </DialogContent>
    </Dialog>
  );
};
