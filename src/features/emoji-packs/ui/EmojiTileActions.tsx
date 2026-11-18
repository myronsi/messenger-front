import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useDeleteCustomEmojiMutation, useRenameCustomEmojiMutation, type CustomEmoji as Emoji } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { isShortcode } from '../model/emojiForm';
import { ShortcodeField } from './ShortcodeField';

interface EmojiTileActionsProps {
  packId: string;
  emoji: Emoji;
  onDone: () => void;
}

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null && 'status' in error ? (error as { status: unknown }).status : null);

export const EmojiTileActions = ({ packId, emoji, onDone }: EmojiTileActionsProps) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const [shortcode, setShortcode] = useState(emoji.shortcode);
  const [error, setError] = useState<string | null>(null);
  const [rename, renameState] = useRenameCustomEmojiMutation();
  const [remove, removeState] = useDeleteCustomEmojiMutation();
  const busy = renameState.isLoading || removeState.isLoading;
  const changed = shortcode !== emoji.shortcode;

  const save = async () => {
    if (!changed || !isShortcode(shortcode) || busy) return;
    setError(null);
    try {
      await rename({ packId, emojiId: emoji.id, shortcode }).unwrap();
      onDone();
    } catch (caught) {
      setError(statusOf(caught) === 409 ? t.shortcodeTaken : t.renameFailed);
    }
  };
  const destroy = async () => {
    setError(null);
    try {
      await remove({ packId, emojiId: emoji.id }).unwrap();
      onDone();
    } catch {
      setError(t.failed);
    }
  };

  return (
    <div data-testid="emoji-tile-actions" className="motion-pack-panel sticky bottom-0 -mx-1 flex flex-col gap-2 rounded-2xl border border-border bg-background p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-10 w-10 shrink-0" />
        <ShortcodeField label={t.shortcode} value={shortcode} onChange={setShortcode} onSubmit={() => void save()} />
        <button type="button" onClick={() => void save()} disabled={!changed || !isShortcode(shortcode) || busy}
          className="motion-press inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {renameState.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{t.save}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className={`min-w-0 text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`} role={error ? 'alert' : undefined}>{error ?? t.shortcodeHint}</p>
        <button type="button" onClick={() => void destroy()} disabled={busy} aria-label={`${t.deleteEmoji} :${emoji.shortcode}:`}
          className="motion-press inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
          <Trash2 className="h-4 w-4" />{t.deleteEmoji}
        </button>
      </div>
    </div>
  );
};
