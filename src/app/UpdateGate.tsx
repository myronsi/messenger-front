import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useUpdateStatus } from '@/shared/api/updateGate';
import { useServerVersionCheck } from '@/shared/api/useServerVersionCheck';
import { reloadApp } from '@/shared/lib/reloadApp';

// Blocks the app when the backend rejects this client (or announces a higher minimum contract version),
// and shows a dismissible banner when a newer, still compatible backend is available.
// Above the fixed panels of the app (the profile panel is z-[1000]), so the gate can never be hidden.
const GATE_LAYER = 'z-[1100]';

const UpdateGate = () => {
  const status = useUpdateStatus();
  const { translations } = useLanguage();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // Bundled native builds cannot update by reloading; the update comes from the app store.
  const isNative = Capacitor.isNativePlatform();
  useServerVersionCheck();

  if (status === 'required') {
    return (
      <AlertDialog open>
        <AlertDialogContent className={GATE_LAYER} overlayClassName={GATE_LAYER} onEscapeKeyDown={(event) => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations.updateRequiredTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {isNative ? translations.updateRequiredNativeDescription : translations.updateRequiredDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isNative && (
            <AlertDialogFooter>
              <AlertDialogAction onClick={(event) => { event.preventDefault(); void reloadApp(); }}>{translations.updateReload}</AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (status === 'available' && !bannerDismissed) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 z-[1100] flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg"
      >
        <span className="text-sm">{isNative ? translations.updateAvailableNativeMessage : translations.updateAvailableMessage}</span>
        {!isNative && <Button size="sm" onClick={() => { void reloadApp(); }}>{translations.updateReload}</Button>}
        <Button size="sm" variant="ghost" onClick={() => setBannerDismissed(true)}>{translations.updateLater}</Button>
      </div>
    );
  }

  return null;
};

export default UpdateGate;