import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { compareVersions } from '@/shared/lib/apiVersion';
import { CLIENT_API_VERSION } from './clientVersion';

export type UpdateStatus = 'none' | 'available' | 'required';

export interface ServerVersions {
  apiVersion?: unknown;
  minClientApiVersion?: unknown;
}

export const DISMISSED_UPDATE_KEY = 'dismissed_update';

let status: UpdateStatus = 'none';
let offeredVersion: string | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const readDismissedUpdate = () => {
  try {
    return localStorage.getItem(DISMISSED_UPDATE_KEY);
  } catch {
    return null;
  }
};

const writeDismissedUpdate = (version: string) => {
  try {
    localStorage.setItem(DISMISSED_UPDATE_KEY, version);
    return true;
  } catch {
    return false;
  }
};

const offerUpdate = (version: string) => {
  if (status === 'required' || version === offeredVersion || version === readDismissedUpdate()) return;
  status = 'available';
  offeredVersion = version;
  notify();
};

export const getUpdateStatus = () => status;

export const getOfferedVersion = () => offeredVersion;

export const subscribeToUpdateStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useUpdateStatus = () => useSyncExternalStore(subscribeToUpdateStatus, getUpdateStatus, getUpdateStatus);

export const reportClientOutdated = () => {
  if (status === 'required') return;
  status = 'required';
  notify();
};

export const reportNewBuild = (buildId: string) => offerUpdate(`build:${buildId}`);

export const reportServerVersions = ({ apiVersion, minClientApiVersion }: ServerVersions) => {
  if (compareVersions(minClientApiVersion, CLIENT_API_VERSION) === 1) {
    reportClientOutdated();
  } else if (Capacitor.isNativePlatform() && compareVersions(apiVersion, CLIENT_API_VERSION) === 1) {
    offerUpdate(`api:${String(apiVersion)}`);
  }
};

export const dismissUpdate = () => {
  if (status !== 'available' || offeredVersion === null) return;
  writeDismissedUpdate(offeredVersion);
  status = 'none';
  notify();
};

export const resetUpdateStatusForTests = () => {
  status = 'none';
  offeredVersion = null;
  notify();
};
