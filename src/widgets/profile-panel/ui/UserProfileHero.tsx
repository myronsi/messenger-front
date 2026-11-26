import React, { useState } from 'react';
import { Ban, Cake, Eraser, Flag, Image, MessageCircle, Pencil, Share2, Trash2 } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { ProfileActions, ProfileBanner, ProfileCloseButton, ProfileTabs, type ProfileMenuItem, type ProfileTile } from '@/shared/ui/profile/ProfileHero';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { usePresenceLabel } from '@/shared/utils/presenceFormatters';
import { copyText } from '@/shared/lib/copyText';
import { toast } from '@/shared/ui/sonner';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { ChatMuteAction } from '@/features/chat-mute';
import { CallButton, useCallsAvailable } from '@/features/calls';
import { useChatActions, type ChatActionTarget } from '@/features/chat-cleanup';
import { ReportUserDialog, RestrictedAccountLabel } from '@/features/moderation';
import { publicNameLink, ShareLinkDialog } from '@/features/sharing';
import { useChatWallpaperAction } from '@/features/chat-wallpaper';
import { isGoApi } from '@/shared/api/goSocket';
import { ContactNameHeading } from './ContactNameHeading';
import type { ProfilePanelView } from './UserProfilePanelContent';
import type { ProfileBackground } from '@/entities/user';

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
  tabs: ProfilePanelView[];
  activeView: ProfilePanelView;
  onSelectView: (view: ProfilePanelView) => void;
  onMessage: () => void;
  onAvatarHistory: () => void;
  onClose?: () => void;
  onChatDeleted?: () => void;
  onEditProfile?: () => void;
  pronouns?: string | null;
  background?: ProfileBackground | null;
  birthdayToday?: boolean;
  accountLabel?: string | null;
}

