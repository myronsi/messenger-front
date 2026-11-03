import React, { useEffect, useMemo, useState } from 'react';
import { Forward, Trash2, X } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useDeleteMessagesMutation, notifyMessageDeletedLocally, type Message, type MessageSelection } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import ForwardMessageDialog from './ForwardMessageDialog';
import { MAX_FORWARDED_MESSAGES, MAX_SELECTED_MESSAGES } from '../model/useMessageSelection';

interface SelectionBarProps {
  chatId: EntityId;
  messages: Message[];
  selection?: MessageSelection;
  username: string;
  canDeleteForEveryone: (message: Message) => boolean;
  onClear: () => void;
}

const SelectionBar: React.FC<SelectionBarProps> = ({ chatId, messages, selection, username, canDeleteForEveryone, onClear }) => {
  const { translations } = useLanguage();
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [deleteMessages, { isLoading: isDeleting }] = useDeleteMessagesMutation();

  const selected = useMemo(() => messages.filter((message) => selection?.ids.has(message.id)), [messages, selection]);
  const ids = selected.map((message) => message.id);
  const count = ids.length;
  const forEveryone = count > 0 && selected.every(canDeleteForEveryone);

  useEffect(() => {
    if (!selection?.active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isForwardOpen && !isDeleteOpen) onClear();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDeleteOpen, isForwardOpen, onClear, selection]);

  if (!selection?.active && !selection?.closing) return null;

  const remove = async (scope: 'me' | 'everyone') => {
    setDeleteFailed(false);
    try {
      await deleteMessages({ chatId, messageIds: ids, scope }).unwrap();
      if (scope === 'me') ids.forEach((id) => notifyMessageDeletedLocally(chatId, id));
      setIsDeleteOpen(false);
      onClear();
    } catch {
      setDeleteFailed(true);
    }
  };

  const fill = (text: string | undefined, max: number) => (text || '').replace('{max}', String(max)).replace('{count}', String(count));
  const iconButton = 'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

  return (
    <>
      <div data-testid="selection-bar" className={`motion-selection-bar absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] ${
        selection.closing ? 'is-closing pointer-events-none' : ''}`}>
        <div className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur">
          <button type="button" onClick={onClear} aria-label={translations.cancelSelection} className="rounded-full p-2 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
          <span className="flex-1 text-sm font-medium" aria-live="polite">{fill(translations.selectedMessages, MAX_SELECTED_MESSAGES)}</span>
          {count <= MAX_FORWARDED_MESSAGES && (
            <button type="button" onClick={() => setIsForwardOpen(true)} className={`${iconButton} motion-selection-check hover:bg-accent`}>
              <Forward className="h-4 w-4" />
              <span className="hidden sm:inline">{translations.forward}</span>
            </button>
          )}
          <button type="button" onClick={() => { setDeleteFailed(false); setIsDeleteOpen(true); }} className={`${iconButton} text-destructive hover:bg-destructive/10`}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{translations.deleteMessage}</span>
          </button>
        </div>
      </div>
      <ForwardMessageDialog
        open={isForwardOpen}
        onOpenChange={setIsForwardOpen}
        message={null}
        bulk={isForwardOpen ? { chatId, messageIds: ids } : null}
        username={username}
        onForwarded={onClear}
      />
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !isDeleting && setIsDeleteOpen(open)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{fill(translations.deleteMessagesConfirm, MAX_SELECTED_MESSAGES)}</DialogTitle>
          </DialogHeader>
          {deleteFailed && <p className="text-sm text-destructive">{translations.failedToDeleteMessages}</p>}
          <div className="flex flex-col gap-2">
            {forEveryone && (
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void remove('everyone')}>{translations.deleteForEveryone}</Button>
            )}
            <Button type="button" variant={forEveryone ? 'outline' : 'destructive'} disabled={isDeleting} onClick={() => void remove('me')}>{translations.deleteForMe}</Button>
            <Button type="button" variant="ghost" disabled={isDeleting} onClick={() => setIsDeleteOpen(false)}>{translations.cancel}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectionBar;
