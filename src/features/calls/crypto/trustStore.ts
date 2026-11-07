import type { RosterEntry } from '../model/callState';
import { identityFingerprint } from './securityCode';

const MAX_ENTRIES = 500;
const storageKey = (account: string) => `messenger:call-identities:${account}`;

export type KnownIdentities = Record<string, string>;

export interface TrustResult {
  known: KnownIdentities;
  changed: RosterEntry[];
}

export const compareIdentities = (known: KnownIdentities, entries: readonly (RosterEntry & { fingerprint: string })[]): TrustResult => {
  const next = { ...known };
  const changed: RosterEntry[] = [];
  entries.forEach(({ fingerprint, ...entry }) => {
    const id = `${entry.user_id}:${entry.session_id}`;
    if (next[id] && next[id] !== fingerprint) changed.push(entry);
    delete next[id];
    next[id] = fingerprint;
  });
  const ids = Object.keys(next);
  ids.slice(0, Math.max(0, ids.length - MAX_ENTRIES)).forEach((id) => { delete next[id]; });
  return { known: next, changed };
};

const read = (account: string): KnownIdentities => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(account)) || '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as KnownIdentities : {};
  } catch {
    return {};
  }
};

export const checkKnownIdentities = async (account: string, entries: readonly RosterEntry[]) => {
  const withFingerprints = await Promise.all(entries.map(async (entry) => ({ ...entry, fingerprint: await identityFingerprint(entry.identity_key) })));
  const result = compareIdentities(read(account), withFingerprints);
  try {
    localStorage.setItem(storageKey(account), JSON.stringify(result.known));
  } catch {
    return result.changed;
  }
  return result.changed;
};
