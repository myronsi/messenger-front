import type { EntityId } from '@/shared/api/entityId';
import type { ChatImport, ChatImportSender } from '../api/importTypes';

export type ImporterRef = EntityId | { id: EntityId; display_name?: string | null; username?: string | null };

export const importerId = (chatImport: Pick<ChatImport, 'imported_by'>) => {
  const value = chatImport.imported_by as ImporterRef;
  return typeof value === 'object' && value !== null ? value.id : value;
};

export const importerName = (chatImport: Pick<ChatImport, 'imported_by'>, nameOf: (id: EntityId) => string | undefined) => {
  const value = chatImport.imported_by as ImporterRef;
  if (typeof value === 'object' && value !== null && (value.display_name || value.username)) return value.display_name || value.username || '';
  return nameOf(importerId(chatImport)) ?? '';
};

const same = (a: EntityId | null | undefined, b: EntityId | null | undefined) => a !== null && a !== undefined && b !== null && b !== undefined
  && String(a) === String(b);

export const isImporter = (chatImport: ChatImport, meId: EntityId | null) => same(importerId(chatImport), meId);

export const pendingForMe = (imports: readonly ChatImport[], meId: EntityId | null) => {
  for (const chatImport of imports) {
    if (chatImport.state !== 'done') continue;
    const sender = chatImport.senders.find((item) => item.state === 'pending' && same(item.user_id, meId));
    if (sender) return { chatImport, sender };
  }
  return null;
};

export const confirmedSenderOf = (imports: readonly ChatImport[], importId: EntityId, name: string, meId: EntityId | null): ChatImportSender | null => (
  imports.find((item) => same(item.id, importId))?.senders
    .find((sender) => sender.state === 'confirmed' && sender.name === name && same(sender.user_id, meId)) ?? null
);
