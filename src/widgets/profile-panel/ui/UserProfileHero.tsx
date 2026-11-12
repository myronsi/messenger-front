import React from 'react';
import { Ban, Eraser, MessageCircle, MoreHorizontal, Trash2, X } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { ActionTiles, BioBubble, InfoChips, PillTabs, WaveHeader, type ProfileChip, type ProfileTile } from '@/shared/ui/profile/ProfileHero';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { usePresenceLabel } from '@/shared/utils/presenceFormatters';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { copyText } from '@/shared/lib/copyText';
import { toast } from '@/shared/ui/sonner';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useGetCommonGroupsQuery } from '@/entities/user';
import { ChatMuteAction } from '@/features/chat-mute';
import { CallButton, useCallsAvailable } from '@/features/calls';
import { ChatCleanupDialog, useChatCleanup } from '@/features/chat-cleanup';
import { ContactNameHeading } from './ContactNameHeading';
import type { ProfilePanelView } from './UserProfilePanelContent';

type HeadingProps = React.ComponentProps<typeof ContactNameHeading>;

interface UserProfileHeroProps extends HeadingProps {
  userId?: EntityId;
  username: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  isOnline: boolean;
  lastSeen?: string | null;
  bio?: string;
  createdAt?: string;
  directChatId?: EntityId;
  canMessage: boolean;
  isBlocked: boolean;
  canDeleteChat: boolean;
  tabs: ProfilePanelView[];
  activeView: ProfilePanelView;
  onSelectView: (view: ProfilePanelView) => void;
  onMessage: () => void;
  onAvatarHistory: () => void;
  onClose?: () => void;
  onDeleteChat: () => void;
  onBlock: () => void;
}

const UserProfileHero: React.FC<UserProfileHeroProps> = (props) => {
  const { translations } = useLanguage();
  const t = translations.profileRework;
  const presence = usePresenceLabel(props.isOnline, props.lastSeen);
  const hasChat = !!props.directChatId && isPersistedId(props.directChatId);
  const callsAvailable = useCallsAvailable();
  const cleanup = useChatCleanup(() => toast(translations.chatCleanup.cleared), (message) => toast(message || translations.errorLoading));
  const clearHistory = () => props.directChatId && cleanup.open({ kind: 'clear', target: {
    chatId: props.directChatId, name: props.displayName, isGroup: false, isSaved: false, canClearForEveryone: false,
  } });
  const common = useGetCommonGroupsQuery(props.userId ?? '', { skip: !props.userId || props.isCurrentUser }).data ?? [];
  const avatar = <AuthenticatedImage src={props.avatarUrl} alt={props.displayName} className="h-full w-full object-cover" />;
  const tabLabels: Record<ProfilePanelView, string> = {
    details: t.info, photos: t.media, audios: t.audio, files: t.files, links: t.links, voice: t.voice,
  };

  const tiles: ProfileTile[] = [
    ...(props.canMessage ? [{ key: 'chat', label: t.chat, icon: <MessageCircle className="h-5 w-5" />, onClick: props.onMessage }] : []),
    ...(hasChat && callsAvailable ? [
      { key: 'call', label: t.call, render: (className: string) => <span className={`${className} [&>button]:h-12 [&>button]:w-12`}><CallButton chatId={props.directChatId} /></span> },
    ] : []),
    ...(hasChat ? [
      { key: 'mute', label: t.mute, render: (className: string) => <ChatMuteAction chatId={props.directChatId!} className={`${className} [&>span]:sr-only`} /> },
    ] : []),
    ...(!props.isCurrentUser ? [{
      key: 'more', label: t.more, render: (className: string) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t.more} className={className}><MoreHorizontal className="h-5 w-5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-44">
            {hasChat && (
              <DropdownMenuItem onSelect={clearHistory} className="gap-2"><Eraser className="h-4 w-4" />{translations.chatCleanup.clearHistory}</DropdownMenuItem>
            )}
            {props.canDeleteChat && (
              <DropdownMenuItem onSelect={props.onDeleteChat} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />{translations.chatCleanup.deleteChat}</DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={props.onBlock} className="gap-2 text-destructive">
              <Ban className="h-4 w-4" />{props.isBlocked ? translations.unblock || 'Unblock' : translations.block || 'Block'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }] : []),
  ];

  const chips: ProfileChip[] = [
    { key: 'username', label: `@${props.username}`, onClick: () => void copyText(`@${props.username}`).then((ok) => { if (ok) toast(translations.messagesCopied); }) },
    ...(common.length ? [{ key: 'groups', label: common.length === 1 ? t.oneGroupTogether : fillTemplate(t.groupsTogether, { count: String(common.length) }) }] : []),
    ...(props.createdAt ? [{ key: 'since', label: fillTemplate(t.hereSince, { year: String(new Date(props.createdAt).getFullYear()) }) }] : []),
  ];

  return (
    <div className="shrink-0">
      <WaveHeader
        seed={props.username}
        online={props.isOnline}
        avatar={props.hasCustomAvatar ? <button type="button" onClick={props.onAvatarHistory} className="block h-full w-full">{avatar}</button> : avatar}
        title={<ContactNameHeading {...props} />}
        status={props.isOnline ? t.onlineNow : presence}
        topRight={props.onClose && (
          <button type="button" onClick={props.onClose} aria-label={translations.close} className="rounded-full p-1.5 hover:bg-white/20"><X className="h-5 w-5" /></button>
        )}
      />
      {tiles.length > 0 && <ActionTiles tiles={tiles} />}
      {props.bio && <BioBubble text={props.bio} />}
      <InfoChips chips={chips} />
      <PillTabs tabs={props.tabs.map((key) => ({ key, label: tabLabels[key] }))} active={props.activeView} onSelect={props.onSelectView} />
      <ChatCleanupDialog request={cleanup.request} onCancel={cleanup.close} onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />
    </div>
  );
};

export default UserProfileHero;
