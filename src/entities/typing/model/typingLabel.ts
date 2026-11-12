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

const actionWords = (action: TypingAction, words: TypingWords) => {
  switch (action) {
    case 'recording_voice': return { alone: words.recordingVoice, named: words.oneRecording };
    case 'choosing_sticker': return { alone: words.choosingSticker, named: words.oneChoosingSticker };
    case 'uploading_photo': return { alone: words.sendingPhoto, named: words.oneSendingPhoto };
    case 'uploading_video': return { alone: words.sendingVideo, named: words.oneSendingVideo };
    case 'uploading_file': return { alone: words.sendingFile, named: words.oneSendingFile };
    default: return { alone: words.typing, named: words.oneTyping };
  }
};

export const getTypingLabel = (users: NamedTypingUser[], isGroup: boolean, words: TypingWords, language: AppLanguage) => {
  const [first, second] = users;
  if (!first) return '';
  const label = actionWords(first.action, words);
  if (!isGroup) return label.alone;
  if (users.length === 1) {
    if (!first.name) return label.alone;
    return label.named.replace('{name}', first.name);
  }
  if (users.length === 2 && first.name && second?.name) {
    return words.twoTyping.replace('{first}', first.name).replace('{second}', second.name);
  }
  return countLabel(words.people, users.length, language);
};
