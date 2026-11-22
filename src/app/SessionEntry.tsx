import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { currentUserApi, type CurrentUser } from '@/shared/api/currentUserApi';
import { syncTimeZone } from '@/shared/api/syncTimeZone';
import { readSignedInUser } from '@/shared/auth/signedInUser';
import { expectsRefreshSession, getAccessToken, refreshAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { CurrentUsernameContext } from '@/shared/contexts/CurrentUsernameContext';
import { pathOutsideAuth } from '@/shared/lib/authPaths';
import { inviteTokenFromPath, publicNameFromPath, returnPath } from '@/shared/lib/returnPath';
import { Button } from '@/shared/ui/button';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';
import { watchCurrentUser } from './watchCurrentUser';
import { watchSessionChanges } from './watchSessionChanges';

const loadMessenger = () => import('@/pages/messenger').then(({ MessengerApp }) => ({ default: MessengerApp }));
const MessengerApp = lazy(loadMessenger);
const AuthFlowPage = lazy(() => import('@/pages/auth').then(module => ({ default: module.AuthFlowPage })));
const PublicLinkPage = lazy(() => import('@/pages/auth').then(module => ({ default: module.PublicLinkPage })));
const JoinGroupDialog = lazy(() => import('@/features/sharing').then(module => ({ default: module.JoinGroupDialog })));

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
    if (getAccessToken() || expectsRefreshSession()) void loadMessenger().catch(() => undefined);
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
        if (!getAccessToken()) {
          const restored = await refreshAccessToken();
          if (!restored) return {};
          const remembered = readSignedInUser<CurrentUser>(restored);
          if (remembered) {
            dispatch(currentUserApi.util.upsertQueryEntries([{ endpointName: 'getCurrentUser', arg: undefined, value: remembered }]));
            setUsername(remembered.username);
            setChecking(false);
          }
        }
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
        void syncTimeZone(user.time_zone);
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
    navigate(target === '/' ? returnPath(location.pathname, location.search, location.state) : target, { replace: true });
  }, [username, location.pathname, location.search, location.state, navigate]);

  const handleLogin = (user: string) => {
    stopWatching.current();
    setUsername(user);
    setChecking(false);
    navigate(returnPath(location.pathname, location.search, location.state));
  };

  const publicName = publicNameFromPath(location.pathname);
  const inviteToken = inviteTokenFromPath(location.pathname);
  const publicTarget = publicName ? { kind: 'name' as const, name: publicName } : inviteToken ? { kind: 'invite' as const, token: inviteToken } : null;
  const publicEntry = location.pathname === '/' || pathOutsideAuth(location.pathname) !== null || !!publicTarget;
  if (checking && (getAccessToken() || expectsRefreshSession() || !publicEntry)) return <SessionLoading />;

  return (
    <ChunkErrorBoundary key={username ? 'messenger' : 'auth'} fallback={<SessionLoading failed />}>
      <Suspense fallback={username ? <main className="min-h-[100dvh] bg-background" /> : <SessionLoading />}>
        {username
          ? (
            <CurrentUsernameContext.Provider value={username}>
              <MessengerApp username={username} onLogout={() => setUsername('')} />
              {inviteToken && <Suspense fallback={null}><JoinGroupDialog key={inviteToken} token={inviteToken} onClose={() => navigate('/', { replace: true })} /></Suspense>}
            </CurrentUsernameContext.Provider>
          )
          : publicTarget ? <PublicLinkPage target={publicTarget} /> : <AuthFlowPage onLoginSuccess={handleLogin} />}
      </Suspense>
    </ChunkErrorBoundary>
  );
}
