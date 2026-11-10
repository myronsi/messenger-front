import { useEffect, useState } from 'react';
import { PenLine } from 'lucide-react';
import { uploadStickerImage, useAddStickerMutation, useCreateStickerPackMutation, useListOwnStickerPacksQuery } from '@/entities/sticker';
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

export const StickerMaker = ({ sourceUrl, packId, onClose, onSaved }: StickerMakerProps) => {
  const { translations } = useLanguage();
  const source = useStickerSource(sourceUrl);
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const owned = useListOwnStickerPacksQuery(undefined, { skip: !!packId });
  const [choice, setChoice] = useState<string>(packId ?? '');
  const [title, setTitle] = useState('');
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

  const needsTitle = choice === NEW_PACK && !title.trim();
  const save = async () => {
    if (!image || !emoji || needsTitle) return;
    setSaving(true);
    setError(null);
    let target = choice;
    try {
      if (choice === NEW_PACK) target = (await createPack(title.trim()).unwrap()).id;
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
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
        <DialogTitle className="text-base">{translations.stickerMakerTitle}</DialogTitle>
        <DialogDescription className="sr-only">{translations.stickerCropHint}</DialogDescription>
        {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!image ? (
          source.url ? <StickerCropper src={source.url} onCancel={onClose} onDone={setImage} onError={setError} />
            : <p className="py-8 text-center text-sm text-muted-foreground">{source.failed ? translations.stickerImageUnreadable : translations.loading}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto aspect-square w-40 rounded-xl border border-border">
              {preview && <img src={preview} alt={emoji ?? ''} className="h-full w-full object-contain" />}
            </div>
            <Button variant="outline" size="sm" className="mx-auto" onClick={() => setDrawing(true)}>
              <PenLine className="mr-2 h-4 w-4" />{translations.stickerDraw}
            </Button>
            <p className="text-sm font-medium">{translations.stickerChooseEmoji}</p>
            <StickerEmojiPicker value={emoji} onChange={setEmoji} />
            {!packId && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{translations.stickerChoosePack}</span>
                <select className="rounded-md border border-input bg-background px-2 py-2" value={choice} onChange={(event) => setChoice(event.target.value)}>
                  {owned.currentData?.map((pack) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}
                  <option value={NEW_PACK}>{translations.newStickerPack}</option>
                </select>
                {choice === NEW_PACK && (
                  <input className="rounded-md border border-input bg-background px-2 py-2" maxLength={64} placeholder={translations.stickerPackTitle}
                    aria-label={translations.stickerPackTitle} value={title} onChange={(event) => setTitle(event.target.value)} />
                )}
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={saving} onClick={() => setImage(null)}>{translations.back}</Button>
              <Button disabled={!emoji || needsTitle || saving} onClick={() => { void save(); }}>
                {saving ? translations.savingSticker : translations.saveSticker}
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
