import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { IMPORT_SOURCE_NAMES } from '@/entities/message';
import { useAssignImportSenderMutation, useGetChatImportsQuery, useRemoveImportMutation } from '../api/importApi';
import type { ChatImport, ChatImportSender } from '../api/importTypes';
import { importerName, isImporter } from '../model/chatImports';
import { useChatMembers, type ChatMembersSource } from '../model/useMemberNames';

interface ImportInfoPanelProps extends ChatMembersSource {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRemoveAll?: boolean;
}

const KEEP = '';

export const ImportInfoPanel = ({ open, onOpenChange, canRemoveAll = false, ...source }: ImportInfoPanelProps) => {
  const { translations, language } = useLanguage();
  const t = translations.chatImport.info;
  const { data: imports = [], isLoading } = useGetChatImportsQuery(source.chatId, { skip: !open });
  const { members, nameOf } = useChatMembers(source, !open);
  const [assign] = useAssignImportSenderMutation();
  const [remove, { isLoading: removing }] = useRemoveImportMutation();
  const [removal, setRemoval] = useState<ChatImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const month = (value: string) => new Date(value).toLocaleDateString(localeOf(language), { month: 'short', year: 'numeric' });

  const changeAssignment = async (chatImport: ChatImport, sender: ChatImportSender, value: string) => {
    setError(null);
    const result = await assign({ importId: chatImport.id, chatId: source.chatId, key: sender.key, userId: value === KEEP ? null : value });
    if ('error' in result) setError(t.failed);
  };

  const confirmRemoval = async () => {
    if (!removal) return;
    const result = await remove({ importId: removal.id, chatId: source.chatId });
    if ('error' in result) setError(t.failed);
    setRemoval(null);
  };

  const senderRow = (chatImport: ChatImport, sender: ChatImportSender, mine: boolean) => {
    const assigned = sender.user_id !== null && sender.user_id !== undefined ? nameOf(sender.user_id) : undefined;
    const editable = mine && sender.state !== 'me' && sender.state !== 'confirmed';
    return (
      <li key={sender.key} data-testid="import-info-sender" className="flex flex-wrap items-center justify-between gap-2 py-1.5">
        <span className="min-w-0">
          <span className="block truncate font-medium">{sender.name}</span>
          <span className="block text-xs text-muted-foreground">
            {t.states[sender.state]}{assigned && sender.state !== 'me' ? ` · ${assigned}` : ''}
          </span>
        </span>
        {editable && (
          <select aria-label={`${t.assign}: ${sender.name}`} value={sender.state === 'pending' ? String(sender.user_id ?? KEEP) : KEEP}
            onChange={(event) => void changeAssignment(chatImport, sender, event.target.value)}
            className="max-w-[55%] rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
            <option value={KEEP}>{sender.state === 'pending' ? t.unassign : t.assign}</option>
            {members.filter((member) => String(member.id) !== String(source.me.id)).map((member) => (
              <option key={String(member.id)} value={String(member.id)}>{member.displayName || member.username}</option>
            ))}
          </select>
        )}
      </li>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="import-info-panel" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription className="sr-only">{t.title}</DialogDescription>
          {!isLoading && imports.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}
          {imports.map((chatImport) => {
            const mine = isImporter(chatImport, source.me.id);
            return (
              <section key={String(chatImport.id)} className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{fillTemplate(t.summary, {
                  count: chatImport.message_count.toLocaleString(localeOf(language)),
                  source: IMPORT_SOURCE_NAMES[chatImport.source],
                  range: `${month(chatImport.first_at)} – ${month(chatImport.last_at)}`,
                })}</p>
                <p className="text-xs text-muted-foreground">
                  {fillTemplate(t.importedBy, { name: importerName(chatImport, nameOf) })}{chatImport.state === 'running' ? ` · ${t.running}` : ''}
                </p>
                <ul className="divide-y divide-border text-sm">{chatImport.senders.map((sender) => senderRow(chatImport, sender, mine))}</ul>
                {(mine || canRemoveAll) && chatImport.state !== 'removing' && (
                  <Button type="button" variant="ghost" size="sm" className="px-0 text-destructive hover:bg-transparent" onClick={() => setRemoval(chatImport)}>
                    <Trash2 className="mr-2 h-4 w-4" />{t.remove}
                  </Button>
                )}
              </section>
            );
          })}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
      {removal && (
        <ActionDialog icon={<Trash2 />} title={t.removeTitle} points={[fillTemplate(t.removeHint, { count: removal.message_count.toLocaleString() })]}
          confirmText={t.remove} cancelText={translations.chatImport.actions.cancel} busy={removing}
          onCancel={() => setRemoval(null)} onConfirm={() => void confirmRemoval()} />
      )}
    </>
  );
};
