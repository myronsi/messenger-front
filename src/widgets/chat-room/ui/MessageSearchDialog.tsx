import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Message } from '@/entities/message';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface MessageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  getMessageTime: (timestamp: string) => string;
  onJumpToMessage: (messageId: number) => void;
}

const getSearchText = (message: Message) => {
  if (typeof message.content === 'string') return message.content;
  return message.content?.file_name || '';
};

const MessageSearchDialog: React.FC<MessageSearchDialogProps> = ({
  open,
  onOpenChange,
  messages,
  getMessageTime,
  onJumpToMessage,
}) => {
  const { translations } = useLanguage();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return messages
      .filter((message) => getSearchText(message).toLowerCase().includes(normalizedQuery))
      .slice()
      .reverse();
  }, [messages, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{translations.searchMessages || 'Search messages'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translations.searchInChat || 'Search in chat'}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
            {query.trim() && results.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                {translations.noSearchResults || 'No results'}
              </div>
            ) : (
              results.map((message) => {
                const text = getSearchText(message);
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      onJumpToMessage(message.id);
                      onOpenChange(false);
                    }}
                    className="flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-accent"
                  >
                    <div className="flex max-w-full items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{message.sender}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{getMessageTime(message.timestamp)}</span>
                    </div>
                    <span className="line-clamp-2 text-sm text-muted-foreground">{text}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageSearchDialog;
