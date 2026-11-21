import { useEffect, useState } from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { offersEveryone, type CleanupRequest } from '../model/useChatCleanup';

interface ChatCleanupDialogProps {
  request: CleanupRequest | null;
  onCancel: () => void;
  onConfirm: (forEveryone: boolean) => void;
  busy?: boolean;
}

export const ChatCleanupDialog = ({ request, onCancel, onConfirm, busy }: ChatCleanupDialogProps) => {
  const { translations } = useLanguage();
  const [forEveryone, setForEveryone] = useState(false);
  useEffect(() => {
    if (!request) setForEveryone(false);
  }, [request]);
  if (!request) return null;
  const t = translations.chatCleanup;
  const { kind, target } = request;
  const name = { name: target.name };
  const fill = (lines: readonly string[]) => lines.map((line) => fillTemplate(line, name));
  const everyone = offersEveryone(request);
  const close = (run: () => void) => {
    setForEveryone(false);
    run();
  };

  const title = kind === 'delete'
    ? (target.isSaved ? t.deleteSavedTitle : fillTemplate(t.deleteTitle, name))
    : target.isSaved ? t.clearSavedTitle : fillTemplate(target.isGroup ? t.clearGroupTitle : t.clearTitle, name);
  const points = kind === 'delete'
    ? fill(target.isSaved ? t.deleteSavedPoints : t.deletePoints)
    : fill(target.isSaved ? t.clearSavedPoints : !target.isGroup ? t.clearPoints : everyone ? t.clearGroupPoints : t.clearGroupMemberPoints);
  const option = !everyone ? undefined : kind === 'delete'
    ? { label: fillTemplate(t.alsoDeleteFor, name), hint: t.alsoDeleteHint }
    : target.isGroup
      ? { label: t.clearForAllMembers, hint: t.clearForAllHint }
      : { label: fillTemplate(t.alsoClearFor, name), hint: t.alsoClearHint };

  return (
    <ActionDialog
      icon={kind === 'delete' ? <Trash2 /> : <Eraser />}
      title={title}
      points={points}
      option={option && { ...option, checked: forEveryone, onChange: setForEveryone }}
      confirmText={kind === 'delete' ? t.deleteChat : t.clearHistory}
      busy={busy}
      onCancel={() => close(onCancel)}
      onConfirm={() => onConfirm(forEveryone)}
    />
  );
};
