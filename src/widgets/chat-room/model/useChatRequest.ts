import { useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { chatApi, useAcceptChatRequestMutation, useDeleteChatMutation, useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useBlockUserMutation } from '@/entities/user';
import { useAppDispatch } from '@/shared/hooks/redux';
import { asApiError } from '@/shared/lib/apiError';

interface ChatRequestOptions {
  chatId: EntityId;
  chatName: string;
  username: string;
  onBack: () => void;
  onError: (message: string) => void;
  fallbackError: string;
}

export function useChatRequest({ chatId, chatName, username, onBack, onError, fallbackError }: ChatRequestOptions) {
  const dispatch = useAppDispatch();
  const { listed } = useGetOneOnOneChatsQuery(username, {
    skip: !username,
    selectFromResult: ({ data }) => ({ listed: !!data?.chats.find((chat) => String(chat.id) === String(chatId))?.is_request }),
  });
  const [settled, setSettled] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptRequest] = useAcceptChatRequestMutation();
  const [deleteChat] = useDeleteChatMutation();
  const [blockUser] = useBlockUserMutation();
  const isRequest = listed && settled !== String(chatId);

  const fail = (caught: unknown) => {
    const error = asApiError(caught);
    onError(error?.data?.detail || error?.message || fallbackError);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(false);
    }
  };

  const accept = () => run(async () => {
    setSettled(String(chatId));
    try {
      await acceptRequest(chatId).unwrap();
    } catch (caught) {
      setSettled(null);
      throw caught;
    }
  });

  const remove = () => run(async () => {
    await deleteChat({ chatId, scope: 'me' }).unwrap();
    onBack();
  });

  const block = () => run(async () => {
    await blockUser(chatName).unwrap();
    await deleteChat({ chatId, scope: 'me' }).unwrap();
    onBack();
  });

  const withReply = <Args extends unknown[], Result>(send: (...args: Args) => Result) => (...args: Args) => {
    const result = send(...args);
    if (isRequest) {
      void Promise.resolve(result).catch(() => undefined).then(() => dispatch(chatApi.util.invalidateTags(['Chat'])));
    }
    return result;
  };

  const readMarker = <Mark>(mark: Mark) => (isRequest ? undefined : mark);

  return { isRequest, busy, accept, remove, block, withReply, readMarker };
}
