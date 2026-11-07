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

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 60_000;
let loading: Promise<void> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let epoch = 0;

const clearRetry = () => {
  if (retry !== null) clearTimeout(retry);
  retry = null;
};

export const stopCallConfigLoading = () => {
  clearRetry();
  failures = 0;
  epoch += 1;
  loading = null;
};

const scheduleRetry = () => {
  if (retry !== null) return;
  const delay = Math.min(RETRY_BASE_MS * 2 ** failures, RETRY_MAX_MS);
  failures += 1;
  retry = setTimeout(() => {
    retry = null;
    void loadCallConfig();
  }, delay);
};

export const loadCallConfig = (): Promise<void> => {
  if (loading) return loading;
  const started = epoch;
  const request = callsApi.config()
    .then((config) => {
      if (started !== epoch) return;
      clearRetry();
      failures = 0;
      configStore.set(config);
    })
    .catch(() => { if (started === epoch) scheduleRetry(); })
    .finally(() => { if (loading === request) loading = null; });
  loading = request;
  return request;
};

export const callsEnabledOnServer = () => !!configStore.get()?.enabled;

export const canPlaceCalls = () => callsEnabledOnServer() && !isNativeShell() && browserSupportsCallEncryption();

export const useCallsEnabledOnServer = () => !!useStore(configStore)?.enabled;

export const useCallsAvailable = () => {
  const config = useStore(configStore);
  return !!config?.enabled && !isNativeShell() && browserSupportsCallEncryption();
};
