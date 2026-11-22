import { useEffect, useState } from 'react';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { closePinChange, usePinChangeRequest, type PinChangeRequest } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { asksBeforePin, asksBeforeUnpin, type PinChatContext } from '../model/pinRules';
import { usePinActions } from '../model/usePinActions';
import { usePinnedMessages } from '../model/usePinnedMessages';
import { closePinnedPanel, openPinnedPanel, usePinnedPanelOpen } from '../model/pinnedPanel';
import { PinnedBar } from './PinnedBar';
import { PINNED_PANEL_EXIT_MS, PinnedMessagesPanel } from './PinnedMessagesPanel';
import { PinScopeDialog } from './PinScopeDialog';
import { UnpinDialog } from './UnpinDialog';

interface MessagePinsProps {
  chatId: EntityId;
  context: PinChatContext;
  onJump: (messageId: EntityId) => void;
  hideBar?: boolean;
}

const PinRequestHost = ({ chatId, context }: Pick<MessagePinsProps, 'chatId' | 'context'>) => {
  const request = usePinChangeRequest();
  const { pin, unpin } = usePinActions(chatId);
  const [dialog, setDialog] = useState<PinChangeRequest | null>(null);

  useEffect(() => {
    if (!request || String(request.chatId) !== String(chatId)) return;
    closePinChange();
    const needsDialog = request.pin ? asksBeforeUnpin(request.pin) : asksBeforePin(context);
    if (needsDialog) setDialog(request);
    else if (request.pin) void unpin(request.message.id, 'me');
    else void pin(request.message.id, 'me');
  }, [chatId, context, pin, request, unpin]);

  if (!dialog) return null;
  const close = () => setDialog(null);
  const messageId = dialog.message.id;
  return dialog.pin ? (
    <UnpinDialog pin={dialog.pin} peerName={context.kind === 'direct' ? context.peerName : undefined} onCancel={close}
      onUnpin={(scope) => { close(); void unpin(messageId, scope); }} />
  ) : (
    <PinScopeDialog context={context} onCancel={close} onPin={(scope) => { close(); void pin(messageId, scope); }} />
  );
};

export const MessagePins = ({ chatId, context, onJump, hideBar = false }: MessagePinsProps) => {
  const { pins, count, hasMore, isLoadingMore, isError, retry, loadMore } = usePinnedMessages(chatId);
  const panelOpen = usePinnedPanelOpen(chatId);
  useEffect(() => () => closePinnedPanel(), [chatId]);
  const barShown = !hideBar && pins.length > 0;
  const panel = useDelayedUnmount(panelOpen, PINNED_PANEL_EXIT_MS);
  return (
    <>
      {barShown && (
        <PinnedBar key={String(chatId)} pins={pins} count={count} hasMore={hasMore} onJump={onJump}
          onOpenList={() => (panelOpen ? closePinnedPanel() : openPinnedPanel(chatId))} />
      )}
      {panel.mounted && (
        <PinnedMessagesPanel open={panelOpen} chatId={chatId} pins={pins} count={count} hasMore={hasMore} isLoadingMore={isLoadingMore}
          isError={isError} belowBar={barShown}
          onLoadMore={loadMore} onRetry={() => void retry()} onClose={closePinnedPanel}
          onJump={(messageId) => { closePinnedPanel(); onJump(messageId); }} />
      )}
      <PinRequestHost chatId={chatId} context={context} />
    </>
  );
};
