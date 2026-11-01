import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/auth/session';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { RecoveryKeySettings } from './RecoveryKeySettings';

export const RecoverySetupPrompt = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void authFetch(`${import.meta.env.VITE_BASE_URL}/me`).then(async r => {
      if (r.ok) { const me = await r.json(); if (active) setOpen(me.recovery_setup_required === true); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Protect access to your account</DialogTitle><DialogDescription>Create a recovery key for the updated account recovery system. You can also do this later in Security &amp; devices.</DialogDescription></DialogHeader>{open && <RecoveryKeySettings />}</DialogContent></Dialog>;
};
