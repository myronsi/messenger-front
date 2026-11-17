import type { EntityId } from '@/shared/api/entityId';
import type { SocketSender } from '@/shared/api/realtime';
import type { ReactionInfo } from './types';
import { burstReaction, type BurstPoint } from './reactionBurst';
import { recordReaction } from './reactionUsage';

interface ReactionTarget {
  id: EntityId;
  reactions?: ReactionInfo[] | null;
}

export const hasOwnReaction = (reactions: ReactionInfo[] | null | undefined, userId: EntityId, reaction: string) => (
  !!reactions?.some((item) => String(item.user_id) === String(userId) && item.reaction === reaction)
);

export const toggleReaction = (
  socket: SocketSender | null, message: ReactionTarget, userId: EntityId, reaction: string, origin?: BurstPoint,
): 'added' | 'removed' | null => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return null;
  const remove = hasOwnReaction(message.reactions, userId, reaction);
  try {
    socket.send(JSON.stringify({ type: remove ? 'reaction_remove' : 'reaction_add', message_id: message.id, reaction }));
  } catch {
    return null;
  }
  if (remove) return 'removed';
  recordReaction(userId, reaction);
  if (origin) burstReaction(reaction, origin);
  return 'added';
};

export { burstReaction, elementCenter, type BurstPoint } from './reactionBurst';
