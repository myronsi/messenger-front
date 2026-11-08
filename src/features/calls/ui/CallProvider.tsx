import React, { lazy, Suspense, useEffect } from 'react';
import { isNativeShell, loadCallConfig, useCallsEnabledOnServer } from '../model/availability';
import { startCallSync } from '../model/callSync';

const CallOverlay = lazy(() => import('./CallOverlay'));

interface CallProviderProps {
  openChatId?: string | null;
}

const CallProvider: React.FC<CallProviderProps> = ({ openChatId = null }) => {
  const native = isNativeShell();
  const enabled = useCallsEnabledOnServer();

  useEffect(() => {
    if (!native) return startCallSync();
    void loadCallConfig();
    return undefined;
  }, [native]);

  if (native || !enabled) return null;
  return (
    <Suspense fallback={null}>
      <CallOverlay openChatId={openChatId} />
    </Suspense>
  );
};

export default CallProvider;
