import { useState } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { emojiImageUrl, splitEmoji } from '@/shared/lib/customEmoji';
import { cn } from '@/shared/lib/utils';

interface CustomEmojiProps {
  id: string;
  shortcode?: string;
  className?: string;
}

export const CustomEmoji = ({ id, shortcode, className }: CustomEmojiProps) => {
  const [broken, setBroken] = useState(false);
  const label = shortcode ? `:${shortcode}:` : ':emoji:';
  if (broken) return <span data-custom-emoji-fallback>{label}</span>;
  return (
    <AuthenticatedImage src={emojiImageUrl(id)} alt={label} title={label} draggable={false} loading="eager" data-custom-emoji={id}
      onError={() => setBroken(true)}
      className={cn('inline-block h-[1.375em] w-[1.375em] object-contain align-[-0.3em]', className)} />
  );
};

export const EmojiText = ({ text, emojiClassName }: { text?: string | null; emojiClassName?: string }) => {
  if (!text) return null;
  const parts = splitEmoji(text);
  if (parts.length === 1 && parts[0].kind === 'text') return <>{text}</>;
  return <>{parts.map((part, index) => (part.kind === 'text'
    ? <span key={index}>{part.text}</span>
    : <CustomEmoji key={index} id={part.token.id} shortcode={part.token.shortcode} className={emojiClassName} />))}</>;
};
