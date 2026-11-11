import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { currentUserApi, type CurrentUser } from '@/shared/api/currentUserApi';
import { readSignedInUser } from '@/shared/auth/signedInUser';
import { getAccessToken, refreshAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { pathOutsideAuth } from '@/shared/lib/authPaths';
import { notificationReturnPath } from '@/shared/lib/notifications/navigation';
import { Button } from '@/shared/ui/button';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';
import { watchCurrentUser } from './watchCurrentUser';
import { watchSessionChanges } from './watchSessionChanges';

const loadMessenger = () => import('@/pages/messenger').then(({ MessengerApp }) => ({ default: MessengerApp }));
const MessengerApp = lazy(loadMessenger);
const AuthFlowPage = lazy(() => import('@/pages/auth').then(module => ({ default: module.AuthFlowPage })));

function SessionLoading({ failed = false }: { failed?: boolean }) {
  const { translations } = useLanguage();
  const [canRetry, setCanRetry] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setCanRetry(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <p role="status" className="text-sm text-muted-foreground">{failed ? translations.errorLoading : translations.authLayout.checkingSession}</p>
      {(failed || canRetry) && <Button variant="outline" onClick={() => window.location.reload()}>{translations.securityPage.retry}</Button>}
    </main>
  );
}

export function SessionEntry() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [savedUser] = useState(() => readSignedInUser<CurrentUser>(getAccessToken()));
  const [username, setUsername] = useState(savedUser?.username ?? '');
  const [checking, setChecking] = useState(!savedUser);
  const stopWatching = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    if (!savedUser) return;
    dispatch(currentUserApi.util.upsertQueryEntries([{ endpointName: 'getCurrentUser', arg: undefined, value: savedUser }]));
  }, [dispatch, savedUser]);

  useEffect(() => {
    if (getAccessToken()) void loadMessenger().catch(() => undefined);
    const signedOut = () => {
      setUsername('');
      setChecking(false);
    };
    const stopChanges = watchSessionChanges({
      onSignedOut: signedOut,
      onAccountChanged: () => window.location.reload(),
    });
    stopWatching.current = watchCurrentUser({
      fetchMe: async () => {
        // A refresh cookie can restore a session even if local storage has no access token.
        if (!getAccessToken() && !await refreshAccessToken()) return {};
        const result = await dispatch(currentUserApi.endpoints.getCurrentUser.initiate(undefined, {
          subscribe: false,
          forceRefetch: true,
        }));
        const status = result.error && 'status' in result.error ? result.error.status : undefined;
        return { user: result.isSuccess ? result.data : undefined, status: typeof status === 'number' ? status : undefined };
      },
      onUser: user => {
        setUsername(user.username);
        setChecking(false);
      },
      onSignedOut: signedOut,
    });
    return () => {
      stopWatching.current();
      stopChanges();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!username) return;
    const token = getAccessToken();
    let active = true;
    void import('@/entities/chat').then(({ chatApi }) => {
      const current = getAccessToken();
      if (!active || !token || !current || hasSessionChanged(token, current)) return;
      dispatch(chatApi.util.prefetch('getOneOnOneChats', username, { ifOlderThan: 10 }));
      dispatch(chatApi.util.prefetch('getGroupChats', username, { ifOlderThan: 10 }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [dispatch, username]);

  useEffect(() => {
    const target = username ? pathOutsideAuth(location.pathname) : null;
    if (target === null) return;
    navigate(target === '/' ? notificationReturnPath(location.pathname, location.search, location.state) : target, { replace: true });
  }, [username, location.pathname, location.search, location.state, navigate]);

  const handleLogin = (user: string) => {
    stopWatching.current();
    setUsername(user);
    setChecking(false);
    navigate(notificationReturnPath(location.pathname, location.search, location.state));
  };

  const publicEntry = location.pathname === '/' || pathOutsideAuth(location.pathname) !== null;
  if (checking && (getAccessToken() || !publicEntry)) return <SessionLoading />;

  return (
    <ChunkErrorBoundary key={username ? 'messenger' : 'auth'} fallback={<SessionLoading failed />}>
      <Suspense fallback={username ? <main className="min-h-[100dvh] bg-background" /> : <SessionLoading />}>
        {username
          ? <MessengerApp username={username} onLogout={() => setUsername('')} />
          : <AuthFlowPage onLoginSuccess={handleLogin} />}
      </Suspense>
    </ChunkErrorBoundary>
  );
}
