import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronUp, Crop, PenLine, Plus, Smile, Sticker as StickerIcon } from 'lucide-react';
import { StickerImage, uploadStickerImage, useAddStickerMutation, useCreateStickerPackMutation, useListOwnStickerPacksQuery } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { DrawingEditor, flattenDrawing, type Drawing } from '@/shared/ui/drawing';
import { useStickerSource } from '../model/useStickerSource';
import { stickerErrorText } from '../model/stickerErrors';
import { StickerCropper } from './StickerCropper';
import { StickerEmojiPicker } from './StickerEmojiPicker';

interface StickerMakerProps {
  sourceUrl: string;
  packId?: string;
  onClose: () => void;
  onSaved?: (packId: string) => void;
}

const NEW_PACK = 'new';
const QUICK_EMOJI = ['😀', '😂', '😍', '😎', '😭', '👍', '❤️', '🔥'];
const sectionLabel = 'text-xs font-medium uppercase tracking-wide text-muted-foreground';
const overlayButton = 'motion-press grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background disabled:opacity-50';

interface PackChoiceProps {
  selected: boolean;
  label: string;
  cover: ReactNode;
  onSelect: () => void;
}

const PackChoice = ({ selected, label, cover, onSelect }: PackChoiceProps) => (
  <button type="button" role="radio" aria-checked={selected} aria-label={label} onClick={onSelect}
    className={`motion-press flex h-9 max-w-[11rem] shrink-0 items-center gap-2 rounded-full pl-1 pr-3 text-sm transition-colors ${
      selected ? 'bg-primary/15 font-medium text-primary' : 'bg-muted/50 text-muted-foreground hover:bg-accent'}`}>
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/60 p-0.5">{cover}</span>
    <span className="truncate">{label}</span>
  </button>
);

