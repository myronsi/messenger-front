import React from 'react';
import { ArrowLeft, Ban, Eraser, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { ProfileActions, ProfileBanner, ProfileTabs, type ProfileMenuItem, type ProfileTile } from '@/shared/ui/profile/ProfileHero';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { usePresenceLabel } from '@/shared/utils/presenceFormatters';
import { copyText } from '@/shared/lib/copyText';
import { toast } from '@/shared/ui/sonner';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
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
  onEditProfile?: () => void;
}

const UserProfileHero: React.FC<UserProfileHeroProps> = (props) => {
  const { translations } = useLanguage();
  const t = translations.profileRework;
  const presence = usePresenceLabel(props.isOnline, props.lastSeen);
  const hasChat = !!props.directChatId && isPersistedId(props.directChatId);
  const callsAvailable = useCallsAvailable();
  const cleanup = useChatCleanup(() => toast(translations.chatCleanup.cleared), (message) => toast(message || translations.errorLoading));
  const clearHistory = () => props.directChatId && cleanup.open({ kind: 'clear', target: {
    chatId: props.directChatId, name: props.displayName, isGroup: false, isSaved: props.isCurrentUser, canClearForEveryone: false,
  } });
  const avatar = <AuthenticatedImage src={props.avatarUrl} alt={props.displayName} className="h-full w-full object-cover" />;
  const tabLabels: Record<ProfilePanelView, string> = {
    details: t.info, photos: t.media, audios: t.audio, files: t.files, links: t.links, voice: t.voice,
  };

  const tiles: ProfileTile[] = [
    ...(props.isCurrentUser && props.onEditProfile ? [
      { key: 'edit', label: translations.editProfileAction, primary: true, icon: <Pencil className="h-5 w-5" />, onClick: props.onEditProfile },
    ] : []),
    ...(props.canMessage ? [{ key: 'chat', label: t.chat, primary: true, icon: <MessageCircle className="h-5 w-5" />, onClick: props.onMessage }] : []),
    ...(hasChat && callsAvailable && !props.isCurrentUser ? [
      { key: 'call', label: t.call, render: (className: string) => <span className={`${className} [&>button]:h-full [&>button]:w-full [&>button]:rounded-xl`}><CallButton chatId={props.directChatId} /></span> },
    ] : []),
    ...(hasChat && !props.isCurrentUser ? [
      { key: 'mute', label: t.mute, primary: !props.canMessage, render: (className: string) => <ChatMuteAction chatId={props.directChatId!} className={className} /> },
    ] : []),
  ];
  const menu: ProfileMenuItem[] = [
    ...(!props.isCurrentUser ? [{ key: 'rename', label: t.rename, icon: <Pencil className="h-4 w-4" />, onSelect: props.onEditContactName }] : []),
    ...(hasChat ? [{ key: 'clear', label: translations.chatCleanup.clearHistory, icon: <Eraser className="h-4 w-4" />, onSelect: clearHistory }] : []),
    ...(props.canDeleteChat ? [{ key: 'delete', label: translations.chatCleanup.deleteChat, danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: props.onDeleteChat }] : []),
    ...(!props.isCurrentUser ? [{
      key: 'block', label: props.isBlocked ? t.unblock : t.block, danger: !props.isBlocked, icon: <Ban className="h-4 w-4" />, onSelect: props.onBlock,
    }] : []),
  ];

  const copyUsername = () => void copyText(`@${props.username}`).then((ok) => { if (ok) toast(translations.messagesCopied); });

  return (
    <div className="shrink-0">
      <ProfileBanner
        seed={props.username}
        online={props.isOnline}
        avatar={props.hasCustomAvatar ? <button type="button" onClick={props.onAvatarHistory} className="block h-full w-full">{avatar}</button> : avatar}
        actions={(tiles.length > 0 || menu.length > 0) && <ProfileActions tiles={tiles} menu={menu} moreLabel={t.more} />}
        title={<ContactNameHeading {...props} />}
        subtitle={<>
          <button type="button" onClick={copyUsername} className="font-medium text-primary hover:underline">@{props.username}</button>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate">{props.isOnline ? t.onlineNow : presence}</span>
        </>}
        topLeft={props.onClose && (
          <button type="button" onClick={props.onClose} aria-label={translations.back || 'Back'} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></button>
        )}
      />
      <ProfileTabs tabs={props.tabs.map((key) => ({ key, label: tabLabels[key] }))} active={props.activeView} onSelect={props.onSelectView} />
      <ChatCleanupDialog request={cleanup.request} onCancel={cleanup.close} onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />
    </div>
  );
};

export default UserProfileHero;
