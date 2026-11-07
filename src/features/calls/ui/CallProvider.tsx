import React, { lazy, Suspense, useEffect } from 'react';
import { isNativeShell, loadCallConfig, useCallsEnabledOnServer } from '../model/availability';
import { startCallSync } from '../model/callSync';

const CallOverlay = lazy(() => import('./CallOverlay'));

const CallProvider: React.FC = () => {
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
      <CallOverlay />
    </Suspense>
  );
};

export default CallProvider;
