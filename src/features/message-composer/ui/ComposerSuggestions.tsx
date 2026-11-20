import type { RefObject } from 'react';
import type { MentionCandidate } from '../model/mentionAutocomplete';
import { EmojiAutocomplete } from './EmojiAutocomplete';
import { MentionAutocomplete } from './MentionAutocomplete';

export interface ComposerMentions {
  members: MentionCandidate[];
  canMentionAll: boolean;
}

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  mentions?: ComposerMentions;
}

export const ComposerSuggestions = ({ inputRef, value, onChange, mentions }: Props) => (
  <>
    <EmojiAutocomplete inputRef={inputRef} value={value} onChange={onChange} />
    {mentions && (
      <MentionAutocomplete inputRef={inputRef} members={mentions.members} canMentionAll={mentions.canMentionAll} value={value} onChange={onChange} />
    )}
  </>
);
