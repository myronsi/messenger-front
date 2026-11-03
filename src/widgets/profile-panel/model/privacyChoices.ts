import type { PrivacyExceptionEffect } from '@/features/profile';

export type PrivacyChoice = 'everyone' | 'shared_chats' | 'nobody' | 'wait_approval';

export const choiceOf = (mode: string): PrivacyChoice => {
  if (mode === 'everyone_except') return 'everyone';
  if (mode === 'nobody_except') return 'nobody';
  return mode as PrivacyChoice;
};

export const choicesFor = (modes: readonly string[]): PrivacyChoice[] => {
  const choices: PrivacyChoice[] = [];
  if (modes.includes('everyone')) choices.push('everyone');
  if (modes.includes('shared_chats')) choices.push('shared_chats');
  if (modes.includes('nobody') || modes.includes('nobody_except')) choices.push('nobody');
  if (modes.includes('wait_approval')) choices.push('wait_approval');
  return choices;
};

export const exceptionEffectsOf = (choice: PrivacyChoice): PrivacyExceptionEffect[] => {
  if (choice === 'everyone') return ['deny'];
  if (choice === 'nobody') return ['allow'];
  if (choice === 'shared_chats') return ['deny'];
  return ['allow', 'deny'];
};

export const modeFor = (choice: PrivacyChoice, modes: readonly string[], exceptionCount: number): string => {
  if (choice === 'everyone') return exceptionCount > 0 && modes.includes('everyone_except') ? 'everyone_except' : 'everyone';
  if (choice === 'nobody') {
    return (exceptionCount > 0 || !modes.includes('nobody')) && modes.includes('nobody_except') ? 'nobody_except' : 'nobody';
  }
  return choice;
};
