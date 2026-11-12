import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
const DRAFT_PREFIX = 'draft:';
const CONTEXT_PREFIX = 'draft-context:';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const subscribeToDrafts = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// Drafts live in sessionStorage so they survive the reload that follows "A new version is available",
// but not a closed tab, and they are never shared with another tab. A draft belongs to one account:
// the id is `<account>:<conversation>`, and everything is dropped when the tokens are cleared.
export const chatDraftKey = (chatId: EntityId) => (isPersistedId(chatId) ? `chat:${chatId}` : null);

export const draftId = (account: string | null, key: string | null) => (account && key ? `${account}:${key}` : null);

export const readDraft = (id: string | null): string => {
  if (!id) return '';
  try {
    return sessionStorage.getItem(`${DRAFT_PREFIX}${id}`) ?? '';
  } catch {
    return '';
  }
};

export const writeDraft = (id: string | null, text: string) => {
  if (!id) return;
  try {
    if (text.trim()) sessionStorage.setItem(`${DRAFT_PREFIX}${id}`, text);
    else sessionStorage.removeItem(`${DRAFT_PREFIX}${id}`);
    notify();
  } catch {
    // storage may be full or blocked; losing a draft is better than breaking the composer
  }
};

export type DraftContext<Item> = { kind: 'reply'; message: Item } | { kind: 'edit'; message: Item; text: string };

export const readDraftContext = <Item>(id: string | null): DraftContext<Item> | null => {
  if (!id) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(`${CONTEXT_PREFIX}${id}`) ?? 'null') as DraftContext<Item> | null;
    return saved && (saved.kind === 'reply' || saved.kind === 'edit') && saved.message ? saved : null;
  } catch {
    return null;
  }
};

export const writeDraftContext = <Item>(id: string | null, context: DraftContext<Item> | null) => {
  if (!id) return;
  try {
    if (context) sessionStorage.setItem(`${CONTEXT_PREFIX}${id}`, JSON.stringify(context));
    else sessionStorage.removeItem(`${CONTEXT_PREFIX}${id}`);
    notify();
  } catch {
    return;
  }
};

export const readChatDraftPreview = (id: string | null): string => {
  const context = readDraftContext<unknown>(id);
  if (context?.kind === 'edit' && context.text.trim()) return `edit:${context.text.trim()}`;
  const text = readDraft(id).trim();
  return text ? `draft:${text}` : '';
};

export const clearDrafts = () => {
  try {
    Object.keys(sessionStorage).filter((key) => key.startsWith(DRAFT_PREFIX) || key.startsWith(CONTEXT_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
    notify();
  } catch {
    // nothing to clear
  }
};
