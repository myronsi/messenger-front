import { Loader2 } from 'lucide-react';
import { useGetGroupEmojiQuery } from '@/entities/emoji';
import { EmojiPackEditor } from './EmojiPackEditor';

export const GroupEmojiPanel = ({ chatId }: { chatId: string }) => {
  const { data: pack, isLoading } = useGetGroupEmojiQuery(chatId);
  if (isLoading || !pack) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  return <div className="px-5 py-4"><EmojiPackEditor pack={pack} /></div>;
};
