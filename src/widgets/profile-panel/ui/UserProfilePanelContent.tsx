import React from 'react';
import { SwipeProfilePanels } from '@/shared/ui/SwipeProfilePanels';

export type ProfilePanelView = 'details' | 'photos' | 'audios';
export interface ProfilePanelTransition {
  from: ProfilePanelView;
  to: ProfilePanelView;
  direction: 'forward' | 'back';
  key: number;
}

interface UserProfilePanelContentProps {
  activeView: ProfilePanelView;
  visibleViews: ProfilePanelView[];
  onSelectView: (view: ProfilePanelView) => void;
  transition: ProfilePanelTransition | null;
  renderPanelContent: (view: ProfilePanelView) => React.ReactNode;
}

const UserProfilePanelContent: React.FC<UserProfilePanelContentProps> = ({ activeView, visibleViews, onSelectView, transition, renderPanelContent }) => {
  return <SwipeProfilePanels active={activeView} views={visibleViews} onSelect={onSelectView}
    renderPanel={renderPanelContent} enabled={!transition} />;
};

export default UserProfilePanelContent;
