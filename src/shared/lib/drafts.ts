const DRAFT_PREFIX = 'draft:';

// Drafts live in sessionStorage so they survive the reload that follows "A new version is available",
// but not a closed tab, and they are never shared with another tab or user.
export const readDraft = (chatId: number): string => {
  if (chatId <= 0) return '';
  try {
    return sessionStorage.getItem(`${DRAFT_PREFIX}${chatId}`) ?? '';
  } catch {
    return '';
  }
};

export const writeDraft = (chatId: number, text: string) => {
  if (chatId <= 0) return;
  try {
    if (text.trim()) sessionStorage.setItem(`${DRAFT_PREFIX}${chatId}`, text);
    else sessionStorage.removeItem(`${DRAFT_PREFIX}${chatId}`);
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