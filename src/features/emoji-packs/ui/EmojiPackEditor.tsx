import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Link2, MinusCircle, MoreVertical, Plus, Smile, Trash2 } from 'lucide-react';
import {
  emojiPackLink, useDeleteEmojiPackMutation, useRenameEmojiPackMutation, useSetEmojiPackInstalledMutation, type EmojiPack,
} from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { PackFill } from '@/shared/ui/PackManagerParts';
import { maxEmojiOf } from '../model/emojiLimits';
import { AddEmojiPanel } from './AddEmojiPanel';
import { EmojiTileActions } from './EmojiTileActions';

const iconButton = 'motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent';
const TILE = 'flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl p-1.5 transition-all';

export const EmojiPackEditor = ({ pack, onBack }: { pack: EmojiPack; onBack?: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const [title, setTitle] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ file: File; key: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settled, setSettled] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [rename] = useRenameEmojiPackMutation();
  const [deletePack, { isLoading: deleting }] = useDeleteEmojiPackMutation();
  const [setInstalled] = useSetEmojiPackInstalledMutation();
  const isGroup = !!pack.chat_id;
  const max = maxEmojiOf(pack);
  const canAdd = pack.can_edit && pack.emoji.length < max;
  const current = pack.emoji.find((emoji) => emoji.id === selected);
  const canRemove = !pack.is_mine && pack.is_installed && !isGroup;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const saveTitle = () => {
    const next = title?.trim();
    setTitle(null);
    if (next && next !== pack.title) void rename({ packId: pack.id, title: next });
  };
  const copyLink = () => {
    if (pack.slug) void copyText(emojiPackLink(pack.slug)).then((ok) => { if (ok) setCopied(true); });
  };
  const leave = () => { void setInstalled({ packId: pack.id, installed: false }).unwrap().then(() => onBack?.()); };
  const cover = pack.emoji[0];
  const hasMenu = !!pack.slug || pack.is_mine || canRemove;

  return (
    <div data-testid="emoji-pack-editor" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        {onBack && <button type="button" onClick={onBack} aria-label={t.back} className={iconButton}><ArrowLeft className="h-4 w-4" /></button>}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 p-1 text-muted-foreground">
          {cover ? <CustomEmoji id={cover.id} shortcode={cover.shortcode} className="h-8 w-8" /> : <Smile className="h-5 w-5" />}
        </span>
        {pack.can_edit && !isGroup ? (
          <input aria-label={t.newPackTitle} maxLength={64} value={title ?? pack.title} onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold hover:border-input focus:border-input focus:outline-none" />
        ) : <p className="min-w-0 flex-1 truncate px-2 text-base font-semibold">{isGroup ? t.groupEmoji : pack.title}</p>}
        {pack.slug && (
          <button type="button" onClick={copyLink} aria-label={copied ? t.linkCopied : t.copyLink} title={copied ? t.linkCopied : t.copyLink}
            className={`${iconButton} ${copied ? 'text-primary' : ''}`}>
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </button>
        )}
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={iconButton} aria-label={t.packActions}><MoreVertical className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {pack.slug && <DropdownMenuItem onSelect={copyLink}><Link2 className="mr-2 h-4 w-4" />{t.copyLink}</DropdownMenuItem>}
              {canRemove && <DropdownMenuItem onSelect={leave}><MinusCircle className="mr-2 h-4 w-4" />{t.removePack}</DropdownMenuItem>}
              {pack.is_mine && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />{t.deletePack}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deletePack}</AlertDialogTitle>
            <AlertDialogDescription>{t.deletePackConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deletePack(pack.id).unwrap().then(() => { setConfirmDelete(false); onBack?.(); }, () => setConfirmDelete(false));
              }}>
              {t.deletePack}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isGroup && <p className="text-xs text-muted-foreground">{t.groupEmojiHint}</p>}
      {pack.is_hidden && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t.hidden}</p>}
      <PackFill label={pack.can_edit ? t.emojiCountOfMax.replace('{count}', String(pack.emoji.length)).replace('{max}', String(max)) : t.emojiCount.replace('{count}', String(pack.emoji.length))}
        hint={pack.can_edit && pack.emoji.length > 0 ? t.editHint : undefined} ratio={pack.emoji.length / max} />
      {pack.emoji.length === 0 && !pack.can_edit && <p className="text-sm text-muted-foreground">{t.noEmoji}</p>}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label={isGroup ? t.groupEmoji : pack.title}>
        {canAdd && (
          <li className="motion-pack-tile">
            <button type="button" onClick={() => input.current?.click()} aria-label={t.addEmoji}
              className={`${TILE} border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary`}>
              <Plus className="h-6 w-6" />
            </button>
          </li>
        )}
        {pack.emoji.map((emoji, index) => {
          const content = (
            <>
              <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-9 w-9" />
              <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">:{emoji.shortcode}:</span>
            </>
          );
          return (
            <li key={emoji.id} className="motion-pack-tile" style={{ animationDelay: settled ? undefined : `${Math.min(index + 1, 16) * 18}ms` }}>
              {pack.can_edit ? (
                <button type="button" aria-pressed={selected === emoji.id} aria-label={`:${emoji.shortcode}:`}
                  onClick={() => { setAdding(null); setSelected(selected === emoji.id ? null : emoji.id); }}
                  className={`${TILE} ${selected === emoji.id ? 'scale-[1.04] bg-primary/20 ring-[3px] ring-primary' : `bg-muted/40 hover:bg-accent ${selected ? 'opacity-45 hover:opacity-80' : ''}`}`}>
                  {content}
                </button>
              ) : <div className={`${TILE} bg-muted/40`}>{content}</div>}
            </li>
          );
        })}
      </ul>
      {pack.can_edit && (
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" data-testid="emoji-image-input"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            if (!picked) return;
            setSelected(null);
            setAdding((previous) => ({ file: picked, key: (previous?.key ?? 0) + 1 }));
          }} />
      )}
      {current && <EmojiTileActions key={current.id} packId={pack.id} emoji={current} onDone={() => setSelected(null)} />}
      {adding && <AddEmojiPanel key={adding.key} packId={pack.id} file={adding.file} onClose={() => setAdding(null)} />}
    </div>
  );
};
