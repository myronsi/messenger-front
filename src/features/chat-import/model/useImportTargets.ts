import { useMemo } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useGetGroupChatsQuery, useGetGroupDetailsQuery, useGetOneOnOneChatsQuery } from '@/entities/chat';
import type { ImportTarget } from './importRequest';
import type { ImportMember } from './senderSuggestions';

export interface ImportChatTarget {
  chatId: EntityId;
  name: string;
  isGroup: boolean;
  peer?: ImportMember;
}

export interface ImportMe {
  id: EntityId;
  username: string;
  displayName?: string | null;
}

const MANAGING_ROLES: ReadonlySet<string> = new Set(['owner', 'admin']);

export const useImportTargets = (open: boolean, me: ImportMe, target: ImportTarget | null, fixedChat?: ImportChatTarget) => {
  const listed = open && !fixedChat && !!me.username;
  const { data: direct } = useGetOneOnOneChatsQuery(me.username, { skip: !listed });
  const { data: groups } = useGetGroupChatsQuery(me.username, { skip: !listed });

  const options = useMemo<ImportChatTarget[]>(() => {
    if (fixedChat) return [fixedChat];
    const people = (direct?.chats ?? [])
      .filter((chat) => isPersistedId(chat.id) && !chat.interlocutor_deleted && chat.interlocutor_id !== undefined
        && chat.interlocutor_name.toLowerCase() !== me.username.toLowerCase())
      .map((chat) => ({
        chatId: chat.id,
        name: chat.interlocutor_display_name || chat.interlocutor_name,
        isGroup: false,
        peer: { id: chat.interlocutor_id as EntityId, username: chat.interlocutor_name, displayName: chat.interlocutor_display_name },
      }));
    const managed = (groups?.groups ?? [])
      .filter((group) => !group.my_role || MANAGING_ROLES.has(group.my_role))
      .map((group) => ({ chatId: group.chat_id, name: group.name, isGroup: true }));
    return [...people, ...managed];
  }, [direct?.chats, fixedChat, groups?.groups, me.username]);

  const selected = target?.kind === 'chat' ? options.find((option) => String(option.chatId) === String(target.chatId)) : undefined;
  const { data: details } = useGetGroupDetailsQuery(selected?.chatId ?? '', { skip: !open || !selected?.isGroup });

  const members = useMemo<ImportMember[]>(() => {
    const self: ImportMember = { id: me.id, username: me.username, displayName: me.displayName };
    if (!selected) return [self];
    if (!selected.isGroup) return selected.peer ? [self, selected.peer] : [self];
    const participants = (details?.participants ?? []).map((member) => ({ id: member.id, username: member.username, displayName: member.display_name }));
    return participants.some((member) => String(member.id) === String(me.id)) ? participants : [self, ...participants];
  }, [details?.participants, me.displayName, me.id, me.username, selected]);

  return { options, members };
};
