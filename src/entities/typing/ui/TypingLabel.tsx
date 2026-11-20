import type { TypingUser } from '../model/typingStore';
import { LetterWave } from './LetterWave';
import { useTypingText } from './useTypingText';

interface TypingLabelProps {
  users: TypingUser[];
  isGroup: boolean;
  className?: string;
}

export const TypingLabel = ({ users, isGroup, className }: TypingLabelProps) => (
  <LetterWave text={useTypingText(users, isGroup)} mode="ripple" className={className} />
);
