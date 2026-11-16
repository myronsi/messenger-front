import { useEffect } from 'react';
import { readConnectionResult, providerName, type ConnectionResult } from '@/features/connections';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';

type ResultTexts = Record<'resultConnected' | 'resultDenied' | 'resultFailed' | 'resultLimit', string>;

const KEYS: Record<ConnectionResult, keyof ResultTexts> = {
  connected: 'resultConnected', denied: 'resultDenied', failed: 'resultFailed', limit: 'resultLimit',
};

export const useConnectionResult = (active: boolean, texts: ResultTexts, onConnected: () => void) => {
  useEffect(() => {
    if (!active) return;
    const found = readConnectionResult(window.location.search);
    if (!found) return;
    const message = fillTemplate(texts[KEYS[found.result]], { provider: providerName(found.provider) });
    if (found.result === 'connected') {
      toast.success(message);
      onConnected();
    } else {
      toast.error(message);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('provider');
    url.searchParams.delete('result');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [active, texts, onConnected]);
};
