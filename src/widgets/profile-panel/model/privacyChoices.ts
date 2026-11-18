import type { PrivacyExceptionEffect } from '@/features/profile';

export type PrivacyChoice = 'everyone' | 'shared_chats' | 'nobody' | 'wait_approval';

export const choiceOf = (mode: string): PrivacyChoice => {
  if (mode === 'everyone_except') return 'everyone';
  if (mode === 'nobody_except') return 'nobody';
  return mode as PrivacyChoice;
};

const ORDER: PrivacyChoice[] = ['everyone', 'shared_chats', 'nobody', 'wait_approval'];

export const choicesFor = (modes: readonly string[]): PrivacyChoice[] => ORDER.filter((choice) => modes.includes(choice));

export const exceptionEffectsOf = (choice: PrivacyChoice): PrivacyExceptionEffect[] => {
  if (choice === 'everyone') return ['deny'];
  if (choice === 'nobody') return ['allow'];
  if (choice === 'shared_chats') return ['deny'];
  return ['allow', 'deny'];
};

