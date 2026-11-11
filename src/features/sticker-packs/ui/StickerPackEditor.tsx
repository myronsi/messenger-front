import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Link2, MoreVertical, Plus, Sticker as StickerIcon, Trash2 } from 'lucide-react';
import {
  StickerImage, useDeleteStickerMutation, useDeleteStickerPackMutation, useGetStickerPackQuery, useRenameStickerPackMutation,
  useReorderStickersMutation, useSetStickerEmojiMutation,
} from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { moveTo, packLink } from '../model/reorder';
import { stickerErrorText } from '../model/stickerErrors';
import { StickerMaker } from './StickerMaker';
import { StickerTileActions } from './StickerTileActions';

interface StickerPackEditorProps {
  packId: string;
  onBack: () => void;
}

const MAX_STICKERS = 120;
const iconButton = 'motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent';

export const StickerPackEditor = ({ packId, onBack }: StickerPackEditorProps) => {
  const { translations } = useLanguage();
  const { currentData: pack, isError } = useGetStickerPackQuery({ packId }, { refetchOnMountOrArgChange: true });
  const [rename] = useRenameStickerPackMutation();
  const [deletePack, { isLoading: deleting }] = useDeleteStickerPackMutation();
  const [deleteSticker, deleteState] = useDeleteStickerMutation();
  const [reorder, reorderState] = useReorderStickersMutation();
  const [setEmoji, emojiState] = useSetStickerEmojiMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const dragged = useRef<string | null>(null);
  const dropped = useRef(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [making, setMaking] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const busy = deleteState.isLoading || reorderState.isLoading || emojiState.isLoading;
  const serverOrder = pack?.stickers.map((sticker) => sticker.id).join(',');

  useEffect(() => {
    if (order && order.join(',') === serverOrder) setOrder(null);
  }, [order, serverOrder]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

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
      setCopied(true);
    } catch {
      setNotice(packLink(pack.slug));
    }
  };
  const stickerIds = pack.stickers.map((sticker) => sticker.id);
  const index = selected ? stickerIds.indexOf(selected) : -1;
  const current = index >= 0 ? pack.stickers[index] : null;
  const reorderTo = (next: string[]) => {
    setOrder(next);
    void reorder({ packId, stickerIds: next }).unwrap().catch((error: unknown) => {
      setOrder(null);
      setNotice(stickerErrorText(error, translations));
    });
  };
  const byId = new Map(pack.stickers.map((sticker) => [sticker.id, sticker]));
  const shown = order ? order.map((id) => byId.get(id)).filter((sticker) => sticker !== undefined) : pack.stickers;
  const dragTo = (position: number) => {
    const id = dragged.current;
    const base = order ?? stickerIds;
    const from = id ? base.indexOf(id) : -1;
    if (from >= 0 && from !== position) setOrder(moveTo(base, from, position));
  };
  const cover = pack.stickers[0];
  const full = pack.stickers.length >= MAX_STICKERS;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" className={iconButton} aria-label={translations.back} onClick={onBack}><ArrowLeft className="h-4 w-4" /></button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 p-0.5 text-muted-foreground">
          {cover ? <StickerImage url={cover.image.url} emoji={cover.emoji} className="h-full w-full" /> : <StickerIcon className="h-5 w-5" />}
        </span>
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold hover:border-input focus:border-input focus:outline-none"
          aria-label={translations.stickerPackTitle} maxLength={64} value={title ?? pack.title}
          onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        />
        {pack.slug && (
          <button type="button" className={`${iconButton} ${copied ? 'text-primary' : ''}`} aria-label={copied ? translations.stickerPackLinkCopied : translations.copyStickerPackLink}
            title={copied ? translations.stickerPackLinkCopied : translations.copyStickerPackLink} onClick={() => { void copyLink(); }}>
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={iconButton} aria-label={translations.stickerPackActions}><MoreVertical className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {pack.slug && <DropdownMenuItem onSelect={() => { void copyLink(); }}><Link2 className="mr-2 h-4 w-4" />{translations.copyStickerPackLink}</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />{translations.deleteStickerPack}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {pack.is_hidden && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{translations.stickerPackHiddenNotice}</p>}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations.deleteStickerPack}</AlertDialogTitle>
            <AlertDialogDescription>{translations.deleteStickerPackConfirm.replace('{title}', pack.title)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deletePack(packId).unwrap().then(onBack, () => { setConfirmDelete(false); setNotice(translations.stickerSaveFailed); });
              }}>
              {translations.deleteStickerPack}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span>{translations.stickerCountOfMax.replace('{count}', String(pack.stickers.length)).replace('{max}', String(MAX_STICKERS))}</span>
          {pack.stickers.length > 1 && <span className="truncate">{translations.stickerPackEditHint}</span>}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(2, (pack.stickers.length / MAX_STICKERS) * 100)}%` }} />
        </div>
      </div>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label={pack.title}>
        {!full && (
          <li>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label={translations.addStickerToPack}
              className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Plus className="h-6 w-6" />
            </button>
          </li>
        )}
        {shown.map((sticker, position) => (
          <li key={sticker.id} draggable={!busy}
            className={`transition-transform duration-150 ${dragged.current === sticker.id ? 'opacity-40' : ''}`}
            onDragStart={(event) => { dragged.current = sticker.id; dropped.current = false; setOrder(stickerIds); event.dataTransfer.effectAllowed = 'move'; }}
            onDragEnter={(event) => { event.preventDefault(); dragTo(position); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropped.current = true;
              dragged.current = null;
              if (order && order.join(',') !== stickerIds.join(',')) reorderTo(order);
              else setOrder(null);
            }}
            onDragEnd={() => {
              dragged.current = null;
              if (!dropped.current) setOrder(null);
            }}>
            <button type="button" aria-pressed={selected === sticker.id} aria-label={translations.stickerLabel.replace('{emoji}', sticker.emoji)}
              className={`relative block aspect-square w-full rounded-xl p-1.5 transition-all ${
                selected === sticker.id ? 'scale-[1.04] bg-primary/20 ring-[3px] ring-primary'
                  : `bg-muted/40 hover:bg-accent ${selected ? 'opacity-45 hover:opacity-80' : ''}`}`}
              onClick={() => setSelected(selected === sticker.id ? null : sticker.id)}>
              <StickerImage url={sticker.image.url} emoji={sticker.emoji} className="h-full w-full" />
              {selected === sticker.id && (
                <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm leading-none">
                {sticker.emoji}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="sticker-file-input" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) setMaking(URL.createObjectURL(file));
      }} />
      {current && (
        <StickerTileActions sticker={current} isFirst={index === 0} busy={busy}
          onCover={() => reorderTo(moveTo(stickerIds, index, 0))}
          onEmoji={(emoji) => { void run(setEmoji({ packId, stickerId: current.id, emoji }).unwrap()); }}
          onDelete={() => { setSelected(null); void run(deleteSticker({ packId, stickerId: current.id }).unwrap()); }} />
      )}
      {making && (
        <StickerMaker sourceUrl={making} packId={packId} onClose={() => { URL.revokeObjectURL(making); setMaking(null); }} />
      )}
    </div>
  );
};
