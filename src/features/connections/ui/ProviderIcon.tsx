import type { ComponentType } from 'react';
import { AtSign, Cloud, Gamepad2, Github, Globe, Link2, MessageCircle, MessagesSquare, Music, Music2, Twitch, Youtube, type LucideProps } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const ICONS: Record<string, { icon: ComponentType<LucideProps>; color: string }> = {
  github: { icon: Github, color: 'bg-[#24292f] text-white' },
  spotify: { icon: Music, color: 'bg-[#1db954] text-white' },
  steam: { icon: Gamepad2, color: 'bg-[#171a21] text-white' },
  xbox: { icon: Gamepad2, color: 'bg-[#107c10] text-white' },
  discord: { icon: MessageCircle, color: 'bg-[#5865f2] text-white' },
  twitch: { icon: Twitch, color: 'bg-[#9146ff] text-white' },
  youtube: { icon: Youtube, color: 'bg-[#ff0000] text-white' },
  reddit: { icon: MessagesSquare, color: 'bg-[#ff4500] text-white' },
  roblox: { icon: Gamepad2, color: 'bg-[#2a2a2a] text-white' },
  tiktok: { icon: Music2, color: 'bg-[#010101] text-[#25f4ee]' },
  bluesky: { icon: Cloud, color: 'bg-[#1185fe] text-white' },
  mastodon: { icon: AtSign, color: 'bg-[#6364ff] text-white' },
  website: { icon: Globe, color: 'bg-muted text-foreground' },
};

interface Props {
  provider: string;
  className?: string;
}

export const ProviderIcon = ({ provider, className }: Props) => {
  const known = ICONS[provider];
  const Icon = known?.icon ?? Link2;
  return (
    <span data-testid={`provider-icon-${provider}`} aria-hidden="true"
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', known?.color ?? 'bg-muted text-foreground', className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
};
