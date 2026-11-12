import { useState } from 'react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { offersEveryone, type CleanupRequest } from '../model/useChatCleanup';

interface ChatCleanupDialogProps {
  request: CleanupRequest | null;
  onCancel: () => void;
  onConfirm: (forEveryone: boolean) => void;
}

export const ChatCleanupDialog = ({ request, onCancel, onConfirm }: ChatCleanupDialogProps) => {
  const { translations } = useLanguage();
  const [forEveryone, setForEveryone] = useState(false);
  if (!request) return null;
  const t = translations.chatCleanup;
  const { kind, target } = request;
  const name = { name: target.name };
  const checkboxLabel = kind === 'delete' ? fillTemplate(t.alsoDeleteFor, name)
    : target.isGroup ? t.clearForAllMembers : fillTemplate(t.alsoClearFor, name);
  const close = (run: () => void) => {
    setForEveryone(false);
    run();
  };
  return (
    <ConfirmModal
      title={kind === 'delete' ? fillTemplate(t.deleteTitle, name) : t.clearTitle}
      message={kind === 'delete' ? t.deleteMessage : t.clearMessage}
      confirmText={kind === 'delete' ? t.delete : t.clear}
      isDestructive
      checkbox={offersEveryone(request) ? { label: checkboxLabel, checked: forEveryone, onChange: setForEveryone } : undefined}
      onCancel={() => close(onCancel)}
      onConfirm={() => close(() => onConfirm(forEveryone))}
    />
  );
};
