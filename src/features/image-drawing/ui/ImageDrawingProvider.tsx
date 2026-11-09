import { useMemo, useState, type ReactNode } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DrawingEditor, ImageDrawingContext, type Drawing, type ImageDrawingTarget } from '@/shared/ui/drawing';
import { sendImageDrawing } from '../api/sendImageDrawing';

interface ImageDrawingProviderProps {
  chatId: EntityId;
  enabled: boolean;
  onSent?: (clientTempId: string, created: unknown) => void;
  children: ReactNode;
}

export function ImageDrawingProvider({ chatId, enabled, onSent, children }: ImageDrawingProviderProps) {
  const { translations: t } = useLanguage();
  const [target, setTarget] = useState<ImageDrawingTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = useMemo(() => (enabled ? {
    drawOnImage: (next: ImageDrawingTarget) => {
      setError(null);
      setTarget(next);
    },
  } : null), [enabled]);

  const send = async (drawing: Drawing | null) => {
    if (!target || !drawing || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { clientTempId, created } = await sendImageDrawing(chatId, target, drawing);
      onSent?.(clientTempId, created);
      setTarget(null);
      target.onSent?.();
    } catch {
      setError(t.drawingSendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ImageDrawingContext.Provider value={value}>
      {children}
      {target && (
        <DrawingEditor src={target.url} name={target.name} initial={target.drawing} aspect={target.aspect} confirmLabel={t.drawingSend}
          requireItems busy={busy} error={error} onCancel={() => setTarget(null)} onConfirm={(drawing) => void send(drawing)} />
      )}
    </ImageDrawingContext.Provider>
  );
}
