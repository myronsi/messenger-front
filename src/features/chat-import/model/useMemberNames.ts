import { useCallback, useMemo } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetGroupDetailsQuery } from '@/entities/chat';
import type { ImportMember } from './senderSuggestions';

export interface ChatMembersSource {
  chatId: EntityId;
  isGroup: boolean;
  me: ImportMember;
  peer?: ImportMember;
}

const label = (member: ImportMember) => member.displayName || member.username || '';

export const useChatMembers = ({ chatId, isGroup, me, peer }: ChatMembersSource, skip = false) => {
  const { data } = useGetGroupDetailsQuery(chatId, { skip: skip || !isGroup });
  const members = useMemo<ImportMember[]>(() => {
    if (!isGroup) return peer ? [me, peer] : [me];
    const participants = (data?.participants ?? []).map((member) => ({ id: member.id, username: member.username, displayName: member.display_name }));
    return participants.some((member) => String(member.id) === String(me.id)) ? participants : [me, ...participants];
  }, [data?.participants, isGroup, me, peer]);
  const nameOf = useCallback((id: EntityId) => {
    const member = members.find((item) => String(item.id) === String(id));
    return member ? label(member) : undefined;
  }, [members]);
  return { members, nameOf };
};
