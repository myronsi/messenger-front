import type { RefObject } from 'react';
import { Brush, Download, MoreVertical, Forward, Sticker, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

const buttonClass = 'p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm';
const desktopOnly = 'max-sm:sr-only max-sm:focus-visible:not-sr-only';

interface ViewerToolbarProps {
  canDownload: boolean;
  isDownloading: boolean;
  deleteButtonRef: RefObject<HTMLButtonElement | null>;
  onZoom: (factor: number) => void;
  onDownload: () => void;
  onDelete?: () => void;
  onDraw?: () => void;
  onForward?: () => void;
  onMakeSticker?: () => void;
  onClose: () => void;
}

export function ViewerToolbar({
  canDownload, isDownloading, deleteButtonRef, onZoom, onDownload, onDelete, onDraw, onForward, onMakeSticker, onClose,
}: ViewerToolbarProps) {
  const { translations } = useLanguage();
  const options = [
    onForward && { key: 'forward', label: translations.forward, icon: Forward, onSelect: onForward, testId: 'viewer-forward' },
    onDraw && { key: 'draw', label: translations.drawOnImage, icon: Brush, onSelect: onDraw, testId: 'viewer-draw' },
    onMakeSticker && { key: 'sticker', label: translations.makeSticker, icon: Sticker, onSelect: onMakeSticker, testId: 'viewer-sticker' },
  ].filter((option) => !!option);
  return (
    <div className="pointer-events-auto fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-[10000] flex gap-2">
      <button type="button" onClick={() => onZoom(1.25)} aria-label={translations.zoomIn || 'Zoom in'} className={`${desktopOnly} ${buttonClass}`}>
        <ZoomIn className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => onZoom(0.8)} aria-label={translations.zoomOut || 'Zoom out'} className={`${desktopOnly} ${buttonClass}`}>
        <ZoomOut className="w-5 h-5" />
      </button>
      {options.map(({ key, label, icon: Icon, onSelect, testId }) => (
        <button key={key} type="button" data-testid={testId} onClick={onSelect} aria-label={label} title={label} className={`max-sm:hidden ${buttonClass}`}>
          <Icon className="w-5 h-5" />
        </button>
      ))}
      {canDownload && (
        <button type="button" disabled={isDownloading} onClick={onDownload} aria-label={translations.download || 'Download'} className={`${buttonClass} disabled:opacity-50`}>
          <Download className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
        </button>
      )}
      {onDelete && (
        <button ref={deleteButtonRef} type="button" onClick={onDelete} aria-label={translations.deletePhoto} className={buttonClass}>
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      {options.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" data-testid="viewer-options" aria-label={translations.mediaOptions} className={`sm:hidden ${buttonClass}`}>
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[10001] min-w-[12rem]">
            {options.map(({ key, label, icon: Icon, onSelect }) => (
              <DropdownMenuItem key={key} onSelect={onSelect} className="gap-3 py-2.5 text-[15px]">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <button type="button" onClick={onClose} aria-label={translations.close || 'Close'} className={`${options.length > 0 ? 'max-sm:hidden' : ''} ${buttonClass}`}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
