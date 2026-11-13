import type { CSSProperties, ReactNode } from 'react';
import { profileHue } from './profileHue';

const TILE_HUES = [252, 160, 38, 330, 205, 12];
const tileStyle = (index: number) => ({ '--tile-h': String(TILE_HUES[index % TILE_HUES.length]) }) as CSSProperties;
const TILE_CLASS = 'flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--tile-h)_85%_93%)] text-[hsl(var(--tile-h)_55%_32%)] '
  + 'transition-transform active:scale-95 dark:bg-[hsl(var(--tile-h)_30%_22%)] dark:text-[hsl(var(--tile-h)_80%_80%)]';

interface WaveHeaderProps {
  seed: string;
  avatar: ReactNode;
  online?: boolean;
  title: ReactNode;
  status?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
}

export const WaveHeader = ({ seed, avatar, online = false, title, status, topLeft, topRight }: WaveHeaderProps) => (
  <div data-testid="profile-wave-header" style={{ '--wave-h': String(profileHue(seed)) } as CSSProperties}>
    <div className="relative h-32 bg-[hsl(var(--wave-h)_62%_62%)] dark:bg-[hsl(var(--wave-h)_38%_32%)]">
      <div className="absolute inset-x-3 top-3 flex items-center justify-between text-white">
        <span>{topLeft}</span>
        <span>{topRight}</span>
      </div>
      <svg aria-hidden="true" viewBox="0 0 300 40" preserveAspectRatio="none" className="absolute -bottom-px left-0 h-10 w-full fill-background">
        <path d="M0 20 Q 40 0 80 18 T 160 18 T 240 16 T 300 12 V40 H0Z" />
      </svg>
    </div>
    <div className="relative mx-auto -mt-14 h-24 w-24 rounded-full bg-background p-1">
      <div className="h-full w-full overflow-hidden rounded-full">{avatar}</div>
      {online && <span data-testid="profile-online-dot" className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full border-[3px] border-background bg-success" />}
    </div>
    <div className="px-5 pt-2 text-center">
      <div className="text-[22px] font-extrabold leading-tight tracking-tight">{title}</div>
      {status && (
        <div className="mt-1.5 flex justify-center">
          <span className="inline-flex max-w-full items-center rounded-full bg-[hsl(var(--wave-h)_70%_92%)] px-3 py-0.5 text-xs font-medium text-[hsl(var(--wave-h)_50%_30%)] dark:bg-[hsl(var(--wave-h)_30%_20%)] dark:text-[hsl(var(--wave-h)_70%_80%)]">
            <span className="truncate">{status}</span>
          </span>
        </div>
      )}
    </div>
  </div>
);

export interface ProfileTile {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  render?: (className: string) => ReactNode;
}

export const ActionTiles = ({ tiles }: { tiles: ProfileTile[] }) => (
  <div data-testid="profile-action-tiles" className="flex justify-center gap-3 px-4 pb-2 pt-4">
    {tiles.map((tile, index) => (
      <div key={tile.key} style={tileStyle(index)} className="flex w-16 flex-col items-center gap-1 text-[11px] text-muted-foreground">
        {tile.render ? tile.render(TILE_CLASS) : (
          <button type="button" aria-label={tile.label} onClick={tile.onClick} className={TILE_CLASS}>{tile.icon}</button>
        )}
        <span className="max-w-full truncate">{tile.label}</span>
      </div>
    ))}
  </div>
);

export const BioBubble = ({ text }: { text: string }) => (
  <p data-testid="profile-bio-bubble" className="mx-4 mb-2 mt-1 whitespace-pre-wrap break-words rounded-[18px] rounded-bl-[4px] bg-muted px-3.5 py-2.5 text-sm leading-5">
    {text}
  </p>
);

export interface ProfileChip {
  key: string;
  label: ReactNode;
  onClick?: () => void;
}

export const InfoChips = ({ chips }: { chips: ProfileChip[] }) => (
  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
    {chips.map((chip, index) => {
      const className = 'rounded-full bg-[hsl(var(--tile-h)_85%_93%)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--tile-h)_50%_30%)] '
        + 'dark:bg-[hsl(var(--tile-h)_30%_20%)] dark:text-[hsl(var(--tile-h)_75%_80%)]';
      return chip.onClick
        ? <button key={chip.key} type="button" style={tileStyle(index)} onClick={chip.onClick} className={className}>{chip.label}</button>
        : <span key={chip.key} style={tileStyle(index)} className={className}>{chip.label}</span>;
    })}
  </div>
);

interface PillTabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onSelect: (key: T) => void;
}

export function PillTabs<T extends string>({ tabs, active, onSelect }: PillTabsProps<T>) {
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" className="flex gap-1.5 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" role="tab" aria-selected={tab.key === active} data-profile-tab={tab.key} onClick={() => onSelect(tab.key)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab.key === active
            ? 'bg-[hsl(var(--wave-h,217)_62%_55%)] text-white dark:bg-[hsl(var(--wave-h,217)_45%_40%)]'
            : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
