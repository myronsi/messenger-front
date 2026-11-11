import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

const sideButtonClass = 'pointer-events-auto max-sm:pointer-events-none max-sm:opacity-0 max-sm:focus-visible:pointer-events-auto '
  + 'max-sm:focus-visible:opacity-100 absolute top-1/2 z-[10000] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm '
  + 'transition-colors hover:bg-black/50 disabled:pointer-events-none disabled:opacity-0 sm:p-3';

interface GalleryArrowsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGo: (direction: -1 | 1) => void;
}

export function GalleryArrows({ canGoBack, canGoForward, onGo }: GalleryArrowsProps) {
  const { translations } = useLanguage();
  return (
    <>
      <button type="button" disabled={!canGoBack} onClick={() => onGo(-1)} aria-label={translations.previousImage} className={`${sideButtonClass} left-2 sm:left-4`}>
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button type="button" disabled={!canGoForward} onClick={() => onGo(1)} aria-label={translations.nextImage} className={`${sideButtonClass} right-2 sm:right-4`}>
        <ChevronRight className="h-6 w-6" />
      </button>
    </>
  );
}
