import { getAccessToken } from '@/shared/auth/session';
import { getTokenSession, getTokenSubject } from '@/shared/auth/tokenClaims';
import type { Call, CallConfig } from '../api/callsApi';
import { applyCall, applyCalls, emptyCallsState, type CallsState } from './callState';
import { createStore } from './createStore';

export type CallPhase = 'idle' | 'preparing' | 'connecting' | 'connected' | 'reconnecting' | 'rejoin';
export type CallNotice = 'mic-denied' | 'mic-missing' | 'mic-in-use' | 'mic-failed' | 'unsupported' | 'full' | 'ended' | 'unavailable'
  | 'not-allowed' | 'failed' | 'removed' | 'moved' | 'rate-limited';
export type EncryptionStatus = 'pending' | 'ready' | 'failed';

export interface DeviceOption {
  id: string;
  label: string;
}

export interface CallSession {
  callId: string | null;
  chatId: string | null;
  phase: CallPhase;
  notice: CallNotice | null;
  muted: boolean;
  audioBlocked: boolean;
  encryption: EncryptionStatus;
  code: { epoch: number; groups: string[] } | null;
  verified: boolean;
  keyChanges: string[];
  quality: 'good' | 'poor' | 'unknown';
  inputs: DeviceOption[];
  outputs: DeviceOption[];
  input: string;
  output: string;
  outputSupported: boolean;
  takeoverCallId: string | null;
  otherTab: boolean;
}

export const idleSession: CallSession = {
  callId: null, chatId: null, phase: 'idle', notice: null, muted: false, audioBlocked: false, encryption: 'pending', code: null,
  verified: false, keyChanges: [], quality: 'unknown', inputs: [], outputs: [], input: '', output: '', outputSupported: false,
  takeoverCallId: null, otherTab: false,
};

export const callsStore = createStore<CallsState>(emptyCallsState);
export const sessionStore = createStore<CallSession>(idleSession);
export const configStore = createStore<CallConfig | null>(null);

export const receiveCall = (call: Call) => callsStore.update((state) => applyCall(state, call));
export const receiveCalls = (calls: readonly Call[]) => callsStore.update((state) => applyCalls(state, calls));
export const patchSession = (patch: Partial<CallSession>) => sessionStore.update((session) => ({ ...session, ...patch }));

export const currentAccount = () => {
  const token = getAccessToken();
  return { userId: getTokenSubject(token), sessionId: getTokenSession(token) };
};

export const resetCallStores = () => {
  callsStore.set(emptyCallsState);
  sessionStore.set(idleSession);
  configStore.set(null);
};
