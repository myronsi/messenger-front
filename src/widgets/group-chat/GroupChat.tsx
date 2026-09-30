import React from 'react';
import GroupChatView from './GroupChatView';
import { useGroupChatScreen } from './useGroupChatScreen';
import type { GroupComponentProps } from './groupChatTypes';

const GroupComponent: React.FC<GroupComponentProps> = (props) => {
  const model = useGroupChatScreen(props);
  return <GroupChatView model={model} />;
};

export default GroupComponent;
