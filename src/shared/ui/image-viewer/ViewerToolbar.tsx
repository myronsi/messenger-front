import type { RefObject } from 'react';
import { Brush, Download, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

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
  onClose: () => void;
}

export function ViewerToolbar({ canDownload, isDownloading, deleteButtonRef, onZoom, onDownload, onDelete, onDraw, onClose }: ViewerToolbarProps) {
  const { translations } = useLanguage();
  return (
    <div className="pointer-events-auto fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-[10000] flex gap-2">
      <button type="button" onClick={() => onZoom(1.25)} aria-label={translations.zoomIn || 'Zoom in'} className={`${desktopOnly} ${buttonClass}`}>
        <ZoomIn className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => onZoom(0.8)} aria-label={translations.zoomOut || 'Zoom out'} className={`${desktopOnly} ${buttonClass}`}>
        <ZoomOut className="w-5 h-5" />
      </button>
      {onDraw && (
        <button type="button" data-testid="viewer-draw" onClick={onDraw} aria-label={translations.drawOnImage} title={translations.drawOnImage} className={buttonClass}>
          <Brush className="w-5 h-5" />
        </button>
      )}
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
      <button type="button" onClick={onClose} aria-label={translations.close || 'Close'} className={buttonClass}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
