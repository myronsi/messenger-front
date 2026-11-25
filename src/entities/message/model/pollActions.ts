import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { toast } from '@/shared/ui/sonner';
import { closePoll, pollErrorCode, votePoll } from '../api/pollApi';
import { notifyPollUpdated } from './pollUpdates';

export interface PollTarget {
  chatId: EntityId;
  messageId: EntityId;
}

let current: PollTarget | null = null;
const listeners = new Set<() => void>();

const set = (next: PollTarget | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const requestPollClose = (target: PollTarget | null) => set(target);
export const usePollCloseRequest = () => useSyncExternalStore(subscribe, () => current, () => null);

export const pollErrorText = (error: unknown, words: Translations['polls'], fallback: string) => {
  const code = pollErrorCode(error);
  if (code === 'poll_closed') return words.pollClosed;
  if (code === 'quiz_answered') return words.quizAnswered;
  return fallback;
};

export const submitPollVote = async ({ chatId, messageId }: PollTarget, options: number[], words: Translations['polls']) => {
  try {
    notifyPollUpdated(chatId, messageId, await votePoll(chatId, messageId, options));
    return true;
  } catch (error) {
    toast.error(pollErrorText(error, words, words.voteFailed));
    return false;
  }
};

export const submitPollClose = async ({ chatId, messageId }: PollTarget, words: Translations['polls']) => {
  try {
    notifyPollUpdated(chatId, messageId, await closePoll(chatId, messageId));
    return true;
  } catch (error) {
    toast.error(pollErrorText(error, words, words.closeFailed));
    return false;
  }
};
