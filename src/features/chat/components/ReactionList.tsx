import React from 'react';

interface Reaction {
  user_id: number;
  reaction: string;
}

interface GroupedReaction {
  reaction: string;
  count: number;
  users: number[];
}

interface ReactionListProps {
  reactions: Reaction[];
  messageId: number;
  userId: number;
  isMine: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const groupReactions = (reactions: Reaction[]): GroupedReaction[] => {
  const reactionMap: { [key: string]: { count: number; users: number[] } } = {};
  reactions.forEach((r) => {
    if (!reactionMap[r.reaction]) {
      reactionMap[r.reaction] = { count: 0, users: [] };
    }
    reactionMap[r.reaction].count += 1;
    reactionMap[r.reaction].users.push(r.user_id);
  });
  return Object.entries(reactionMap).map(([reaction, data]) => ({
    reaction,
    count: data.count,
    users: data.users,
  }));
};

const getReactionBackground = (
  isMine: boolean,
  reactionUsers: number[],
  userId: number
): string => {
  const myReaction = reactionUsers.includes(userId);
  const othersReaction = reactionUsers.some((id) => id !== userId);

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

const ReactionList: React.FC<ReactionListProps> = ({ reactions, messageId, userId, isMine, wsRef }) => {
  const handleReactionClick = (reaction: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const hasReaction = reactions.some((r) => r.user_id === userId && r.reaction === reaction);
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
      {groupedReactions.map((grouped, index) => (
        <span
          key={index}
          className={`mr-2 text-sm px-2 py-1 rounded-full cursor-pointer select-none hover:opacity-80 ${getReactionBackground(
            isMine,
            grouped.users,
            userId
          )}`}
          onClick={(e) => {
            e.stopPropagation();
            handleReactionClick(grouped.reaction);
          }}
        >
          {grouped.reaction} {grouped.count > 1 ? grouped.count : ''}
        </span>
      ))}
    </div>
  );
};

export default ReactionList;
