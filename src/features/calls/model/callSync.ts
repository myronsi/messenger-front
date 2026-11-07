import { realtime } from '@/shared/api/realtime';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSession } from '@/shared/auth/tokenClaims';
import { callsApi } from '../api/callsApi';
import { forgetIdentities } from '../crypto/identity';
import { loadCallConfig, stopCallConfigLoading } from './availability';
import { catchUpCallKeys, deliverCallKeys, followCalls, hangUpLocally, ownsCallMedia } from './callController';
import { isCallOver, pruneEndedCalls } from './callState';
import { isMediaOwnedElsewhere, onMediaOwnershipChange, waitForMediaRelease } from './tabOwnership';
import { callsStore, patchSession, receiveCall, receiveCalls, resetCallStores, sessionStore } from './stores';

export const refreshCalls = async () => {
  const calls = await callsApi.list();
  receiveCalls(calls);
  const listed = new Set(calls.map((call) => call.id));
  const stale = Object.values(callsStore.get().byId).filter((call) => !isCallOver(call) && !listed.has(call.id));
  await Promise.all(stale.map((call) => callsApi.get(call.id).then(receiveCall).catch(() => undefined)));
};

export const refreshChatCall = async (chatId: string) => {
  const call = await callsApi.chatCall(chatId).catch(() => null);
  if (call) receiveCall(call);
};

const watchOtherTabs = () => {
  let stopWaiting: (() => void) | null = null;
  let checking = false;
  let stopped = false;
  let latest = 0;
  const check = async () => {
    const run = ++latest;
    checking = true;
    try {
      const elsewhere = await isMediaOwnedElsewhere(ownsCallMedia());
      if (stopped || run !== latest) return;
      if (sessionStore.get().otherTab !== elsewhere && !sessionStore.get().callId) patchSession({ otherTab: elsewhere });
      if (!elsewhere || stopWaiting) return;
      stopWaiting = waitForMediaRelease(() => {
        stopWaiting = null;
        void check();
      });
    } finally {
      if (run === latest) checking = false;
    }
  };
  const stopSession = sessionStore.subscribe(() => {
    const session = sessionStore.get();
    if (session.otherTab && !session.callId && !stopWaiting && !checking && !stopped) void check();
  });
  return {
    check: () => { void check(); },
    stop: () => {
      stopped = true;
      stopSession();
      stopWaiting?.();
      stopWaiting = null;
    },
  };
};

export const startCallSync = () => {
  const session = getTokenSession(getAccessToken());
  const otherTabs = watchOtherTabs();
  void loadCallConfig();
  otherTabs.check();
  const stopFollowing = callsStore.subscribe(followCalls);
  const stopRealtime = realtime.subscribe({
    onOpen: () => {
      void loadCallConfig();
      void refreshCalls().catch(() => undefined);
      catchUpCallKeys();
    },
    onEvent: (event) => {
      if (event.type === 'call_updated') receiveCall(event.data.call);
      else if (event.type === 'call_keys') deliverCallKeys(event.data);
    },
  });
  const stopTabs = onMediaOwnershipChange(otherTabs.check);
  const onVisible = () => { if (document.visibilityState === 'visible') void loadCallConfig(); };
  document.addEventListener('visibilitychange', onVisible);
  const stopToken = subscribeToAccessToken((token) => {
    if (token && getTokenSession(token) === session) return;
    void hangUpLocally(null);
    if (!token) void forgetIdentities().catch(() => undefined);
  });
  const prune = window.setInterval(() => callsStore.update((state) => pruneEndedCalls(state, Date.now())), 5_000);
  return () => {
    window.clearInterval(prune);
    document.removeEventListener('visibilitychange', onVisible);
    stopCallConfigLoading();
    otherTabs.stop();
    stopToken();
    stopTabs();
    stopRealtime();
    stopFollowing();
    void hangUpLocally(null);
    resetCallStores();
  };
};
