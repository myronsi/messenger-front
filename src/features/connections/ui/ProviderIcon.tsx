import { Gamepad2, Globe, Link2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { BRAND_ICONS } from '../model/brandIcons';

const FALLBACKS: Record<string, { icon: typeof Globe; color: string }> = {
  xbox: { icon: Gamepad2, color: 'bg-[#107c10] text-white' },
  website: { icon: Globe, color: 'bg-muted text-foreground' },
};

interface Props {
  provider: string;
  className?: string;
}

export const ProviderIcon = ({ provider, className }: Props) => {
  const brand = BRAND_ICONS[provider];
  const base = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full';
  if (brand) {
    return (
      <span data-testid={`provider-icon-${provider}`} data-brand={brand.title} aria-hidden="true"
        className={cn(base, 'text-white ring-1 ring-inset ring-white/10', className)} style={{ backgroundColor: brand.hex }}>
        <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="currentColor" focusable="false"><path d={brand.path} /></svg>
      </span>
    );
  }
  const fallback = FALLBACKS[provider];
  const Icon = fallback?.icon ?? Link2;
  return (
    <span data-testid={`provider-icon-${provider}`} aria-hidden="true" className={cn(base, fallback?.color ?? 'bg-muted text-foreground', className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
};
