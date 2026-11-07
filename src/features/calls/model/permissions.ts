import type { Call } from '../api/callsApi';

export type CallGroupRole = 'owner' | 'admin' | 'moderator' | 'member';

const ENDING_ROLES = new Set<string>(['owner', 'admin', 'moderator']);

export const canEndForEveryone = (
  call: Pick<Call, 'kind' | 'initiator_id' | 'participants'>,
  userId: string | null | undefined,
  groupRole?: string | null,
) => {
  if (!userId) return false;
  if (call.initiator_id === userId) return true;
  if (call.kind === 'direct') return call.participants.some((participant) => participant.user_id === userId);
  return !!groupRole && ENDING_ROLES.has(groupRole);
};
