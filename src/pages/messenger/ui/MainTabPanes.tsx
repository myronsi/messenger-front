import type { ComponentProps } from 'react';
import { OwnProfileEditor, UserProfileComponentRTK } from '@/widgets/profile-panel';
import { CallsComingSoon, type MainTab } from '@/widgets/main-nav';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';

type OpenGroup = NonNullable<ComponentProps<typeof UserProfileComponentRTK>['onOpenGroup']>;

interface MainTabPanesProps {
  tab: MainTab;
  username: string;
  onShowChats: () => void;
  onOpenGroup: OpenGroup;
  isEditingProfile: boolean;
  setEditingProfile: (editing: boolean) => void;
}

export function MainTabPanes({ tab, username, onShowChats, onOpenGroup, isEditingProfile, setEditingProfile }: MainTabPanesProps) {
  const { data } = useGetOneOnOneChatsQuery(username, { skip: tab !== 'profile' });
  const savedChatId = data?.chats?.find((chat) => chat.interlocutor_name.toLowerCase() === username.toLowerCase())?.id;
  if (tab === 'calls') {
    return <div className="absolute inset-0 z-40"><CallsComingSoon /></div>;
  }
  if (tab === 'profile') {
    return (
      <div className="absolute inset-0 z-40 bg-background">
        <div className="mx-auto h-full max-w-xl md:border-x md:border-border">
          {isEditingProfile ? <OwnProfileEditor onBack={() => setEditingProfile(false)} /> : (
            <UserProfileComponentRTK username={username} directChatId={savedChatId} onClose={onShowChats} hideMessageAction hideBackOnMobile
              onEditProfile={() => setEditingProfile(true)} onOpenGroup={(group) => { onShowChats(); onOpenGroup(group); }} />
          )}
        </div>
      </div>
    );
  }
  return null;
}