export const StickerMaker = ({ sourceUrl, packId, onClose, onSaved }: StickerMakerProps) => {
  const { translations } = useLanguage();
  const source = useStickerSource(sourceUrl);
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  const owned = useListOwnStickerPacksQuery(undefined, { skip: !!packId });
  const [choice, setChoice] = useState<string>(packId ?? '');
  const [title, setTitle] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const chooseNewPack = () => {
    setChoice(NEW_PACK);
    requestAnimationFrame(() => titleRef.current?.focus());
  };
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createPack] = useCreateStickerPackMutation();
  const [addSticker] = useAddStickerMutation();

  useEffect(() => {
    if (!choice && owned.currentData) setChoice(owned.currentData[0]?.id ?? NEW_PACK);
  }, [choice, owned.currentData]);

  useEffect(() => {
    if (!image) return undefined;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const emojiToggle = moreEmoji ? translations.stickerLessEmoji : translations.stickerMoreEmoji;
  const needsTitle = choice === NEW_PACK && !title.trim();
  const save = async () => {
    if (!image || !emoji || needsTitle) return;
    setSaving(true);
    setError(null);
    let target = choice;
    try {
      if (choice === NEW_PACK) {
        target = (await createPack(title.trim()).unwrap()).id;
        setChoice(target);
      }
    } catch (caught) {
      setError(stickerErrorText(caught, translations, 'pack'));
      setSaving(false);
      return;
    }
    try {
      const attachment = await uploadStickerImage(image);
      await addSticker({ packId: target, attachmentId: attachment.id, emoji }).unwrap();
      onClose();
      onSaved?.(target);
    } catch (caught) {
      setError(stickerErrorText(caught, translations));
      setSaving(false);
    }
  };

  const applyDrawing = async (value: Drawing | null) => {
    setDrawing(false);
    if (!image || !value?.items.length) return;
    try {
      setImage(await flattenDrawing(image, value));
    } catch {
      setError(translations.stickerSaveFailed);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] max-w-none content-start overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[92dvh] sm:max-w-md sm:rounded-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <DialogTitle className="pr-8 text-lg">{translations.stickerMakerTitle}</DialogTitle>
        <DialogDescription className="sr-only">{translations.stickerCropHint}</DialogDescription>
        {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!image ? (
          source.url ? <StickerCropper src={source.url} onCancel={onClose} onDone={setImage} onError={setError} />
            : <p className="py-8 text-center text-sm text-muted-foreground">{source.failed ? translations.stickerImageUnreadable : translations.loading}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative mx-auto aspect-square w-48 rounded-3xl bg-muted/30 p-3 sm:w-52">
              {preview && <img src={preview} alt={emoji ?? ''} className="h-full w-full object-contain" />}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button type="button" className={overlayButton} disabled={saving} onClick={() => setImage(null)} aria-label={translations.stickerCrop} title={translations.stickerCrop}>
                  <Crop className="h-4 w-4" />
                </button>
                <button type="button" className={overlayButton} disabled={saving} onClick={() => setDrawing(true)} aria-label={translations.stickerDraw} title={translations.stickerDraw}>
                  <PenLine className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className={sectionLabel}>{translations.stickerChooseEmoji}</p>
              <div className="flex flex-wrap gap-1" role="listbox" aria-label={translations.stickerChooseEmoji}>
                {[...new Set(emoji && !QUICK_EMOJI.includes(emoji) ? [emoji, ...QUICK_EMOJI] : QUICK_EMOJI)].map((item) => (
                  <button key={item} type="button" role="option" aria-selected={emoji === item} aria-label={item} onClick={() => setEmoji(item)}
                    className={`motion-press flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none transition ${
                      emoji === item ? 'scale-110 bg-primary/20' : emoji ? 'opacity-60 hover:bg-accent hover:opacity-100' : 'hover:bg-accent'}`}>
                    {item}
                  </button>
                ))}
                <button type="button" aria-expanded={moreEmoji} onClick={() => setMoreEmoji((value) => !value)}
                  aria-label={emojiToggle} title={emojiToggle}
                  className={`motion-press flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent ${moreEmoji ? 'bg-accent' : ''}`}>
                  {moreEmoji ? <ChevronUp className="h-5 w-5" /> : <Smile className="h-5 w-5" />}
                </button>
              </div>
              {moreEmoji && <StickerEmojiPicker value={emoji} onChange={(item) => { setEmoji(item); setMoreEmoji(false); }} />}
            </div>
            {!packId && (
              <div className="flex flex-col gap-2 text-sm">
                <span className={sectionLabel}>{translations.stickerChoosePack}</span>
                <div role="radiogroup" aria-label={translations.stickerChoosePack} className="-mx-1 flex flex-wrap gap-2 px-1">
                  {owned.currentData?.map((pack) => (
                    <PackChoice key={pack.id} selected={choice === pack.id} label={pack.title} onSelect={() => setChoice(pack.id)}
                      cover={pack.stickers[0] ? <StickerImage url={pack.stickers[0].image.url} emoji={pack.stickers[0].emoji} className="h-full w-full" />
                        : <StickerIcon className="h-4 w-4" />} />
                  ))}
                  <PackChoice selected={choice === NEW_PACK} label={translations.newStickerPack} onSelect={chooseNewPack}
                    cover={<Plus className="h-4 w-4" />} />
                </div>
                {choice === NEW_PACK && (
                  <input ref={titleRef} className="rounded-xl border-0 bg-muted/50 px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" maxLength={64} placeholder={translations.stickerPackTitle}
                    aria-label={translations.stickerPackTitle} value={title} onChange={(event) => setTitle(event.target.value)} />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button variant="ghost" disabled={saving} onClick={onClose}>{translations.cancel}</Button>
              <Button disabled={!emoji || needsTitle || saving} onClick={() => { void save(); }}>
                {saving ? translations.savingSticker : translations.addStickerToPack}
              </Button>
            </div>
          </div>
        )}
        {drawing && preview && (
          <DrawingEditor src={preview} name="sticker.png" aspect={1} confirmLabel={translations.drawingDone}
            onCancel={() => setDrawing(false)} onConfirm={(value) => { void applyDrawing(value); }} />
        )}
      </DialogContent>
    </Dialog>
  );
};
