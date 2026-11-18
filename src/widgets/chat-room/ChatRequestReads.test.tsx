import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import Chat from './Chat';

const state = vi.hoisted(() => ({
  chats: [] as { id: string; is_request?: boolean }[],
  listProps: {} as Record<string, unknown>,
  markMessagesRead: vi.fn(),
}));
const ok = () => ({ unwrap: () => Promise.resolve() });

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/auth/session', () => ({ useAccessToken: () => 'token' }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => vi.fn() }));
vi.mock('@/features/profile', () => ({ useGetCurrentUserQuery: () => ({ data: { id: '1', username: 'me' } }) }));
vi.mock('@/entities/user', () => ({
  useGetBlockedUsersQuery: () => ({ data: { users: [] } }),
  useBlockUserMutation: () => [ok],
}));
vi.mock('@/entities/chat', () => ({
  chatApi: { util: { invalidateTags: (tags: string[]) => ({ type: 'invalidate', tags }) } },
  useGetOneOnOneChatsQuery: (_: string, options: { selectFromResult: (result: { data: unknown }) => unknown }) =>
    options.selectFromResult({ data: { chats: state.chats } }),
  useAcceptChatRequestMutation: () => [ok],
  useDeleteChatMutation: () => [ok],
}));
vi.mock('@/entities/message', () => ({ ChatHeaderSearch: () => null }));
vi.mock('@/features/message-list', () => ({
  MessageList: (props: Record<string, unknown>) => { state.listProps = props; return null; },
}));
vi.mock('@/features/message-composer', () => ({ MessageComposer: () => null }));
vi.mock('@/features/image-drawing', () => ({ ImageDrawingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/features/message-actions', () => ({
  useMessageSelection: () => ({ selection: { active: false }, start: vi.fn(), clear: vi.fn(), selectAll: vi.fn(), intercept: (fn: unknown) => fn }),
  useReplyAction: () => vi.fn(),
}));
vi.mock('@/shared/lib/useBackToClose', () => ({ useBackToClose: () => undefined }));
vi.mock('@/shared/lib/useElementHeight', () => ({ useElementHeight: () => [vi.fn(), 0, null] }));
vi.mock('./ui/ChatHeader', () => ({ default: () => null }));
vi.mock('./ui/ChatOverlays', () => ({ default: () => null }));
vi.mock('./ui/ChatUnblockButton', () => ({ default: () => null }));
vi.mock('./model/usePreviewHandoff', () => ({ usePreviewHandoff: () => undefined }));
vi.mock('./model/usePreviewChat', () => ({
  usePreviewChat: () => ({
    previewMessageInput: '', setPreviewMessageInput: vi.fn(), previewFailedMessages: [], isCreatingPreviewChat: false,
    hasPendingApprovalRequest: false, previewModal: null, setPreviewModal: vi.fn(), clearPreviewMessages: vi.fn(),
    handleSendMessagePreview: vi.fn(), handleFileUploadPreview: vi.fn(),
  }),
}));
vi.mock('./model/useChatInteractions', () => ({
  useChatInteractions: () => ({
    handleMessageClick: vi.fn(), onOpenReactionMenu: vi.fn(), onOpenProfile: vi.fn(), interlocutorAvatar: '',
    jumpToSearchResult: vi.fn(), onScrollStart: vi.fn(),
  }),
}));
vi.mock('./model/useChatRoomState', () => ({
  useChatRoomState: () => ({
    messages: [], composerDraftRef: { current: null }, setMessageInput: vi.fn(), contextMenu: null, setContextMenu: vi.fn(),
    replyTo: null, setReplyTo: vi.fn(), editingMessage: null, setEditingMessage: vi.fn(), setSelectedUser: vi.fn(),
    modal: null, setModal: vi.fn(), highlightedMessageId: null, isLoadingInitialMessages: false, isLoadingOlderMessages: false,
    isLoadingNewerMessages: false, hasMoreMessages: false, hasMoreNewerMessages: false, scrollToMessage: vi.fn(),
    loadOlderMessages: vi.fn(), loadNewerMessages: vi.fn(), loadLatestMessages: vi.fn(), loadMessagesAround: vi.fn(),
    markMessagesRead: state.markMessagesRead, handleSendMessage: vi.fn(), handleSendSticker: vi.fn(), handleResendMessage: vi.fn(),
    handleFileUpload: vi.fn(), createOptimisticUploadMessage: vi.fn(), updateOptimisticUploadProgress: vi.fn(),
    markOptimisticUploadFailed: vi.fn(), settleOptimisticUpload: vi.fn(), handleDeleteChat: vi.fn(),
    getFormattedDateLabel: vi.fn(), getMessageTime: vi.fn(), renderMessageContent: vi.fn(), wsRef: { current: null },
  }),
}));

const renderChat = () => render(
  <Chat chatId="7" chatName="stranger" chatDisplayName="Sam Stranger" username="me" interlocutorDeleted={false}
    onBack={vi.fn()} setIsUserProfileOpen={vi.fn()} />,
);

describe('Chat in the Requests folder', () => {
  beforeEach(() => {
    state.listProps = {};
  });

  it('shows the request banner and gives the message list no read handler', () => {
    state.chats = [{ id: '7', is_request: true }];
    renderChat();
    expect(screen.getByTestId('chat-request-banner')).toBeInTheDocument();
    expect(state.listProps.onMarkMessagesRead).toBeUndefined();
  });

  it('marks messages read in an ordinary chat', () => {
    state.chats = [{ id: '7' }];
    renderChat();
    expect(screen.queryByTestId('chat-request-banner')).not.toBeInTheDocument();
    expect(state.listProps.onMarkMessagesRead).toBe(state.markMessagesRead);
  });
});
