import type { en } from '@/shared/lang/en';
import { localeOf, type AppLanguage } from '@/shared/lang/languages';
import type { TypingAction } from './typingStore';

type TypingWords = typeof en.typingStatus;
type CountWords = TypingWords['people'];

export interface NamedTypingUser {
  action: TypingAction;
  name?: string;
}

const countLabel = (words: CountWords, count: number, language: AppLanguage) => {
  const category = new Intl.PluralRules(localeOf(language)).select(count);
  const template = category in words ? words[category as keyof CountWords] : words.other;
  return template.replace('{count}', String(count));
};

export const getTypingLabel = (users: NamedTypingUser[], isGroup: boolean, words: TypingWords, language: AppLanguage) => {
  const [first, second] = users;
  if (!first) return '';
  const recording = first.action === 'recording_voice';
  if (!isGroup) return recording ? words.recordingVoice : words.typing;
  if (users.length === 1) {
    if (!first.name) return recording ? words.recordingVoice : words.typing;
    return (recording ? words.oneRecording : words.oneTyping).replace('{name}', first.name);
  }
  if (users.length === 2 && first.name && second?.name) {
    return words.twoTyping.replace('{first}', first.name).replace('{second}', second.name);
  }
  return countLabel(words.people, users.length, language);
};
