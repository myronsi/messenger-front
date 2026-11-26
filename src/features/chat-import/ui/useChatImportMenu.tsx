import { useMemo, useState } from 'react';
import { FileInput, History } from 'lucide-react';
import { isPersistedId } from '@/shared/api/entityId';
import { isGoApi } from '@/shared/api/goSocket';
import { useGetCurrentUserQuery } from '@/shared/api/currentUserApi';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ImportChatTarget, ImportMe } from '../model/useImportTargets';
import { ImportChatDialog } from './ImportChatDialog';
import { ImportInfoPanel } from './ImportInfoPanel';
import { useGetChatImportsQuery } from '../api/importApi';

interface ChatImportMenuOptions {
  chat: ImportChatTarget;
  canImport: boolean;
  canRemoveAll?: boolean;
}

export const useImportMe = (): ImportMe | null => {
  const { data } = useGetCurrentUserQuery();
  return useMemo(() => (data ? { id: data.id, username: data.username, displayName: data.account_display_name } : null), [data]);
};

export const useChatImportMenu = ({ chat, canImport, canRemoveAll = false }: ChatImportMenuOptions) => {
  const { translations } = useLanguage();
  const t = translations.chatImport;
  const me = useImportMe();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const enabled = !!me && isGoApi() && isPersistedId(chat.chatId);
  const { data: imports = [] } = useGetChatImportsQuery(chat.chatId, { skip: !enabled });
  if (!enabled) return { items: null, dialogs: null };
  const self = { id: me.id, username: me.username, displayName: me.displayName };

  return {
    items: (
      <>
        {canImport && (
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            <FileInput className="mr-2 h-4 w-4" />{t.importHistory}
          </DropdownMenuItem>
        )}
        {imports.length > 0 && (
          <DropdownMenuItem onSelect={() => setInfoOpen(true)}>
            <History className="mr-2 h-4 w-4" />{t.info.title}
          </DropdownMenuItem>
        )}
      </>
    ),
    dialogs: (
      <>
        <ImportChatDialog open={dialogOpen} onOpenChange={setDialogOpen} me={me} chat={chat} />
        <ImportInfoPanel open={infoOpen} onOpenChange={setInfoOpen} chatId={chat.chatId} isGroup={chat.isGroup} me={self} peer={chat.peer}
          canRemoveAll={canRemoveAll} />
      </>
    ),
  };
};
