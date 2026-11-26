import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Send } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { asApiError } from '@/shared/lib/apiError';
import { isMobileComposer } from '@/shared/lib/composerFocus';
import { useBackToClose } from '@/shared/lib/useBackToClose';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { Message, useChatFormatters, useForwardMessageMutation, useForwardMessagesMutation } from '@/entities/message';
import { useGetCurrentUserQuery } from '@/shared/api/currentUserApi';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/sonner';
import { forwardTargetLimit } from '../model/useMessageSelection';
import { useForwardTargets, type ForwardTarget } from '../model/useForwardTargets';
import { ForwardTargetRow } from './ForwardTargetRow';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Pick<Message, 'id'> | null;
  bulk?: { chatId: EntityId; messageIds: EntityId[] } | null;
  username: string;
  onForwarded?: () => void;
}

const FULL_SCREEN_ON_PHONE = 'max-md:left-0 max-md:top-0 max-md:h-[100dvh] max-md:max-h-none max-md:max-w-none max-md:translate-x-0 '
  + 'max-md:translate-y-0 max-md:rounded-none max-md:border-0';

const withName = (template: string, name: string) => {
  const [before, after = ''] = template.split('{name}');
  return <span>{before}<EmojiText text={name} />{after}</span>;
};

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const ForwardMessageDialog: React.FC<ForwardMessageDialogProps> = ({ open, onOpenChange, message, bulk, username, onForwarded }) => {
  const { translations: t } = useLanguage();
  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EntityId[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [forwardMessage, { isLoading: isForwardingOne }] = useForwardMessageMutation();
  const [forwardMessages, { isLoading: isForwardingMany }] = useForwardMessagesMutation();
  const sending = isForwardingOne || isForwardingMany;
  const { data: me } = useGetCurrentUserQuery(undefined, { skip: !open });
  const { getLastMessagePreview, getLastMessageTime } = useChatFormatters(me?.id);
  const { targets, isLoading } = useForwardTargets(open, username, query, t);
  const maxTargets = forwardTargetLimit(bulk ? bulk.messageIds.length : 1);
  const atLimit = selected.length >= maxTargets;
  useBackToClose(open && selected.length > 0, () => setSelected([]), 'forward-pick');

  useEffect(() => {
    if (open) return;
    setQuery('');
    setSelected([]);
    setHighlight(0);
    setStatusMessage(null);
  }, [open]);

  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelectorAll('[data-testid="forward-target"]')[highlight]?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);

  const send = async (ids: EntityId[], name?: string) => {
    if ((!message && !bulk) || !ids.length || sending) return;
    setStatusMessage(null);
    try {
      if (bulk) {
        await forwardMessages({ chatId: bulk.chatId, messageIds: bulk.messageIds, targetChatIds: ids }).unwrap();
      } else if (message) {
        const result = await forwardMessage({ sourceMessageId: message.id, targetChatIds: ids }).unwrap();
        if (result.failed.length > 0) {
          setStatusMessage(`${t.failedToForwardMessage}: ${result.failed.map((failure) => failure.reason).join(', ')}`);
          return;
        }
      }
      toast(ids.length === 1 && name ? withName(t.forwardedTo, name) : fillTemplate(t.forwardedToChats, { count: String(ids.length) }));
      onForwarded?.();
      onOpenChange(false);
    } catch (caught) {
      setStatusMessage(asApiError(caught)?.data?.detail || t.failedToForwardMessage);
    }
  };

  const toggle = (target: ForwardTarget) => {
    setStatusMessage(null);
    setSelected((current) => {
      if (current.includes(target.id)) return current.filter((id) => id !== target.id);
      return current.length < maxTargets ? [...current, target.id] : current;
    });
  };

  const activate = (target: ForwardTarget, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey || selected.length) toggle(target);
    else void send([target.id], target.name);
  };

  const onSearchKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((index) => Math.max(0, Math.min(targets.length - 1, index + step)));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selected.length) void send(selected);
      else if (targets[highlight]) void send([targets[highlight].id], targets[highlight].name);
    }
  };

  const hint = isMobile ? t.forwardMobileHint : fillTemplate(t.forwardDesktopHint, { key: isMac() ? '⌘' : t.forwardModifierKey });

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent ref={dialogRef} hideClose={isMobile} aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          if (!isMobileComposer()) return;
          event.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
        }}
        className={`forward-sheet flex max-h-[85vh] max-w-md flex-col gap-0 p-0 ${FULL_SCREEN_ON_PHONE}`}>
        <div className="flex h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] md:px-4">
          {isMobile && (
            <button type="button" onClick={() => onOpenChange(false)} aria-label={t.back} className="rounded-full p-2 hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <DialogTitle key={selected.length ? 'picking' : 'title'} className="motion-forward-title truncate text-lg font-semibold">
            {selected.length ? fillTemplate(t.selectedMessages, { count: String(selected.length) }) : t.forwardTo}
          </DialogTitle>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onSearchKey} placeholder={t.search}
              aria-label={t.search}
              className="h-10 w-full rounded-full bg-muted pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
        <div ref={listRef} role="listbox" aria-multiselectable="true" aria-label={t.forwardTo} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {isLoading ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t.loading}</p>
            : !targets.length ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t.noChats}</p>
              : targets.map((target, index) => (
                <ForwardTargetRow key={`${target.type}-${target.id}`} target={target}
                  preview={getLastMessagePreview(target.lastMessage)} time={getLastMessageTime(target.lastMessage)}
                  groupLabel={t.group} chooseLabel={fillTemplate(t.forwardChooseChat, { name: plainEmoji(target.name) })}
                  selected={selected.includes(target.id)} selecting={selected.length > 0} highlighted={!isMobile && index === highlight}
                  disabled={sending || (atLimit && !selected.includes(target.id))} onActivate={activate} onToggle={toggle}
                  enterDelayMs={Math.min(index, 10) * 25} />
              ))}
        </div>
        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {atLimit && <p className="mb-2 text-xs text-muted-foreground">{fillTemplate(t.forwardTargetLimit, { max: String(maxTargets) })}</p>}
          {statusMessage && <p role="alert" className="mb-2 text-sm text-destructive">{statusMessage}</p>}
          {selected.length ? (
            <div key="send" className="motion-forward-footer flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={sending} onClick={() => setSelected([])}>{t.cancel}</Button>
              <Button type="button" disabled={sending} onClick={() => void send(selected)}>
                <Send className="h-4 w-4" />
                {fillTemplate(t.forwardSendCount, { count: String(selected.length) })}
              </Button>
            </div>
          ) : <p key="hint" className="motion-forward-footer text-xs text-muted-foreground">{hint}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;
