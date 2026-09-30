import React from 'react';

export type ProfilePanelView = 'details' | 'search' | 'photos' | 'audios';
export interface ProfilePanelTransition {
  from: ProfilePanelView;
  to: ProfilePanelView;
  direction: 'forward' | 'back';
  key: number;
}

interface UserProfilePanelContentProps {
  activeView: ProfilePanelView;
  transition: ProfilePanelTransition | null;
  renderPanelContent: (view: ProfilePanelView, options?: { autoFocusSearch?: boolean }) => React.ReactNode;
}

const UserProfilePanelContent: React.FC<UserProfilePanelContentProps> = ({ activeView, transition, renderPanelContent }) => (
  <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
    {transition ? (
      <>
        <div
          key={`from-${transition.key}-${transition.from}`}
          aria-hidden
          inert
          className={`absolute inset-0 overflow-y-auto bg-white ${
            transition.direction === 'forward' ? 'profile-panel-slide-out-left' : 'profile-panel-slide-out-right'
          }`}
        >
          {renderPanelContent(transition.from, { autoFocusSearch: false })}
        </div>
        <div
          key={`to-${transition.key}-${transition.to}`}
          className={`absolute inset-0 overflow-y-auto bg-white ${
            transition.direction === 'forward' ? 'profile-panel-slide-in-right' : 'profile-panel-slide-in-left'
          }`}
        >
          {renderPanelContent(transition.to, { autoFocusSearch: false })}
        </div>
      </>
    ) : (
      <div key={`active-${activeView}`} className="absolute inset-0 overflow-y-auto bg-white">
        {renderPanelContent(activeView, { autoFocusSearch: activeView === 'search' })}
      </div>
    )}
  </div>
);

export default UserProfilePanelContent;
