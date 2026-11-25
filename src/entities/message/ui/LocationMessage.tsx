import { useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import type { MessageLocation } from '../model/types';
import { locationLinks } from '../model/richMessage';

interface LocationMessageProps {
  location: MessageLocation;
  isMine: boolean;
}

const LINKS = ['openStreetMap', 'googleMaps', 'appleMaps'] as const;

export const LocationMessage = ({ location, isMine }: LocationMessageProps) => {
  const { translations } = useLanguage();
  const t = translations.locationShare;
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const links = locationLinks(location);
  const coordinates = fillTemplate(t.coordinates, { lat: location.latitude.toFixed(5), lon: location.longitude.toFixed(5) });
  const muted = isMine ? 'text-primary-foreground/75' : 'text-muted-foreground';
  return (
    <div data-testid="location-message" className="w-64 max-w-full py-1">
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <button type="button" aria-label={`${t.openIn}: ${location.title || coordinates}`} onClick={() => setOpen(true)}
          className="relative block aspect-[2/1] w-full overflow-hidden rounded-lg bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {location.map && !broken ? (
            <AuthenticatedImage src={resolveMediaUrl(location.map.url)} alt="" width={location.map.width} height={location.map.height}
              className="h-full w-full object-cover" draggable={false} onError={() => setBroken(true)} />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs">
              <MapPin className="h-6 w-6" aria-hidden="true" />
              {location.map ? t.mapUnavailable : coordinates}
            </span>
          )}
          <span data-testid="map-attribution" className="absolute bottom-0 right-0 rounded-tl bg-background/80 px-1 text-[9px] leading-4 text-foreground">
            {t.attribution}
          </span>
        </button>
        <div className="mt-1.5 flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{location.title || t.label}</span>
            <span className={cn('block truncate text-xs', muted)}>
              {location.accuracy_m !== null ? fillTemplate(t.accuracy, { meters: String(location.accuracy_m) }) : coordinates}
            </span>
          </span>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn('motion-press flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              isMine ? 'bg-primary-foreground/15' : 'bg-primary/10 text-primary')}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{t.openIn}
            </button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent align="end" className="min-w-[12rem]" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuLabel>{t.openIn}</DropdownMenuLabel>
          {LINKS.map((key) => (
            <DropdownMenuItem key={key} asChild>
              <a href={links[key]} target="_blank" rel="noopener noreferrer">{t[key]}</a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
