import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { SenderAssignment } from '../api/importTypes';
import type { ImportMember } from '../model/senderSuggestions';
import type { ParsedSender } from '../model/types';

interface ImportSendersStepProps {
  senders: readonly ParsedSender[];
  members: readonly ImportMember[];
  meId: EntityId;
  assignments: Record<string, SenderAssignment>;
  onChange: (key: string, assign: SenderAssignment) => void;
}

const KEEP = '';
const ME = 'me';

const memberLabel = (member: ImportMember) => member.displayName || member.username || String(member.id);

export const ImportSendersStep = ({ senders, members, meId, assignments, onChange }: ImportSendersStepProps) => {
  const { translations } = useLanguage();
  const t = translations.chatImport.senders;
  const others = members.filter((member) => String(member.id) !== String(meId));
  const takenBy = (value: string) => senders.find((sender) => String(assignments[sender.key] ?? KEEP) === value)?.key;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <ul className="space-y-2">
        {senders.map((sender) => {
          const value = String(assignments[sender.key] ?? KEEP);
          const free = (option: string) => option === value || !takenBy(option);
          return (
            <li key={sender.key} data-testid="import-sender" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{sender.name}</span>
                <span className="block text-xs text-muted-foreground">{fillTemplate(t.count, { count: sender.messageCount.toLocaleString() })}</span>
              </span>
              <select aria-label={sender.name} value={value}
                onChange={(event) => onChange(sender.key, event.target.value === KEEP ? null : event.target.value)}
                className="min-w-0 max-w-[60%] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                <option value={KEEP}>{t.keepName}</option>
                {free(ME) && <option value={ME}>{t.me}</option>}
                {others.filter((member) => free(String(member.id))).map((member) => (
                  <option key={String(member.id)} value={String(member.id)}>{memberLabel(member)}</option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
