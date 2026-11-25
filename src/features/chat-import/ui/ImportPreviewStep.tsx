import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { IMPORT_SOURCE_NAMES } from '@/entities/message';
import type { ImportTarget } from '../model/importRequest';
import type { DateOrder, ParsedChat } from '../model/types';

export interface ImportChatOption {
  chatId: EntityId;
  name: string;
}

interface ImportPreviewStepProps {
  chat: ParsedChat;
  busy: boolean;
  target: ImportTarget | null;
  chats?: readonly ImportChatOption[];
  onTarget: (target: ImportTarget) => void;
  onDateOrder: (order: DateOrder) => void;
}

const optionClass = 'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50';

export const ImportPreviewStep = ({ chat, busy, target, chats, onTarget, onDateOrder }: ImportPreviewStepProps) => {
  const { translations, language } = useLanguage();
  const t = translations.chatImport;
  const date = (value: string | null) => (value ? new Date(value).toLocaleDateString(localeOf(language), { dateStyle: 'medium' }) : '');
  const count = (template: string, value: number) => fillTemplate(template, { count: value.toLocaleString(localeOf(language)) });
  const firstChat = chats?.[0];

  return (
    <div className="space-y-4">
      <div data-testid="import-summary" className="rounded-xl border border-border p-3">
        <p className="font-semibold">{chat.title}</p>
        <p className="text-sm text-muted-foreground">{IMPORT_SOURCE_NAMES[chat.source]}</p>
        <ul className="mt-2 space-y-0.5 text-sm">
          <li>{count(t.preview.messages, chat.messages.length)}</li>
          <li>{count(t.preview.files, chat.fileCount)}</li>
          <li>{count(t.preview.people, chat.senders.length)}</li>
          <li>{fillTemplate(t.preview.range, { from: date(chat.firstAt), to: date(chat.lastAt) })}</li>
        </ul>
      </div>
      {chat.source === 'whatsapp' && chat.dateOrder && (
        <fieldset className="space-y-1" disabled={busy}>
          <legend className="mb-1 text-sm font-medium">{t.preview.dateOrder}</legend>
          {!chat.dateOrderCertain && <p className="text-xs text-muted-foreground">{t.preview.dateOrderUnsure}</p>}
          {(['dmy', 'mdy'] as const).map((order) => (
            <label key={order} className={optionClass}>
              <input type="radio" name="import-date-order" checked={chat.dateOrder === order} onChange={() => onDateOrder(order)} />
              {order === 'dmy' ? t.preview.dayFirst : t.preview.monthFirst}
            </label>
          ))}
        </fieldset>
      )}
      {chats && target && (
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium">{t.target.label}</legend>
          <label className={optionClass}>
            <input type="radio" name="import-target" checked={target.kind === 'newGroup'} onChange={() => onTarget({ kind: 'newGroup', title: chat.title })} />
            {fillTemplate(t.target.newGroup, { name: chat.title })}
          </label>
          {firstChat && (
            <label className={optionClass}>
              <input type="radio" name="import-target" checked={target.kind === 'chat'} onChange={() => onTarget({ kind: 'chat', chatId: firstChat.chatId })} />
              {t.target.existingChat}
            </label>
          )}
          {target.kind === 'chat' && (
            <select aria-label={t.target.pickChat} value={String(target.chatId)} onChange={(event) => onTarget({ kind: 'chat', chatId: event.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              {chats.map((option) => <option key={String(option.chatId)} value={String(option.chatId)}>{option.name}</option>)}
            </select>
          )}
        </fieldset>
      )}
    </div>
  );
};
