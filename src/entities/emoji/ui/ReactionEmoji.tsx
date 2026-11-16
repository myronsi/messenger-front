import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { customReactionId } from '@/shared/lib/customEmoji';
import { useGetCustomEmojiQuery } from '../api/emojiApi';

const CustomReaction = ({ id, className }: { id: string; className?: string }) => {
  const { data } = useGetCustomEmojiQuery(id);
  return <CustomEmoji id={id} shortcode={data?.shortcode} className={className} />;
};

export const ReactionEmoji = ({ reaction, className }: { reaction: string; className?: string }) => {
  const id = customReactionId(reaction);
  return id ? <CustomReaction id={id} className={className} /> : <>{reaction}</>;
};
