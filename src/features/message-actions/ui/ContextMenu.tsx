import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import { focusComposer } from '@/shared/lib/composerFocus';
import { copyText } from '@/shared/lib/copyText';
import React, { forwardRef, useEffect } from 'react';
import { Message, ContextMenuState, ModalState } from '@/entities/message';
import { useDeleteMessageForMeMutation } from '@/entities/message';
import { discardServerUnsent, notifyMessageDeletedLocally } from '@/entities/message';
import { messageAudioTrack, queueLast, queueNext, requestAddToPlaylist, requestContentReport } from '@/entities/message';
import { findPin, isPinnableMessage, requestPinChange, richCopyText, useGetPinnedMessagesQuery } from '@/entities/message';
import { isConfirmedImport, requestImportAction } from '@/entities/message';
import { usePollMenuActions } from '../model/pollMenuActions';
import { isPersistedId } from '@/shared/api/entityId';
import ContextMenuComponent from '@/shared/ui/ContextMenuComponent';
import { makeStickerFrom } from '@/entities/sticker';
import { isGoApi } from '@/shared/api/goSocket';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { requestMessageDelete } from '../model/deleteRequest';

const VIDEO_STICKER_MAX_BYTES = 15 * 1024 * 1024;

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  messages: Message[];
  token: string;
  chatId: EntityId;
  userId: EntityId;
  setContextMenu: (value: ContextMenuState | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (value: string) => void;
  setReplyTo: (message: Message | null) => void;
  setModal: (modal: ModalState | null) => void;
  wsRef: React.MutableRefObject<SocketSender | null>;
  isClosing: boolean;
  onClose: () => void;
  reactionMenu: { message: Message; x: number; y: number; isClosing?: boolean } | null;
  setReactionMenu: (value: { message: Message; x: number; y: number; isClosing?: boolean } | null) => void;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
  canDeleteMessage?: (message: Message) => boolean;
  isDirect?: boolean;
  onForward?: (message: Message) => void;
  onReply: (message: Message) => void;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({
    contextMenu,
    messages,
    chatId,
    setContextMenu,
    setEditingMessage,
    setMessageInput,
    setReplyTo,
    setModal,
    wsRef,
    isClosing,
    onClose,
    reactionMenu,
    setReactionMenu,
    messageInputRef,
    canDeleteMessage,
    isDirect = false,
    onForward,
    onReply,
  }, ref) => {
    const { translations } = useLanguage();
    const [deleteMessageForMe] = useDeleteMessageForMeMutation();
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !event.composedPath().includes(ref.current)) {
          setContextMenu({ ...contextMenu, isClosing: true });
          setTimeout(() => onClose(), 200);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [ref, contextMenu, setContextMenu, onClose]);

    // Close ContextMenu if ReactionMenu is closed
    useEffect(() => {
      if (!reactionMenu) {
        setContextMenu({ ...contextMenu, isClosing: true });
        setTimeout(() => onClose(), 200);
      }
    }, [reactionMenu, contextMenu, setContextMenu, onClose]);

    const message = messages.find((m) => m.id === contextMenu.messageId);
    const isFile = message?.type === 'file';
    const fileContent = message && typeof message.content !== 'string' ? message.content : null;
    const canEdit = !!message && !message.import && !message.forwarded_from && !message.sticker && !message.poll && !message.contact && !message.location
      && (message.type === 'message' || (isFile && fileContent?.file_type !== 'voice'));
    const stickerType = fileContent?.file_type ?? '';
    const stickerSource = fileContent && !fileContent.album?.length && (stickerType.startsWith('image/')
      || (stickerType.startsWith('video/') && fileContent.file_size <= VIDEO_STICKER_MAX_BYTES)) ? fileContent.file_url : null;
    const canDelete = message ? (canDeleteMessage ? canDeleteMessage(message) : contextMenu.isMine) : contextMenu.isMine;
    const song = message ? messageAudioTrack(message, translations.voiceMessage) : null;
    const musicTrack = song?.kind === 'music' ? song : null;
    const pinsOn = isGoApi() && isPersistedId(chatId);
    const { data: pinState } = useGetPinnedMessagesQuery(chatId, { skip: !pinsOn });
    const pin = message ? findPin(pinState, message.id) : null;
    const canPin = pinsOn && !!message && isPinnableMessage(message);
    const canReport = isGoApi() && !!message && !contextMenu.isMine && !message.is_own && isPersistedId(message.id)
      && !message.is_deleted && !message.system_event && !message.is_system;

    const pollActions = usePollMenuActions(chatId, message, () => closeMenu());

    const handleEdit = () => {
      if (message && canEdit) {
        setEditingMessage(message);
        setMessageInput(plainEmoji(typeof message.content === 'string' ? message.content : fileContent?.caption || ''));
        setReplyTo(null);
        focusComposer(messageInputRef.current);
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const closeMenu = () => {
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };
    const showDeleteError = () => setModal({ type: 'error', message: translations.webSocketError });

    const messageId = contextMenu.messageId;
    const handleDeleteForMe = async () => {
      try {
        if (isPersistedId(messageId)) await deleteMessageForMe(messageId).unwrap();
        else if (message?.server_kept) await discardServerUnsent(chatId, message.client_temp_id ?? messageId);
        notifyMessageDeletedLocally(chatId, messageId);
      } catch (error) {
        console.error('Failed to delete message for me:', error);
        showDeleteError();
      }
    };

    const handleDeleteForEveryone = () => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        showDeleteError();
        return;
      }
      try {
        socket.send(JSON.stringify({ type: 'delete', message_id: messageId }));
      } catch (error) {
        console.error('Failed to delete message for everyone:', error);
        showDeleteError();
      }
    };
    const handleDelete = () => {
      closeMenu();
      requestMessageDelete({
        chatId, forEveryone: canDelete, direct: isDirect,
        deleteForMe: () => void handleDeleteForMe(),
        deleteForEveryone: handleDeleteForEveryone,
      });
    };
    const handleCopy = async () => {
      if (message) {
        const text = richCopyText(message) ?? (message.type === 'file' && typeof message.content !== 'string' ? message.content.file_url : String(message.content));
        await copyText(text);
      }
      closeMenu();
    };

    const handleReply = () => {
      if (message) onReply(message);
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const handleForward = () => {
      if (message && onForward) {
        onForward(message);
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    return (
      <ContextMenuComponent
        ref={ref}
        x={contextMenu.x}
        y={contextMenu.y}
        isMine={contextMenu.isMine}
        openLeft={contextMenu.openLeft}
        {...(canEdit && { onEdit: handleEdit })}
        onDelete={handleDelete}
        {...(!isFile && { onCopy: handleCopy })}
        onReply={handleReply}
        onForward={onForward && message ? handleForward : undefined}
        onTogglePin={canPin && message ? () => { closeMenu(); requestPinChange({ chatId, message, pin }); } : undefined}
        pinned={!!pin}
        onNotMine={message && contextMenu.isMine && isConfirmedImport(message) ? () => { closeMenu(); requestImportAction({ kind: 'notMine', chatId, message }); } : undefined}
        onReport={canReport && message ? () => {
          closeMenu();
          requestContentReport({ kind: 'message', chatId, messageId: message.id, name: message.sender });
        } : undefined}
        onMakeSticker={stickerSource && isGoApi() ? () => { closeMenu(); makeStickerFrom(stickerSource, fileContent?.file_name); } : undefined}
        extraActions={pollActions}
        audioActions={musicTrack ? {
          onPlayNext: () => { closeMenu(); queueNext(musicTrack, translations.audioPlayer.playingNext); },
          onAddToQueue: () => { closeMenu(); queueLast(musicTrack, translations.audioPlayer.addedToQueue); },
          onAddToPlaylist: () => { closeMenu(); requestAddToPlaylist(musicTrack); },
        } : undefined}
        isClosing={isClosing || !!contextMenu.isClosing}
        onClose={onClose}
      />
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
