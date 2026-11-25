import type { EntityId } from '@/shared/api/entityId';
import type { SenderAssignment } from '../api/importTypes';
import type { ParsedSender } from './types';

export interface ImportMember {
  id: EntityId;
  username?: string | null;
  displayName?: string | null;
}

const normalize = (value: string | null | undefined) => (value ?? '').normalize('NFKC').toLowerCase().replace(/[\s._~@-]+/g, ' ').trim();

const names = (member: ImportMember) => [normalize(member.displayName), normalize(member.username)].filter(Boolean);

const assignmentOf = (member: ImportMember, meId: EntityId): SenderAssignment => (String(member.id) === String(meId) ? 'me' : member.id);

type Matcher = (sender: string, candidate: string) => boolean;

const exact: Matcher = (sender, candidate) => sender === candidate;
const prefix: Matcher = (sender, candidate) => sender.length >= 3 && (candidate.startsWith(sender) || sender.startsWith(candidate));

export const suggestAssignments = (senders: readonly ParsedSender[], members: readonly ImportMember[], meId: EntityId) => {
  const result: Record<string, SenderAssignment> = {};
  const used = new Set<string>();
  const free = () => members.filter((member) => !used.has(String(member.id)));
  for (const matcher of [exact, prefix]) {
    for (const sender of senders) {
      if (result[sender.key] !== undefined) continue;
      const name = normalize(sender.name);
      const matches = free().filter((member) => names(member).some((candidate) => matcher(name, candidate)));
      if (matches.length !== 1) continue;
      result[sender.key] = assignmentOf(matches[0], meId);
      used.add(String(matches[0].id));
    }
  }
  const matchesSomeone = (sender: ParsedSender) => members.some((member) => names(member)
    .some((candidate) => exact(normalize(sender.name), candidate) || prefix(normalize(sender.name), candidate)));
  const openSenders = senders.filter((sender) => result[sender.key] === undefined);
  const openMembers = free();
  if (openSenders.length === 1 && openMembers.length === 1 && senders.length === members.length && !matchesSomeone(openSenders[0])) {
    result[openSenders[0].key] = assignmentOf(openMembers[0], meId);
  }
  return result;
};