const UserProfileHero: React.FC<UserProfileHeroProps> = (props) => {
  const { translations } = useLanguage();
  const t = translations.profileRework;
  const presence = usePresenceLabel(props.isOnline, props.lastSeen);
  const hasChat = !!props.directChatId && isPersistedId(props.directChatId);
  const callsAvailable = useCallsAvailable();
  const [shareOpen, setShareOpen] = useState(false);
  const actions = useChatActions({ onDeleted: () => props.onChatDeleted?.() });
  const wallpaper = useChatWallpaperAction();
  const target: ChatActionTarget = {
    chatId: hasChat ? props.directChatId : undefined, userId: props.userId, username: props.username,
    name: props.displayName, isSaved: props.isCurrentUser,
  };
  const avatar = <AuthenticatedImage src={props.avatarUrl} alt={props.displayName} className="h-full w-full object-cover" />;
  const tabLabels: Record<ProfilePanelView, string> = {
    details: t.info, pinned: t.pinned, photos: t.media, audios: t.audio, files: t.files, links: t.links, voice: t.voice,
  };

  const tiles: ProfileTile[] = [
    ...(props.isCurrentUser && props.onEditProfile ? [
      { key: 'edit', label: translations.editProfileAction, icon: <Pencil className="h-5 w-5" />, onClick: props.onEditProfile },
    ] : []),
    ...(props.isCurrentUser ? [
      { key: 'share', label: translations.sharing.shareProfile, icon: <Share2 className="h-5 w-5" />, onClick: () => setShareOpen(true) },
    ] : []),
    ...(props.canMessage ? [{ key: 'chat', label: t.chat, primary: true, icon: <MessageCircle className="h-5 w-5" />, onClick: props.onMessage }] : []),
    ...(hasChat && callsAvailable && !props.isCurrentUser ? [
      { key: 'call', label: t.call, render: (className: string) => <span className={`${className} [&>button]:h-full [&>button]:w-full [&>button]:rounded-xl`}><CallButton chatId={props.directChatId} /></span> },
    ] : []),
    ...(hasChat && !props.isCurrentUser ? [
      { key: 'mute', label: t.mute, primary: !props.canMessage, render: (className: string) => <ChatMuteAction chatId={props.directChatId!} className={className} /> },
    ] : []),
  ];
  const wallpaperItem: ProfileMenuItem[] = hasChat && isGoApi() ? [{
    key: 'wallpaper', label: translations.appearance.wallpaper.menuItem, icon: <Image className="h-4 w-4" />,
    onSelect: () => wallpaper.open({
      chatId: String(props.directChatId), peerName: props.displayName, direct: true, blocked: props.isBlocked,
    }),
  }] : [];
  const menu: ProfileMenuItem[] = props.isCurrentUser ? [] : [
    { key: 'share', label: translations.sharing.shareProfile, icon: <Share2 className="h-4 w-4" />, onSelect: () => setShareOpen(true) },
    { key: 'rename', label: t.rename, icon: <Pencil className="h-4 w-4" />, onSelect: props.onEditContactName },
    ...wallpaperItem,
    ...(hasChat ? [{ key: 'clear', label: translations.chatCleanup.clearHistory, icon: <Eraser className="h-4 w-4" />, onSelect: () => actions.openClear(target) }] : []),
    ...(hasChat && !props.isCurrentUser ? [{ key: 'delete', label: translations.chatCleanup.deleteChat, danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: () => actions.openDelete(target) }] : []),
    {
      key: 'block', label: props.isBlocked ? t.unblock : t.block, danger: !props.isBlocked, icon: <Ban className="h-4 w-4" />, onSelect: () => actions.openBlock(target),
    },
    ...(props.userId ? [{
      key: 'report', label: translations.moderation.report, danger: true, icon: <Flag className="h-4 w-4" />, onSelect: () => void actions.openReport(target),
    }] : []),
  ];

  const isMobile = useIsMobile();
  const closeButton = props.onClose && (
    <ProfileCloseButton mobile={isMobile} onClick={props.onClose} backLabel={translations.back || 'Back'} closeLabel={translations.close} />
  );
  const copyUsername = () => void copyText(`@${props.username}`).then((ok) => { if (ok) toast(translations.messagesCopied); });

  return (
    <div className="shrink-0">
      <ProfileBanner
        seed={props.username}
        background={props.background}
        online={props.isOnline && !props.isCurrentUser}
        avatar={props.hasCustomAvatar ? <button type="button" onClick={props.onAvatarHistory} className="block h-full w-full">{avatar}</button> : avatar}
        actions={(tiles.length > 0 || menu.length > 0) && <ProfileActions tiles={tiles} menu={menu} moreLabel={t.more} />}
        title={<ContactNameHeading {...props} />}
        subtitle={<>
          <button type="button" onClick={copyUsername} data-morph="username" data-morph-mode="move" className="font-medium text-primary hover:underline">@{props.username}</button>
          {props.pronouns && <><span aria-hidden="true">·</span><span data-testid="profile-pronouns">{props.pronouns}</span></>}
          {props.accountLabel && <RestrictedAccountLabel label={props.accountLabel} />}
          {props.birthdayToday && <Cake data-testid="profile-birthday-today" className="h-4 w-4 text-primary" aria-label={translations.profileExtras.birthdayToday} />}
          {!props.isCurrentUser && <>
            <span aria-hidden="true">·</span>
            <span data-testid="profile-presence" className="min-w-0 truncate">{props.isOnline ? t.onlineNow : presence}</span>
          </>}
        </>}
        topLeft={isMobile && closeButton}
        topRight={!isMobile && closeButton}
      />
      <ProfileTabs tabs={props.tabs.map((key) => ({ key, label: tabLabels[key] }))} active={props.activeView} onSelect={props.onSelectView} />
      {actions.dialogs}
      {wallpaper.dialog}
      {shareOpen && (
        <ShareLinkDialog title={translations.sharing.shareProfile} hint={translations.sharing.shareProfileHint}
          url={publicNameLink(props.username)} onClose={() => setShareOpen(false)} />
      )}
      {actions.reporting && <ReportUserDialog userId={actions.reporting.userId} name={actions.reporting.name} onClose={actions.closeReport} />}
    </div>
  );
};

export default UserProfileHero;
