import { Capacitor } from '@capacitor/core';
import { callsApi } from '../api/callsApi';
import { useStore } from './createStore';
import { configStore } from './stores';

export const isNativeShell = () => Capacitor.isNativePlatform();

export const browserSupportsCallEncryption = () => {
  if (typeof window === 'undefined') return false;
  const scope = window as unknown as { RTCRtpScriptTransform?: unknown; RTCRtpSender?: { prototype: object } };
  if (typeof scope.RTCRtpScriptTransform !== 'undefined') return true;
  return typeof scope.RTCRtpSender !== 'undefined' && 'createEncodedStreams' in scope.RTCRtpSender.prototype;
};

let loading: Promise<void> | null = null;

export const loadCallConfig = () => {
  loading ??= callsApi.config()
    .then((config) => configStore.set(config))
    .catch(() => configStore.set({ enabled: false, max_participants: 2, ring_timeout_seconds: 30 }))
    .finally(() => { loading = null; });
  return loading;
};

export const callsEnabledOnServer = () => !!configStore.get()?.enabled;

export const canPlaceCalls = () => callsEnabledOnServer() && !isNativeShell() && browserSupportsCallEncryption();

export const useCallsEnabledOnServer = () => !!useStore(configStore)?.enabled;

export const useCallsAvailable = () => {
  const config = useStore(configStore);
  return !!config?.enabled && !isNativeShell() && browserSupportsCallEncryption();
};
