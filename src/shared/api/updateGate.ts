import { useSyncExternalStore } from 'react';
import { compareVersions } from '@/shared/lib/apiVersion';
import { CLIENT_API_VERSION } from './clientVersion';

// none: up to date, available: a newer backend exists (banner), required: this client can no longer talk to it (blocking dialog).
export type UpdateStatus = 'none' | 'available' | 'required';
export type ReportedStatus = Exclude<UpdateStatus, 'none'>;

export interface ServerVersions {
  apiVersion?: unknown;
  minClientApiVersion?: unknown;
}

let status: UpdateStatus = 'none';
const listeners = new Set<() => void>();

const setStatus = (next: ReportedStatus) => {
  // Once an update is required it stays required until the page reloads.
  if (status === 'required' || next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
};

export const getUpdateStatus = () => status;

export const subscribeToUpdateStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useUpdateStatus = () => useSyncExternalStore(subscribeToUpdateStatus, getUpdateStatus, getUpdateStatus);

export const reportClientOutdated = () => setStatus('required');

// Compares what the backend announces (WebSocket hello, /api/v2/meta) with the contract version of this client.
export const reportServerVersions = ({ apiVersion, minClientApiVersion }: ServerVersions) => {
  if (compareVersions(minClientApiVersion, CLIENT_API_VERSION) === 1) {
    setStatus('required');
  } else if (compareVersions(apiVersion, CLIENT_API_VERSION) === 1) {
    setStatus('available');
  }
};

export const resetUpdateStatusForTests = () => {
  status = 'none';
  listeners.forEach((listener) => listener());
};