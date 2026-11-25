import { useState } from 'react';
import { History } from 'lucide-react';
import { isPersistedId } from '@/shared/api/entityId';
import { isGoApi } from '@/shared/api/goSocket';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { IMPORT_SOURCE_NAMES } from '@/entities/message';
import { useDecideImportSenderMutation, useGetChatImportsQuery } from '../api/importApi';
import { importerName, pendingForMe } from '../model/chatImports';
import { useChatMembers } from '../model/useMemberNames';
import type { ImportChatTarget } from '../model/useImportTargets';
import type { ImportMember } from '../model/senderSuggestions';
import { useImportMe } from './useChatImportMenu';

interface ImportConfirmBannerProps {
  chat: ImportChatTarget;
  hidden?: boolean;
  onAnswered?: () => void;
}

const NOBODY: ImportMember = { id: '' };

export const ImportConfirmBanner = ({ chat, hidden = false, onAnswered }: ImportConfirmBannerProps) => {
  const { translations } = useLanguage();
  const t = translations.chatImport.banner;
  const me = useImportMe();
  const source = { chatId: chat.chatId, isGroup: chat.isGroup, peer: chat.peer, me: me ?? NOBODY };
  const enabled = !!me && isGoApi() && isPersistedId(chat.chatId);
  const { data: imports = [] } = useGetChatImportsQuery(source.chatId, { skip: !enabled });
  const pending = pendingForMe(imports, source.me.id);
  const { nameOf } = useChatMembers(source, !pending);
  const [decide, { isLoading }] = useDecideImportSenderMutation();
  const [failed, setFailed] = useState(false);
  if (!pending || hidden) return null;
  const { chatImport, sender } = pending;
  const answer = async (decision: 'confirm' | 'decline') => {
    setFailed(false);
    const result = await decide({ importId: chatImport.id, chatId: source.chatId, key: sender.key, decision });
    if ('error' in result) setFailed(true);
    else onAnswered?.();
  };

  return (
    <div data-testid="import-confirm-banner" role="region" aria-label={translations.chatImport.info.title}
      className="motion-panel-in mx-3 mt-2 space-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <p className="flex gap-2">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{fillTemplate(t.text, {
          name: importerName(chatImport, nameOf),
          total: chatImport.message_count.toLocaleString(),
          source: IMPORT_SOURCE_NAMES[chatImport.source],
          count: sender.message_count.toLocaleString(),
          sender: sender.name,
        })}</span>
      </p>
      {failed && <p role="alert" className="text-destructive">{t.failed}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={() => void answer('decline')}>{t.no}</Button>
        <Button type="button" size="sm" disabled={isLoading} onClick={() => void answer('confirm')}>{t.yes}</Button>
      </div>
    </div>
  );
};
