import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAddCustomEmojiMutation } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { addEmojiError, isShortcode, shortcodeFromFile } from '../model/emojiForm';
import { ShortcodeField } from './ShortcodeField';

interface AddEmojiPanelProps {
  packId: string;
  file: File;
  onClose: () => void;
}

export const AddEmojiPanel = ({ packId, file, onClose }: AddEmojiPanelProps) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const [shortcode, setShortcode] = useState(() => shortcodeFromFile(file.name));
  const [error, setError] = useState<string | null>(null);
  const [add, { isLoading }] = useAddCustomEmojiMutation();
  const preview = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);

  const submit = async () => {
    if (!isShortcode(shortcode) || isLoading) return;
    setError(null);
    try {
      await add({ packId, image: file, shortcode }).unwrap();
      onClose();
    } catch (caught) {
      setError(addEmojiError(caught, t));
    }
  };

  return (
    <div data-testid="add-emoji-panel" className="motion-pack-panel sticky bottom-0 -mx-1 flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/60 p-1">
          <img src={preview} alt={t.emojiPreview} className="h-full w-full object-contain" />
        </span>
        <ShortcodeField label={t.shortcode} value={shortcode} onChange={setShortcode} onSubmit={() => void submit()} />
      </div>
      <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`} role={error ? 'alert' : undefined}>
        {error ?? `${t.shortcodeHint} · ${t.imageHint}`}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="motion-press h-10 rounded-xl px-3 text-sm font-medium hover:bg-accent">{t.cancel}</button>
        <button type="button" onClick={() => void submit()} disabled={!isShortcode(shortcode) || isLoading}
          className="motion-press inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{t.addEmoji}
        </button>
      </div>
    </div>
  );
};
