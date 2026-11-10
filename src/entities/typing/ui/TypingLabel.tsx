import { skipToken } from '@reduxjs/toolkit/query';
import { useGetUserByIdQuery } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getTypingLabel } from '../model/typingLabel';
import type { TypingUser } from '../model/typingStore';

interface TypingLabelProps {
  users: TypingUser[];
  isGroup: boolean;
  className?: string;
}

export const TypingLabel = ({ users, isGroup, className }: TypingLabelProps) => {
  const { language, translations } = useLanguage();
  const [first, second] = users;
  const firstUser = useGetUserByIdQuery(isGroup && first && users.length <= 2 ? first.userId : skipToken).data;
  const secondUser = useGetUserByIdQuery(isGroup && second && users.length === 2 ? second.userId : skipToken).data;
  const names = [firstUser?.display_name, secondUser?.display_name];
  const label = getTypingLabel(users.map((user, index) => ({ action: user.action, name: names[index] })), isGroup, translations.typingStatus, language);
  return <span data-testid="typing-label" className={className}>{label}</span>;
};
