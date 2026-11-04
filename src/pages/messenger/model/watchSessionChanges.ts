import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';

interface WatchSessionChangesOptions {
  onSignedOut: () => void;
  onAccountChanged: () => void;
}

export const watchSessionChanges = ({ onSignedOut, onAccountChanged }: WatchSessionChangesOptions) => {
  let account = getTokenSubject(getAccessToken());
  const unsubscribe = subscribeToAccessToken((token) => {
    if (!token) {
      account = null;
      onSignedOut();
      return;
    }
    const next = getTokenSubject(token);
    if (account && next && next !== account) {
      onAccountChanged();
      return;
    }
    account = next ?? account;
  });
  return () => {
    unsubscribe();
  };
};
