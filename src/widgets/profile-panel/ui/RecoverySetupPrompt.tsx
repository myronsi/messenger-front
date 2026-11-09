import { useGetCurrentUserQuery } from '@/features/profile';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { ACCOUNT_PROMPT_LAYER } from '@/shared/ui/layers';
import { RecoveryKeySettings } from './RecoveryKeySettings';

export const RecoverySetupPrompt = () => {
  const [open, setOpen] = useState(false);
  const [dismissBlocked, setDismissBlocked] = useState(false);
  const onDismissSafetyChange = useCallback((blocked: boolean) => setDismissBlocked(blocked), []);
  const { data: me } = useGetCurrentUserQuery();
  const setupRequired = me?.recovery_setup_required === true;
  useEffect(() => { setOpen(setupRequired); }, [setupRequired]);
  return (
    <Dialog open={open} onOpenChange={next => { if (next || !dismissBlocked) setOpen(next); }}>
      <DialogContent
        className={`${ACCOUNT_PROMPT_LAYER} max-h-[90dvh] overflow-y-auto`}
        overlayClassName={ACCOUNT_PROMPT_LAYER}
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
        {open && <RecoveryKeySettings onDismissSafetyChange={onDismissSafetyChange} onReceiptComplete={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};
