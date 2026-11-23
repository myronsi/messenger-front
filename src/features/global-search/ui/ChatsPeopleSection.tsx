import { Users } from 'lucide-react';
import type { Chat } from '@/entities/message';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { PublicAvatar } from '@/shared/ui/profile/PublicAvatar';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { openOwnLink } from '@/shared/lib/ownLink';
import { selfName } from '@/shared/lib/selfName';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { chatName } from '../model/hitDisplay';
import type { ChatsPeople } from '../model/useChatsPeople';
import { SectionTitle } from './hitParts';

interface ChatsPeopleSectionProps {
  found: ChatsPeople;
  currentUsername: string;
  translations: Translations;
  onOpenChat: (chat: Chat) => void;
  onOpenUser: (username: string) => void;
}

const rowClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground';

export const ChatsPeopleSection = ({ found, currentUsername, translations, onOpenChat, onOpenUser }: ChatsPeopleSectionProps) => {
  const { chats: foundChats, users, publicGroups } = found;
  if (found.empty) return null;

  return (
    <section data-testid="global-search-chats">
      <SectionTitle title={translations.globalSearch.chatsAndPeople} />
      {foundChats.map((chat) => (
        <button type="button" key={String(chat.id)} data-testid="global-search-chat" onClick={() => onOpenChat(chat)} className={rowClass}>
          <AuthenticatedImage src={chat.avatar_url} fallbackSrc={chat.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR}
            initialsFrom={chatName(chat, translations)} alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover" />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
            {chat.type === 'group' && <Users aria-label={translations.group} className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="truncate"><EmojiText text={chatName(chat, translations)} /></span>
          </span>
        </button>
      ))}
      {users.map((user) => {
        const isSelf = user.username.toLocaleLowerCase() === currentUsername.toLocaleLowerCase();
        const name = user.display_name || user.username;
        return (
          <button type="button" key={String(user.id)} data-testid="user-search-result" data-username={user.username}
            onClick={() => onOpenUser(user.username)} className={rowClass}>
            <AuthenticatedImage src={resolveMediaUrl(user.avatar_url, DEFAULT_AVATAR)} initialsFrom={name} alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium"><EmojiText text={isSelf ? selfName(name, translations) : name} /></span>
              <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
            </span>
          </button>
        );
      })}
      {publicGroups.map(({ group }) => (
        <button type="button" key={group.public_name} data-testid="group-search-result" onClick={() => openOwnLink(`/@${group.public_name}`)}
          className={rowClass}>
          <PublicAvatar src={group.avatar_url} name={group.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{group.name}</span>
            <span className="block truncate text-xs text-muted-foreground">@{group.public_name}</span>
          </span>
        </button>
      ))}
    </section>
  );
};
