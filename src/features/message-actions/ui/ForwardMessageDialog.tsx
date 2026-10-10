import { asApiError } from '@/shared/lib/apiError';
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Send } from 'lucide-react';
import { Message } from '@/entities/message';
import { useForwardMessageMutation } from '@/entities/message';
import { useGetGroupChatsQuery, useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { useGetBlockedUsersQuery } from '@/entities/user';
import type { Id } from '@/shared/lib/ids';
import { isServerId } from '@/shared/lib/ids';
import MediaImg from '@/shared/ui/MediaImg';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  username: string;
  onForwarded?: () => void;
}

interface ForwardTarget {
  id: Id;
  name: string;
  subtitle: string;
  avatarUrl: string;
  type: 'one-on-one' | 'group';
}

const ForwardMessageDialog: React.FC<ForwardMessageDialogProps> = ({
  open,
  onOpenChange,
  message,
  username,
  onForwarded,
}) => {
  const { translations } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<Id[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [forwardMessage, { isLoading }] = useForwardMessageMutation();
  const { data: directChatsData, isLoading: isLoadingDirect } = useGetOneOnOneChatsQuery({ skip: !open || !username });
  const { data: groupChatsData, isLoading: isLoadingGroups } = useGetGroupChatsQuery({ skip: !open || !username });
  const { data: blockedUsersData } = useGetBlockedUsersQuery(undefined, { skip: !open });

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedChatIds([]);
      setStatusMessage(null);
    }
  }, [open]);

  const targets = useMemo<ForwardTarget[]>(() => {
    const blockedUsernameSet = new Set((blockedUsersData?.users || []).map((user) => user.username.toLowerCase()));
    const directTargets = (directChatsData?.chats || [])
      .filter((chat) => (
        isServerId(chat.id) &&
        !chat.pending_approval_request &&
        !chat.interlocutor_deleted &&
        !blockedUsernameSet.has(chat.interlocutor_name.toLowerCase())
      ))
      .map((chat) => ({
        id: chat.id,
        name: chat.interlocutor_display_name || chat.interlocutor_name,
        subtitle: chat.interlocutor_name,
        avatarUrl: resolveMediaUrl(chat.avatar_url, DEFAULT_AVATAR),
        type: 'one-on-one' as const,
      }));

    const groupTargets = (groupChatsData?.groups || []).map((group) => ({
      id: group.chat_id,
      name: group.name,
      subtitle: translations.group || 'Group',
      avatarUrl: resolveMediaUrl(group.avatar_url, DEFAULT_GROUP_AVATAR),
      type: 'group' as const,
    }));

    const normalizedQuery = query.trim().toLowerCase();
    return [...directTargets, ...groupTargets].filter((target) => (
      !normalizedQuery ||
      target.name.toLowerCase().includes(normalizedQuery) ||
      target.subtitle.toLowerCase().includes(normalizedQuery)
    ));
  }, [blockedUsersData?.users, directChatsData?.chats, groupChatsData?.groups, query, translations.group]);

  const toggleTarget = (chatId: Id) => {
    setSelectedChatIds((current) => (
      current.includes(chatId)
        ? current.filter((id) => id !== chatId)
        : [...current, chatId]
    ));
    setStatusMessage(null);
  };

  const handleForward = async () => {
    if (!message || selectedChatIds.length === 0 || isLoading) return;

    try {
      const result = await forwardMessage({
        sourceMessageId: message.id,
        targetChatIds: selectedChatIds,
      }).unwrap();

      if (result.failed.length > 0) {
        setStatusMessage(
          `${translations.failedToForwardMessage || 'Failed to forward message'}: ${result.failed.map((failure) => failure.reason).join(', ')}`
        );
        return;
      }

      setStatusMessage(translations.messageForwarded || 'Message forwarded');
      onForwarded?.();
      onOpenChange(false);
    } catch (caught) {
      const error = asApiError(caught);
      setStatusMessage(error?.data?.detail || translations.failedToForwardMessage || 'Failed to forward message');
    }
  };

  const isLoadingTargets = isLoadingDirect || isLoadingGroups;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[85vh] max-w-md grid-rows-[auto_auto_minmax(0,1fr)_auto] p-0">
        <DialogHeader className="border-b border-border px-4 py-4">
          <DialogTitle>{translations.forwardMessage || 'Forward message'}</DialogTitle>
        </DialogHeader>

        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translations.selectChats || 'Select chats'}
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-2 pb-2">
          {isLoadingTargets ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{translations.loading}</div>
          ) : targets.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{translations.noChats || 'No active chats'}</div>
          ) : (
            <div className="space-y-1">
              {targets.map((target) => {
                const isSelected = selectedChatIds.includes(target.id);
                return (
                  <button
                    key={`${target.type}-${target.id}`}
                    type="button"
                    onClick={() => toggleTarget(target.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <Checkbox
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={() => toggleTarget(target.id)}
                    />
                    <MediaImg src={target.avatarUrl} alt={target.name} className="h-9 w-9 rounded-full object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{target.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{target.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          {statusMessage && <div className="mb-2 text-sm text-destructive">{statusMessage}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {translations.cancel}
            </Button>
            <Button type="button" onClick={handleForward} disabled={!message || selectedChatIds.length === 0 || isLoading}>
              <Send className="h-4 w-4" />
              {translations.forward || 'Forward'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;
