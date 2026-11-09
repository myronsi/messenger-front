import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { closeAllWebSockets } from '@/shared/api/socketRegistry';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';
import { messengerApi } from '@/shared/api/baseApi';
import type { RootState as SharedRootState } from '@/shared/hooks/redux';

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [messengerApi.reducerPath]: messengerApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(messengerApi.middleware),
});

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);

// When the session ends, nothing of the previous user may stay in the cache or on an open socket.
let previousToken = getAccessToken();
subscribeToAccessToken((token) => {
  const shouldReset = previousToken && (!token || hasSessionChanged(previousToken, token));
  previousToken = token;
  if (!shouldReset) return;
  closeAllWebSockets();
  store.dispatch(messengerApi.util.resetApiState());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Compile-time guard: the state typed in shared/hooks/redux must match the real store.
export const assertSharedStateMatchesStore = (state: SharedRootState): RootState => state;