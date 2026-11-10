import { useRef, useState } from 'react';
import { ArrowLeft, Link2, Plus, Trash2 } from 'lucide-react';
import {
  StickerImage, useDeleteStickerMutation, useDeleteStickerPackMutation, useGetStickerPackQuery, useRenameStickerPackMutation,
  useReorderStickersMutation, useSetStickerEmojiMutation,
} from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { moveItem, packLink } from '../model/reorder';
import { stickerErrorText } from '../model/stickerErrors';
import { StickerMaker } from './StickerMaker';
import { StickerTileActions } from './StickerTileActions';

interface StickerPackEditorProps {
  packId: string;
  onBack: () => void;
}

const MAX_STICKERS = 120;

export const StickerPackEditor = ({ packId, onBack }: StickerPackEditorProps) => {
  const { translations } = useLanguage();
  const { currentData: pack, isError } = useGetStickerPackQuery({ packId }, { refetchOnMountOrArgChange: true });
  const [rename] = useRenameStickerPackMutation();
  const [deletePack, { isLoading: deleting }] = useDeleteStickerPackMutation();
  const [deleteSticker, deleteState] = useDeleteStickerMutation();
  const [reorder, reorderState] = useReorderStickersMutation();
  const [setEmoji, emojiState] = useSetStickerEmojiMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [making, setMaking] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const busy = deleteState.isLoading || reorderState.isLoading || emojiState.isLoading;

  if (!pack) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{isError ? translations.stickerPackUnavailable : translations.loading}</p>;
  }
  const run = (task: Promise<unknown>) => task.catch((error: unknown) => setNotice(stickerErrorText(error, translations)));
  const saveTitle = () => {
    const next = title?.trim();
    setTitle(null);
    if (next && next !== pack.title) void run(rename({ packId, title: next }).unwrap());
  };
  const copyLink = async () => {
    if (!pack.slug) return;
    try {
      await navigator.clipboard.writeText(packLink(pack.slug));
      setNotice(translations.stickerPackLinkCopied);
    } catch {
      setNotice(packLink(pack.slug));
    }
  };
  const stickerIds = pack.stickers.map((sticker) => sticker.id);
  const index = selected ? stickerIds.indexOf(selected) : -1;
  const current = index >= 0 ? pack.stickers[index] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" className="motion-press rounded-full p-2 hover:bg-accent" aria-label={translations.back} onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold hover:border-input focus:border-input focus:outline-none"
          aria-label={translations.stickerPackTitle} maxLength={64} value={title ?? pack.title}
          onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        />
      </div>
      {pack.is_hidden && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{translations.stickerPackHiddenNotice}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <ul className="grid grid-cols-4 gap-2" aria-label={pack.title}>
        {pack.stickers.map((sticker) => (
          <li key={sticker.id}>
            <button type="button" aria-pressed={selected === sticker.id} aria-label={translations.stickerLabel.replace('{emoji}', sticker.emoji)}
              className={`relative block aspect-square w-full rounded-lg p-1 transition-colors hover:bg-accent ${selected === sticker.id ? 'bg-primary/15 ring-2 ring-primary' : ''}`}
              onClick={() => setSelected(selected === sticker.id ? null : sticker.id)}>
              <StickerImage url={sticker.image.url} emoji={sticker.emoji} className="h-full w-full" />
              <span className="absolute bottom-0 right-0 text-sm leading-none">{sticker.emoji}</span>
            </button>
          </li>
        ))}
        {pack.stickers.length < MAX_STICKERS && (
          <li>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label={translations.addStickerToPack}
              className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              <Plus className="h-6 w-6" />
            </button>
          </li>
        )}
      </ul>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="sticker-file-input" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) setMaking(URL.createObjectURL(file));
      }} />
      {current && (
        <StickerTileActions sticker={current} isFirst={index === 0} isLast={index === stickerIds.length - 1} busy={busy}
          onMove={(step) => { void run(reorder({ packId, stickerIds: moveItem(stickerIds, index, step) }).unwrap()); }}
          onEmoji={(emoji) => { void run(setEmoji({ packId, stickerId: current.id, emoji }).unwrap()); }}
          onDelete={() => { setSelected(null); void run(deleteSticker({ packId, stickerId: current.id }).unwrap()); }} />
      )}
      <p className="text-xs text-muted-foreground">{translations.stickerPackPrivacy}</p>
      <div className="flex flex-wrap justify-between gap-2">
        {pack.slug && <Button variant="outline" size="sm" onClick={() => { void copyLink(); }}><Link2 className="mr-2 h-4 w-4" />{translations.copyStickerPackLink}</Button>}
        {confirmDelete ? (
          <div className="flex w-full flex-col gap-2 rounded-lg border border-destructive/40 p-2">
            <p className="text-sm">{translations.deleteStickerPackConfirm.replace('{title}', pack.title)}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>{translations.cancel}</Button>
              <Button variant="destructive" size="sm" disabled={deleting} onClick={() => { void deletePack(packId).unwrap().then(onBack, () => setNotice(translations.stickerSaveFailed)); }}>
                {translations.deleteStickerPack}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" />{translations.deleteStickerPack}
          </Button>
        )}
      </div>
      {making && (
        <StickerMaker sourceUrl={making} packId={packId} onClose={() => { URL.revokeObjectURL(making); setMaking(null); }} />
      )}
    </div>
  );
};
