import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { closeAllWebSockets } from '@/shared/api/socketRegistry';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { messengerApi } from './api/messengerApi';

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
let hadSession = Boolean(getAccessToken());
subscribeToAccessToken((token) => {
  if (token) {
    hadSession = true;
    return;
  }
  if (!hadSession) return;
  hadSession = false;
  closeAllWebSockets();
  store.dispatch(messengerApi.util.resetApiState());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;