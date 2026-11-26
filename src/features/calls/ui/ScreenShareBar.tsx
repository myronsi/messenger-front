import React from 'react';
import { ScreenShare } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { stopScreenShare } from '../model/callControls';

const ScreenShareBar: React.FC = () => {
  const { translations } = useLanguage();
  return (
    <div role="status" className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
      <ScreenShare className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{translations.callSharingBar}</span>
      <Button size="sm" variant="destructive" onClick={() => { void stopScreenShare(); }}>{translations.callSharingStop}</Button>
    </div>
  );
};

export default ScreenShareBar;
