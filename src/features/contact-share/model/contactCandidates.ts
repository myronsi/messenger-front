import type { ContactUser } from '@/entities/message';
import { plainEmoji } from '@/shared/lib/customEmoji';

interface ChatLike {
  interlocutor_id?: string | number;
  interlocutor_name: string;
  interlocutor_display_name?: string;
  interlocutor_deleted?: boolean;
  avatar_url?: string;
  pending_approval_request?: boolean;
}

interface UserLike {
  id: string | number;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export const matchesContact = (user: ContactUser, query: string) => {
  const needle = query.trim().toLowerCase().replace(/^@/, '');
  return !needle || plainEmoji(user.display_name).toLowerCase().includes(needle) || user.username.toLowerCase().includes(needle);
};

export const chatCandidates = (chats: ChatLike[], me: string | undefined): ContactUser[] => {
  const seen = new Set<string>();
  return chats.flatMap((chat) => {
    const id = chat.interlocutor_id == null ? '' : String(chat.interlocutor_id);
    if (!id || chat.interlocutor_deleted || chat.pending_approval_request || id === me || seen.has(id)) return [];
    seen.add(id);
    return [{ id, username: chat.interlocutor_name, display_name: chat.interlocutor_display_name || chat.interlocutor_name, avatar_url: chat.avatar_url }];
  });
};

export const searchCandidates = (users: UserLike[], shown: ContactUser[], me: string | undefined): ContactUser[] => {
  const known = new Set(shown.map((user) => String(user.id)));
  return users.filter((user) => String(user.id) !== me && !known.has(String(user.id)))
    .map((user) => ({ id: String(user.id), username: user.username, display_name: user.display_name, avatar_url: user.avatar_url }));
};
