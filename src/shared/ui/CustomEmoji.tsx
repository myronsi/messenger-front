import { useState } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { emojiImageUrl, splitEmoji } from '@/shared/lib/customEmoji';
import { cn } from '@/shared/lib/utils';
import { useMediaReveal } from '@/shared/lib/useMediaReveal';

interface CustomEmojiProps {
  id: string;
  shortcode?: string;
  className?: string;
  large?: boolean;
}

export const CustomEmoji = ({ id, shortcode, className, large = false }: CustomEmojiProps) => {
  const [broken, setBroken] = useState(false);
  const { loaded, pop, onLoad } = useMediaReveal(id);
  const label = shortcode ? `:${shortcode}:` : ':emoji:';
  if (broken) return <span data-custom-emoji-fallback>{label}</span>;
  return (
    <span className={cn('media-standin-box relative inline-block h-[1.375em] w-[1.375em] align-[-0.3em]', className)}>
      {!loaded && <span aria-hidden="true" data-testid="emoji-standin" data-standin={(shortcode?.[0] ?? '').toUpperCase()}
        className="media-standin emoji-standin absolute inset-[8%] rounded-[30%]" />}
      <AuthenticatedImage src={emojiImageUrl(id, !large)} fallbackSrc={large ? undefined : emojiImageUrl(id)} alt={label} title={label} draggable={false} loading="eager" data-custom-emoji={id}
        onError={() => setBroken(true)} onLoad={onLoad}
        className={cn('block h-full w-full object-contain', loaded ? pop && 'media-pop-in' : 'opacity-0')} />
    </span>
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
