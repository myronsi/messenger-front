import { useEffect, useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { isPersistedId } from '@/shared/api/entityId';
import { isGoApi } from '@/shared/api/goSocket';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { useGetChatImportsQuery, useRemoveImportMutation } from '../api/importApi';
import { importPercent, useActiveImport } from '../model/activeImport';
import { importerName, isImporter } from '../model/chatImports';
import { clearResume, loadResume } from '../model/resumeStore';
import { useChatMembers } from '../model/useMemberNames';
import type { ImportChatTarget } from '../model/useImportTargets';
import type { ImportMember } from '../model/senderSuggestions';
import { ImportChatDialog } from './ImportChatDialog';
import { useImportMe } from './useChatImportMenu';

const POLL_MS = 15_000;
const NOBODY: ImportMember = { id: '' };

export const ImportStatusBanner = ({ chat }: { chat: ImportChatTarget }) => {
  const { translations } = useLanguage();
  const t = translations.chatImport.status;
  const me = useImportMe();
  const active = useActiveImport();
  const [continuing, setContinuing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const [removeImport, { isLoading: removing }] = useRemoveImportMutation();
  const enabled = !!me && isGoApi() && isPersistedId(chat.chatId);
  const [polling, setPolling] = useState(0);
  const { data: imports = [] } = useGetChatImportsQuery(chat.chatId, { skip: !enabled, pollingInterval: polling });
  const running = imports.find((item) => item.state === 'running') ?? null;
  const live = !!running && !!active && String(active.importId) === String(running.id);
  const nextPolling = running && !live ? POLL_MS : 0;
  useEffect(() => setPolling(nextPolling), [nextPolling]);
  const { nameOf } = useChatMembers({ chatId: chat.chatId, isGroup: chat.isGroup, peer: chat.peer, me: me ?? NOBODY }, !running);
  if (!running || !me) return continuing && me ? <ImportChatDialog open onOpenChange={setContinuing} me={me} chat={chat} /> : null;

  const mine = isImporter(running, me.id);
  const percent = live && active ? importPercent(active.done, active.total) : importPercent(running.next_index, running.message_count);
  const values = { percent: String(percent), name: importerName(running, nameOf) };
  const text = live ? (active?.waitingSeconds ? t.waiting : t.importing) : mine ? t.paused : t.other;
  const remove = async () => {
    setRemoveFailed(false);
    const result = await removeImport({ importId: running.id, chatId: chat.chatId });
    if ('error' in result) {
      setRemoveFailed(true);
      return;
    }
    if (String(loadResume()?.importId) === String(running.id)) clearResume();
    setConfirmRemove(false);
  };

  return (
    <div data-testid="import-status-banner" role="status" aria-label={translations.chatImport.info.title}
      className="motion-panel-in mx-3 mt-2 space-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <p className="flex items-center gap-2">
        <History className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">{fillTemplate(text, values)}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{percent}%</span>
      </p>
      <Progress value={percent} aria-label={fillTemplate(text, values)} className="h-1.5" />
      {mine && !live && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-foreground">{t.pausedHint}</span>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmRemove(true)}>{t.remove}</Button>
          <Button type="button" size="sm" onClick={() => setContinuing(true)}>{t.continue}</Button>
        </div>
      )}
      {continuing && <ImportChatDialog open onOpenChange={setContinuing} me={me} chat={chat} />}
      {confirmRemove && (
        <ActionDialog icon={<Trash2 />} title={t.removeTitle} points={[fillTemplate(t.removeHint, values)]} confirmText={t.remove}
          cancelText={translations.chatImport.actions.cancel} tone="destructive" busy={removing} error={removeFailed ? t.removeFailed : null}
          onCancel={() => setConfirmRemove(false)} onConfirm={() => void remove()} />
      )}
    </div>
  );
};
