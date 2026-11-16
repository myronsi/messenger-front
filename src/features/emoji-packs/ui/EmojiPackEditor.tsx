import { useRef, useState } from 'react';
import { ArrowLeft, Copy, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  emojiPackLink, useAddCustomEmojiMutation, useDeleteCustomEmojiMutation, useDeleteEmojiPackMutation, useRenameEmojiPackMutation, type EmojiPack,
} from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { toast } from '@/shared/ui/sonner';
import { addEmojiError, isShortcode, shortcodeFromFile } from '../model/emojiForm';

const FIELD = 'min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';
const BUTTON = 'motion-press inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors disabled:opacity-50';

export const EmojiPackEditor = ({ pack, onBack }: { pack: EmojiPack; onBack?: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const [file, setFile] = useState<File | null>(null);
  const [shortcode, setShortcode] = useState('');
  const [title, setTitle] = useState(pack.title);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [add, { isLoading: adding }] = useAddCustomEmojiMutation();
  const [remove] = useDeleteCustomEmojiMutation();
  const [rename] = useRenameEmojiPackMutation();
  const [deletePack] = useDeleteEmojiPackMutation();
  const isGroup = !!pack.chat_id;

  const submit = async () => {
    if (!file || !isShortcode(shortcode)) return;
    setError(null);
    try {
      await add({ packId: pack.id, image: file, shortcode }).unwrap();
      setFile(null);
      setShortcode('');
    } catch (caught) {
      setError(addEmojiError(caught, t));
    }
  };
  const copyLink = () => pack.slug && void copyText(emojiPackLink(pack.slug)).then((ok) => { if (ok) toast(t.linkCopied); });
  const removePack = async () => {
    if (!window.confirm(t.deletePackConfirm)) return;
    await deletePack(pack.id).unwrap();
    onBack?.();
  };

  return (
    <div data-testid="emoji-pack-editor" className="space-y-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label={t.back} className="motion-press flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {pack.can_edit && !isGroup ? (
          <input aria-label={t.newPackTitle} value={title} maxLength={64} onChange={(event) => setTitle(event.target.value)}
            onBlur={() => title.trim() && title.trim() !== pack.title && void rename({ packId: pack.id, title: title.trim() })} className={`${FIELD} flex-1`} />
        ) : <p className="flex-1 truncate font-medium">{isGroup ? t.groupEmoji : pack.title}</p>}
        {pack.slug && <button type="button" onClick={copyLink} aria-label={t.copyLink} className={`${BUTTON} border border-border hover:bg-accent`}><Copy className="h-4 w-4" /></button>}
        {pack.is_mine && <button type="button" onClick={() => void removePack()} aria-label={t.deletePack} className={`${BUTTON} text-destructive hover:bg-destructive/10`}><Trash2 className="h-4 w-4" /></button>}
      </div>
      {isGroup && <p className="text-xs text-muted-foreground">{t.groupEmojiHint}</p>}
      {pack.emoji.length === 0 && <p className="text-sm text-muted-foreground">{t.noEmoji}</p>}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {pack.emoji.map((emoji) => (
          <li key={emoji.id} className="group relative flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-accent">
            <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-10 w-10" />
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">:{emoji.shortcode}:</span>
            {pack.can_edit && (
              <button type="button" aria-label={`${t.deleteEmoji} :${emoji.shortcode}:`} onClick={() => void remove({ packId: pack.id, emojiId: emoji.id })}
                className="absolute right-0.5 top-0.5 hidden h-6 w-6 items-center justify-center rounded-full bg-background text-destructive shadow group-hover:flex focus:flex">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {pack.can_edit && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">{t.addEmoji}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => input.current?.click()} className={`${BUTTON} border border-border hover:bg-accent`}>
              <ImagePlus className="h-4 w-4" />{file ? file.name : t.chooseImage}
            </button>
            <input aria-label={t.shortcode} placeholder={t.shortcode} value={shortcode} maxLength={32}
              onChange={(event) => setShortcode(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} className={`${FIELD} w-40`} />
            <button type="button" onClick={() => void submit()} disabled={!file || !isShortcode(shortcode) || adding} className={`${BUTTON} bg-primary text-primary-foreground`}>
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}{t.addEmoji}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t.shortcodeHint} · {t.imageHint}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" data-testid="emoji-image-input"
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              setFile(picked);
              if (picked && !shortcode) setShortcode(shortcodeFromFile(picked.name));
              event.target.value = '';
            }} />
        </div>
      )}
    </div>
  );
};
