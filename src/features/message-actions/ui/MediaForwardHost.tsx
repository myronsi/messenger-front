import { requestMediaForward, useMediaForwardRequest } from '@/entities/message';
import ForwardMessageDialog from './ForwardMessageDialog';

export const MediaForwardHost = ({ username }: { username: string }) => {
  const messageId = useMediaForwardRequest();
  return (
    <ForwardMessageDialog open={messageId !== null} onOpenChange={(open) => { if (!open) requestMediaForward(null); }}
      message={messageId === null ? null : { id: messageId }} username={username} />
  );
};
