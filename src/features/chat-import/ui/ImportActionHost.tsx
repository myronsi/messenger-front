import { useState } from 'react';
import { UserX } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { closeImportAction, useImportActionRequest } from '@/entities/message';
import { useDecideImportSenderMutation, useGetChatImportsQuery } from '../api/importApi';
import { confirmedSenderOf } from '../model/chatImports';
import { useImportMe } from './useChatImportMenu';

interface ImportActionHostProps {
  onChanged?: () => void;
}

export const ImportActionHost = ({ onChanged }: ImportActionHostProps) => {
  const { translations } = useLanguage();
  const meId = useImportMe()?.id ?? null;
  const t = translations.chatImport;
  const request = useImportActionRequest();
  const info = request?.message.import;
  const { data: imports = [] } = useGetChatImportsQuery(request?.chatId ?? '', { skip: !request });
  const [decide, { isLoading }] = useDecideImportSenderMutation();
  const [error, setError] = useState<string | null>(null);
  if (!request || !info) return null;
  const name = info.sender_name ?? '';
  const key = confirmedSenderOf(imports, info.import_id, name, meId)?.key;
  const close = () => {
    setError(null);
    closeImportAction();
  };
  const confirm = async () => {
    if (!key) return;
    const result = await decide({ importId: info.import_id, chatId: request.chatId, key, decision: 'withdraw' });
    if ('error' in result) {
      setError(t.info.failed);
      return;
    }
    close();
    onChanged?.();
  };

  return (
    <ActionDialog icon={<UserX />} title={t.notMineTitle} points={[fillTemplate(t.notMineHint, { name })]}
      confirmText={t.notMine} cancelText={t.actions.cancel} busy={isLoading} confirmDisabled={!key} error={error}
      onCancel={close} onConfirm={() => void confirm()} />
  );
};
