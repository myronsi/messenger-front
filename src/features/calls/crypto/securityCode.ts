import type { RosterEntry } from '../model/callState';
import { decodeIdentityKey, sha256, toHex, utf8 } from './encoding';

export const SECURITY_CODE_LABEL = 'messenger-call-code/v1';
export const SECURITY_CODE_GROUPS = 6;

export const identityFingerprint = async (identityKey: string) => toHex(await sha256(decodeIdentityKey(identityKey)));

export const securityCodeInput = async (callId: string, epoch: number, roster: readonly RosterEntry[]) => {
  const entries = await Promise.all(roster.map(async (entry) => `${entry.user_id}|${entry.session_id}|${await identityFingerprint(entry.identity_key)}`));
  entries.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [SECURITY_CODE_LABEL, callId, String(epoch), ...entries].join('|');
};

export const codeGroups = (digest: Uint8Array) => {
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  return Array.from({ length: SECURITY_CODE_GROUPS }, (_, index) => String(view.getUint32(index * 4, false) % 100_000).padStart(5, '0'));
};

export const securityCode = async (callId: string, epoch: number, roster: readonly RosterEntry[]) => (
  codeGroups(await sha256(utf8(await securityCodeInput(callId, epoch, roster))))
);
