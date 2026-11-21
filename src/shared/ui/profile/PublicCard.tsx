import type { ReactNode } from 'react';
import { ProfileBanner } from './ProfileHero';
import { PublicAvatar } from './PublicAvatar';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { plainEmoji } from '@/shared/lib/customEmoji';

interface PublicCardProps {
  seed: string;
  name: string;
  avatarUrl?: string | null;
  subtitle?: ReactNode;
  text?: string | null;
  children?: ReactNode;
  signedIn?: boolean;
}

export const PublicCard = ({ seed, name, avatarUrl, subtitle, text, children, signedIn = false }: PublicCardProps) => (
  <article data-testid="public-card" className="overflow-hidden rounded-2xl border border-border bg-card pb-5 shadow-sm">
    <ProfileBanner seed={seed} title={<h1 className="break-words">{signedIn ? <EmojiText text={name} /> : plainEmoji(name)}</h1>} subtitle={subtitle}
      avatar={<PublicAvatar src={avatarUrl} name={plainEmoji(name)} className="h-full w-full object-cover" />} />
    {text && <p className="whitespace-pre-wrap break-words px-5 pt-3 text-sm text-foreground">{signedIn ? <EmojiText text={text} /> : plainEmoji(text)}</p>}
    {children && <div className="flex flex-col gap-2 px-5 pt-5">{children}</div>}
  </article>
);
