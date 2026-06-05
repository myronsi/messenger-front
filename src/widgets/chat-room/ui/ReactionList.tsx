import React from 'react';
import { ReactionInfo } from '@/entities/message';

interface GroupedReaction {
  reaction: string;
  count: number;
  users: ReactionInfo[];
}

interface ReactionListProps {
  reactions: ReactionInfo[];
  messageId: number;
  userId: number;
  isMine: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onOpenReactionDetails?: (reaction: string, reactions: ReactionInfo[]) => void;
}

const groupReactions = (reactions: ReactionInfo[]): GroupedReaction[] => {
  const reactionMap: { [key: string]: ReactionInfo[] } = {};
  reactions.forEach((reaction) => {
    if (!reactionMap[reaction.reaction]) {
      reactionMap[reaction.reaction] = [];
    }
    reactionMap[reaction.reaction].push(reaction);
  });
  return Object.entries(reactionMap).map(([reaction, users]) => ({
    reaction,
    count: users.length,
    users,
  }));
};

const getReactionBackground = (
  isMine: boolean,
  reactionUsers: ReactionInfo[],
  userId: number
): string => {
  const myReaction = reactionUsers.some((reaction) => reaction.user_id === userId);
  const othersReaction = reactionUsers.some((reaction) => reaction.user_id !== userId);

  if (isMine) {
    if (myReaction) {
      return 'bg-white text-black';
    }
    if (othersReaction) {
      return 'bg-[hsl(221.2,83.2%,43.3%)] text-white';
    }
  } else {
    if (myReaction) {
      return 'bg-primary text-primary-foreground';
    }
    if (othersReaction) {
      return 'bg-[hsl(0,0%,90%)] text-black';
    }
  }
  return 'bg-secondary text-secondary-foreground';
};

const ReactionList: React.FC<ReactionListProps> = ({ reactions, messageId, userId, isMine, wsRef, onOpenReactionDetails }) => {
  const handleReactionClick = (reaction: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const hasReaction = reactions.some((item) => item.user_id === userId && item.reaction === reaction);
      wsRef.current.send(
        JSON.stringify({
          type: hasReaction ? 'reaction_remove' : 'reaction_add',
          message_id: messageId,
          reaction,
        })
      );
    }
  };

  const groupedReactions = groupReactions(reactions);

  return (
    <div className="flex flex-wrap mt-1">
      {groupedReactions.map((grouped) => (
        <button
          key={grouped.reaction}
          type="button"
          className={`mr-2 text-sm px-2 py-1 rounded-full cursor-pointer select-none hover:opacity-80 ${getReactionBackground(
            isMine,
            grouped.users,
            userId
          )}`}
          title="Click to toggle. Right-click to view people."
          onClick={(event) => {
            event.stopPropagation();
            handleReactionClick(grouped.reaction);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onOpenReactionDetails?.(grouped.reaction, grouped.users);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenReactionDetails?.(grouped.reaction, grouped.users);
          }}
        >
          {grouped.reaction} {grouped.count > 1 ? grouped.count : ''}
        </button>
      ))}
    </div>
  );
};

export default ReactionList;
