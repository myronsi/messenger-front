const DRAFT_PREFIX = 'draft:';

// Drafts live in sessionStorage so they survive the reload that follows "A new version is available",
// but not a closed tab, and they are never shared with another tab. A draft belongs to one account:
// the id is `<account>:<conversation>`, and everything is dropped when the tokens are cleared.
export const chatDraftKey = (chatId: number) => (chatId > 0 ? `chat:${chatId}` : null);

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
  } catch {
    // storage may be full or blocked; losing a draft is better than breaking the composer
  }
};

export const clearDrafts = () => {
  try {
    Object.keys(sessionStorage).filter((key) => key.startsWith(DRAFT_PREFIX)).forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // nothing to clear
  }
};