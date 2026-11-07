import { securityCode } from '../crypto/securityCode';
import { checkKnownIdentities, type TrustCheck } from '../crypto/trustStore';
import type { RosterEntry } from './callState';
import { currentAccount, patchSession, sessionStore } from './stores';

let codeEpoch = { callId: '', epoch: -1 };

const noChanges: TrustCheck = { changed: [], commit: () => undefined };

const trustCheck = (roster: RosterEntry[]) => {
  const { userId } = currentAccount();
  if (!userId) return Promise.resolve(noChanges);
  return checkKnownIdentities(userId, roster.filter((entry) => entry.user_id !== userId)).catch(() => noChanges);
};

export const onEpoch = async (callId: string, epoch: number, roster: RosterEntry[]) => {
  const newest = !(codeEpoch.callId === callId && codeEpoch.epoch > epoch);
  if (newest) codeEpoch = { callId, epoch };
  const [groups, trust] = await Promise.all([
    newest ? securityCode(callId, epoch, roster).catch(() => null) : Promise.resolve(null),
    trustCheck(roster),
  ]);
  const session = sessionStore.get();
  if (session.callId !== callId) return;
  const keyChanges = [...new Set([...session.keyChanges, ...trust.changed.map((entry) => entry.user_id)])];
  const current = newest && codeEpoch.callId === callId && codeEpoch.epoch === epoch;
  if (current) {
    patchSession({ code: groups ? { epoch, groups } : null, verified: session.code?.epoch === epoch ? session.verified : false, keyChanges });
  } else if (keyChanges.length !== session.keyChanges.length) {
    patchSession({ keyChanges });
  }
  trust.commit();
};
