import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatWallpaperOverride } from '@/entities/chat-wallpaper';
import { useAppearance } from '@/shared/contexts/AppearanceContext';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { setChatWallpaper } from '@/shared/lib/clientSettings/wallpaperStore';
import type { ChatWallpaper } from '@/shared/lib/appearance/wallpaper';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/sonner';
import { WallpaperPicker } from './WallpaperPicker';
import { WallpaperPreview } from './WallpaperPreview';

export type WallpaperScope = 'me' | 'both';

export interface ChatWallpaperTarget {
  chatId: string;
  peerName?: string;
  direct: boolean;
  blocked?: boolean;
}

interface ChatWallpaperDialogProps {
  target: ChatWallpaperTarget | null;
  onClose: () => void;
}

const ChatWallpaperForm = ({ target, onClose }: { target: ChatWallpaperTarget; onClose: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.appearance.wallpaper;
  const { settings, tone } = useAppearance();
  const current = useChatWallpaperOverride(target.chatId);
  const [useDefault, setUseDefault] = useState(!current);
  const [draft, setDraft] = useState<ChatWallpaper>(current ?? settings.wallpaper);
  const [scope, setScope] = useState<WallpaperScope>('me');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canShare = target.direct && !!target.peerName;
  const shared = canShare && !target.blocked && scope === 'both' && !useDefault;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await setChatWallpaper(target.chatId, useDefault ? null : draft, shared);
      toast(t.saved);
      onClose();
    } catch (problem) {
      const status = (problem as { status?: unknown } | null)?.status;
      setError(status === 403 && shared ? t.blockedHint : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const scopeLabels: Record<WallpaperScope, string> = { me: t.onlyMe, both: t.forBoth };
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.chatTitle}</DialogTitle>
        <DialogDescription>{t.chatDescription}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto">
        <WallpaperPreview wallpaper={useDefault ? settings.wallpaper : draft} tone={tone} label={translations.appearance.preview}
          incoming={translations.appearance.previewIncoming} outgoing={translations.appearance.previewOutgoing} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useDefault} onChange={(event) => setUseDefault(event.target.checked)} className="h-4 w-4 accent-primary" />
          {t.useDefault}
        </label>
        {!useDefault && <WallpaperPicker value={draft} tone={tone} onChange={setDraft} disabled={saving} />}
        {canShare && !useDefault && (
          <div className="space-y-2">
            <div role="radiogroup" aria-label={t.chatTitle} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(['me', 'both'] as const).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={scope === option}
                  disabled={saving || (option === 'both' && target.blocked)} onClick={() => setScope(option)}
                  className={cn('min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
                    scope === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {scopeLabels[option]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {target.blocked ? t.blockedHint : scope === 'both' ? fillTemplate(t.forBothHint, { name: target.peerName ?? '' }) : null}
            </p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>{t.cancel}</Button>
        <Button type="button" onClick={() => { void save(); }} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{t.save}
        </Button>
      </DialogFooter>
    </>
  );
};

export const ChatWallpaperDialog = ({ target, onClose }: ChatWallpaperDialogProps) => (
  <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] max-w-md flex-col">
      {target && <ChatWallpaperForm key={target.chatId} target={target} onClose={onClose} />}
    </DialogContent>
  </Dialog>
);
