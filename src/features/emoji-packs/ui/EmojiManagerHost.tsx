import { closeEmojiManager, useEmojiManagerRequest } from '@/entities/emoji';
import { BackToClose } from '@/shared/ui/BackToClose';
import { EmojiPackLinkDialog } from './EmojiPackLinkDialog';

export const EmojiManagerHost = ({ linkSlug, onLinkClose }: { linkSlug?: string | null; onLinkClose?: () => void }) => {
  const request = useEmojiManagerRequest();
  return (
    <>
      {request?.kind === 'link' && <BackToClose flag="emojiManager" onClose={closeEmojiManager} />}
      {linkSlug && <EmojiPackLinkDialog slug={linkSlug} onClose={() => onLinkClose?.()} />}
      {request?.kind === 'link' && <EmojiPackLinkDialog slug={request.slug} onClose={closeEmojiManager} />}
    </>
  );
};
