import { useState, type MouseEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { openEmojiPackLink, useGetEmojiPackByLinkQuery, useSetEmojiPackInstalledMutation } from '@/entities/emoji';
import { openStickerPack, StickerImage, useGetStickerPackQuery, useSetStickerPackInstalledMutation } from '@/entities/sticker';
import { useGetUserByUsernameQuery } from '@/entities/user';
import { useGetInviteQuery, useGetPublicGroupQuery, type GroupPreview } from '@/entities/group';
import { PublicAvatar } from '@/shared/ui/profile/PublicAvatar';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';
import { navigateInApp, openOwnLink } from '@/shared/lib/ownLink';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import type { AppLink } from '../model/appLink';

type Plural = { one: string; few: string; many: string; other: string };

const EMOJI_SHOWN = 8;
const STICKERS_SHOWN = 3;

const stop = (event: MouseEvent, action: () => void) => {
  event.preventDefault();
  event.stopPropagation();
  action();
};

const openChat = (username: string) => navigateInApp(`/dm/@${encodeURIComponent(username)}`);
const openProfile = (name: string) => { openOwnLink(`/@${name}`); };

interface ShellProps {
  isMine: boolean;
  grow: boolean;
  standalone: boolean;
  label: string;
  media: ReactNode;
  title: string;
  subtitle: string;
  action: ReactNode;
  onOpen: () => void;
  footer?: ReactNode;
}

const frame = (isMine: boolean, standalone: boolean) => {
  if (standalone) return 'w-64';
  return `w-64 rounded-xl ${isMine ? 'bg-primary-foreground/15' : 'border border-border/60 bg-background/50'}`;
};

export const Shell = ({ isMine, grow, standalone, label, media, title, subtitle, action, onOpen, footer }: ShellProps) => (
  <div className={`max-w-full pb-5 ${standalone ? 'pt-1' : 'pt-1.5'}`}>
    <div data-testid="app-link-card" data-standalone={standalone || undefined}
      className={`${grow ? 'app-link-card-in ' : ''}${frame(isMine, standalone)} max-w-full overflow-hidden`}>
      <div className="min-h-0 overflow-hidden">
        <button type="button" aria-label={label} onClick={(event) => stop(event, onOpen)}
          className={`block w-full focus-visible:outline-none ${standalone ? 'pb-2 pt-1' : 'p-3 pb-1'}`}>
          {media}
        </button>
        <div className={`flex items-center gap-3 ${standalone ? `border-t pt-2 ${isMine ? 'border-primary-foreground/20' : 'border-border/60'}` : 'px-3 pb-2.5 pt-1'}`}>
          <button type="button" onClick={(event) => stop(event, onOpen)} className="min-w-0 flex-1 text-left focus-visible:outline-none">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs opacity-75">{subtitle}</span>
          </button>
          {action}
        </div>
        {footer}
      </div>
    </div>
  </div>
);

const EMOJI_GRID = ['', 'w-24 grid-cols-1', 'w-36 grid-cols-2', 'w-48 grid-cols-3'];
const STICKER_GRID = ['', 'w-36 grid-cols-1', 'w-full grid-cols-2'];
const emojiGrid = (count: number) => `mx-auto grid gap-2 ${EMOJI_GRID[count] ?? 'w-full grid-cols-4'}`;
const stickerGrid = (count: number) => `mx-auto grid gap-2 ${STICKER_GRID[count] ?? 'w-full grid-cols-3'}`;

interface ActionButtonProps {
  isMine: boolean;
  done?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const ActionButton = ({ isMine, done, label, onClick, disabled }: ActionButtonProps) => (
  done
    ? <span className="flex shrink-0 items-center gap-1 text-xs opacity-75"><Check className="h-3.5 w-3.5" />{label}</span>
    : (
      <button type="button" disabled={disabled} onClick={(event) => stop(event, onClick)}
        className={`motion-press shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${isMine ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}>
        {label}
      </button>
    )
);

const useGrowsIn = (ready: boolean) => useState(() => !ready)[0];

const useCount = () => {
  const { language } = useLanguage();
  return (words: Plural, count: number) => {
    const category = new Intl.PluralRules(localeOf(language)).select(count);
    return (category in words ? words[category as keyof Plural] : words.other).replace('{count}', String(count));
  };
};

interface CardProps<T> {
  link: T;
  isMine: boolean;
  standalone: boolean;
  fallback: ReactNode;
}

const EmojiPackCard = ({ link, isMine, standalone, fallback }: CardProps<{ slug: string }>) => {
  const { translations } = useLanguage();
  const count = useCount();
  const { data: pack } = useGetEmojiPackByLinkQuery(link.slug);
  const grow = useGrowsIn(!!pack);
  const [setInstalled, { isLoading }] = useSetEmojiPackInstalledMutation();
  if (!pack) return <>{fallback}</>;
  const words = translations.appLinks;
  return (
    <Shell isMine={isMine} grow={grow} standalone={standalone} label={pack.title} title={pack.title}
      subtitle={count(words.emojiPack, pack.emoji.length)} onOpen={() => openEmojiPackLink(link.slug)}
      media={(
        <span className={emojiGrid(Math.min(pack.emoji.length, EMOJI_SHOWN))}>
          {pack.emoji.slice(0, EMOJI_SHOWN).map((emoji) => (
            <span key={emoji.id} className="flex aspect-square items-center justify-center">
              <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-full w-full" />
            </span>
          ))}
        </span>
      )}
      action={pack.is_mine
        ? <ActionButton isMine={isMine} label={words.open} onClick={() => openEmojiPackLink(link.slug)} />
        : <ActionButton isMine={isMine} done={pack.is_installed} label={pack.is_installed ? words.added : words.add} disabled={isLoading}
          onClick={() => { void setInstalled({ packId: pack.id, installed: true }); }} />} />
  );
};

const StickerPackCard = ({ link, isMine, standalone, fallback }: CardProps<{ slug: string }>) => {
  const { translations } = useLanguage();
  const count = useCount();
  const { currentData: pack } = useGetStickerPackQuery({ slug: link.slug });
  const grow = useGrowsIn(!!pack);
  const [setInstalled, { isLoading }] = useSetStickerPackInstalledMutation();
  if (!pack) return <>{fallback}</>;
  const words = translations.appLinks;
  return (
    <Shell isMine={isMine} grow={grow} standalone={standalone} label={pack.title} title={pack.title}
      subtitle={count(words.stickerPack, pack.stickers.length)} onOpen={() => openStickerPack({ slug: link.slug })}
      media={(
        <span className={stickerGrid(Math.min(pack.stickers.length, STICKERS_SHOWN))}>
          {pack.stickers.slice(0, STICKERS_SHOWN).map((sticker) => (
            <span key={sticker.id} className="aspect-square">
              <StickerImage url={sticker.image.url} stillUrl={sticker.image.panel_url} emoji={sticker.emoji} className="h-full w-full" />
            </span>
          ))}
        </span>
      )}
      action={pack.is_mine
        ? <ActionButton isMine={isMine} label={words.open} onClick={() => openStickerPack({ slug: link.slug })} />
        : <ActionButton isMine={isMine} done={pack.is_installed} label={pack.is_installed ? words.added : words.add} disabled={isLoading}
          onClick={() => { void setInstalled({ packId: pack.id, installed: true }); }} />} />
  );
};

const ProfileCard = ({ link, isMine, standalone, fallback, profile = false }: CardProps<{ username: string }> & { profile?: boolean }) => {
  const { translations } = useLanguage();
  const { data: user } = useGetUserByUsernameQuery(link.username);
  const grow = useGrowsIn(!!user);
  if (!user) return <>{fallback}</>;
  const name = user.contact_display_name || user.display_name;
  return (
    <Shell isMine={isMine} grow={grow} standalone={standalone} label={name} title={name} subtitle={`@${user.username}`}
      onOpen={() => (profile ? openProfile(user.username) : openChat(user.username))}
      media={(
        <span className="flex justify-center py-2">
          <AuthenticatedImage src={resolveMediaUrl(user.avatar_url)} initialsFrom={name} alt={name} className="h-[72px] w-[72px] rounded-full object-cover" />
        </span>
      )}
      action={<ActionButton isMine={isMine} label={translations.appLinks.message} onClick={() => openChat(user.username)} />} />
  );
};

const GroupCard = ({ preview, isMine, standalone, onOpen }: { preview: GroupPreview; isMine: boolean; standalone: boolean; onOpen: () => void }) => {
  const { translations } = useLanguage();
  const count = useCount();
  const grow = useGrowsIn(true);
  const { group } = preview;
  const members = count(translations.sharing.members, group.member_count);
  return (
    <Shell isMine={isMine} grow={grow} standalone={standalone} label={group.name} title={group.name}
      subtitle={group.public_name ? `@${group.public_name} · ${members}` : members} onOpen={onOpen}
      media={(
        <span className="flex justify-center py-2">
          <PublicAvatar src={group.avatar_url} name={group.name} className="h-[72px] w-[72px] rounded-full object-cover" />
        </span>
      )}
      action={<ActionButton isMine={isMine} label={preview.chat_id ? translations.appLinks.open : translations.sharing.join} onClick={onOpen} />} />
  );
};

const NameCard = ({ link, isMine, standalone, fallback }: CardProps<{ name: string }>) => {
  const { data: user, isError } = useGetUserByUsernameQuery(link.name);
  const { data: group } = useGetPublicGroupQuery(link.name, { skip: !isError });
  if (user) return <ProfileCard link={{ username: link.name }} profile isMine={isMine} standalone={standalone} fallback={fallback} />;
  if (group) return <GroupCard preview={group} isMine={isMine} standalone={standalone} onOpen={() => openProfile(link.name)} />;
  return <>{fallback}</>;
};

const InviteCard = ({ link, isMine, standalone, fallback }: CardProps<{ token: string }>) => {
  const { data } = useGetInviteQuery(link.token);
  if (!data) return <>{fallback}</>;
  return <GroupCard preview={data} isMine={isMine} standalone={standalone} onOpen={() => navigateInApp(`/join/${link.token}`)} />;
};

interface AppLinkCardProps {
  link: AppLink;
  isMine: boolean;
  standalone?: boolean;
  fallback?: ReactNode;
}

export const AppLinkCard = ({ link, isMine, standalone = false, fallback = null }: AppLinkCardProps) => {
  if (link.kind === 'emoji') return <EmojiPackCard link={link} isMine={isMine} standalone={standalone} fallback={fallback} />;
  if (link.kind === 'sticker') return <StickerPackCard link={link} isMine={isMine} standalone={standalone} fallback={fallback} />;
  if (link.kind === 'profile') return <ProfileCard link={link} isMine={isMine} standalone={standalone} fallback={fallback} />;
  if (link.kind === 'name') return <NameCard link={link} isMine={isMine} standalone={standalone} fallback={fallback} />;
  return <InviteCard link={link} isMine={isMine} standalone={standalone} fallback={fallback} />;
};
