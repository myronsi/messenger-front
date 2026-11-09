import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';

interface WatchSessionChangesOptions {
  onSignedOut: () => void;
  onAccountChanged: () => void;
}

export const watchSessionChanges = ({ onSignedOut, onAccountChanged }: WatchSessionChangesOptions) => {
  let previousToken = getAccessToken();
  const unsubscribe = subscribeToAccessToken((token) => {
    const changed = previousToken && hasSessionChanged(previousToken, token);
    previousToken = token;
    if (!token) onSignedOut();
    else if (changed) onAccountChanged();
  });
  return () => {
    unsubscribe();
  };
};
