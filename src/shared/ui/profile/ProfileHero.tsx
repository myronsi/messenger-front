import type { CSSProperties, ReactNode } from 'react';
import { ArrowLeft, MoreHorizontal, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { profileHue } from './profileHue';
import { hasVisibleBackground, type ProfileBackgroundValue } from './backgroundPresets';
import { ProfileBackgroundFill } from './ProfileBackgroundFill';

const ARC_COUNT = 10;

interface ProfileCloseButtonProps {
  mobile: boolean;
  onClick: () => void;
  backLabel: string;
  closeLabel: string;
  className?: string;
}

export const BANNER_BUTTON = 'motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/20';

export const ProfileCloseButton = ({ mobile, onClick, backLabel, closeLabel, className = '' }: ProfileCloseButtonProps) => (
  <button type="button" onClick={onClick} aria-label={mobile ? backLabel : closeLabel} title={mobile ? undefined : closeLabel}
    className={`${BANNER_BUTTON} ${className}`}>
    {mobile ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
  </button>
);
const OUTLINE_BUTTON = 'motion-press flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border bg-transparent transition-colors hover:bg-accent';

interface ProfileBannerProps {
  seed: string;
  avatar: ReactNode;
  online?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  background?: ProfileBackgroundValue | null;
  avatarOverlay?: ReactNode;
}

export const ProfileBanner = ({ seed, avatar, online = false, title, subtitle, actions, topLeft, topRight, background, avatarOverlay }: ProfileBannerProps) => (
  <div data-testid="profile-banner" style={{ '--wave-h': String(profileHue(seed)) } as CSSProperties}>
    <div data-morph="cover" className="relative h-32 overflow-hidden bg-[hsl(var(--wave-h)_42%_40%)] dark:bg-[hsl(var(--wave-h)_38%_30%)]">
      {hasVisibleBackground(background) ? (
        <>
          <ProfileBackgroundFill background={background} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30" aria-hidden="true" />
        </>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 400 128" preserveAspectRatio="xMaxYMin slice" className="absolute inset-0 h-full w-full text-white/10">
          {Array.from({ length: ARC_COUNT }, (_, index) => (
            <circle key={index} cx="330" cy="-10" r={28 + index * 24} fill="none" stroke="currentColor" strokeWidth="1.25" />
          ))}
        </svg>
      )}
      {topLeft && <div className="absolute left-1.5 top-3 text-white">{topLeft}</div>}
      {topRight && <div className="absolute right-1.5 top-3 text-white">{topRight}</div>}
    </div>
    <div className="flex items-start justify-between gap-3 px-5">
      <div data-morph="avatar" className="relative -mt-14 h-28 w-28 shrink-0 rounded-full bg-background p-1">
        <div className="h-full w-full overflow-hidden rounded-full">{avatar}</div>
        {avatarOverlay}
        {online && <span data-testid="profile-online-dot" className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-[3px] border-background bg-success" />}
      </div>
      {actions && <div data-morph-fade="" className="flex min-w-0 justify-end gap-2 pt-3">{actions}</div>}
    </div>
    <div className="px-5 pt-2">
      <div data-morph="name" data-morph-mode="move" className="break-words text-2xl font-bold leading-tight tracking-tight">{title}</div>
      {subtitle && <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">{subtitle}</div>}
    </div>
  </div>
);

export interface ProfileTile {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  primary?: boolean;
  onClick?: () => void;
  render?: (className: string) => ReactNode;
}

const tileClass = (tile: ProfileTile) => {
  const tone = tile.danger ? 'border-destructive/40 text-destructive' : 'border-border text-foreground';
  return `${OUTLINE_BUTTON} ${tone} w-10 [&>span]:sr-only`;
};

export interface ProfileMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface ProfileActionsProps {
  tiles: ProfileTile[];
  menu?: ProfileMenuItem[];
  moreLabel?: string;
}

export const ProfileActions = ({ tiles, menu = [], moreLabel = 'More' }: ProfileActionsProps) => (
  <div data-testid="profile-action-tiles" className="contents">
    {[...tiles].sort((a, b) => Number(!!b.primary) - Number(!!a.primary)).map((tile) => (
      <div key={tile.key} data-tile={tile.key} className="contents">
        {tile.render ? tile.render(tileClass(tile)) : (
          <button type="button" aria-label={tile.label} title={tile.label} onClick={tile.onClick} className={tileClass(tile)}>
            {tile.icon}
          </button>
        )}
      </div>
    ))}
    {menu.length > 0 && <ProfileMoreMenu menu={menu} label={moreLabel} triggerClassName={tileClass({ key: 'more', label: moreLabel })} />}
  </div>
);

export const ProfileMoreMenu = ({ menu, label, triggerClassName }: { menu: ProfileMenuItem[]; label: string; triggerClassName: string }) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={label} title={label} className={triggerClassName}>
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="z-[1300] min-w-44" onCloseAutoFocus={(event) => event.preventDefault()}>
      {menu.map((item) => (
        <DropdownMenuItem key={item.key} onSelect={item.onSelect}
          className={`gap-2 ${item.danger ? 'text-destructive focus:text-destructive' : ''}`}>
          {item.icon}{item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

interface ProfileTabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onSelect: (key: T) => void;
}

export function ProfileTabs<T extends string>({ tabs, active, onSelect }: ProfileTabsProps<T>) {
  return (
    <div role="tablist" data-morph-fade="" className="mx-5 mt-3 flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none]">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" role="tab" aria-selected={tab.key === active} data-profile-tab={tab.key} onClick={() => onSelect(tab.key)}
          className={`relative shrink-0 pb-2.5 pt-1 text-[15px] transition-colors ${tab.key === active
            ? 'font-semibold text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary'
            : 'text-muted-foreground hover:text-foreground'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
