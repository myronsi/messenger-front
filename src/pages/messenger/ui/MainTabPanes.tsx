import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { OwnProfileEditor, UserProfileComponentRTK } from '@/widgets/profile-panel';
import { CallsComingSoon, type MainTab } from '@/widgets/main-nav';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';
import { useGetUserByUsernameQuery } from '@/entities/user';
import { ProfilePageBackdrop } from '@/shared/ui/profile/ProfileBackgroundFill';
import { cn } from '@/shared/lib/utils';
import { measureMorphs, MORPH_MS, playMorphs, prefersReducedMotion } from '../model/profileMorph';

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
  const { data: profile } = useGetUserByUsernameQuery(username, { skip: tab !== 'profile' });
  const savedChatId = data?.chats?.find((chat) => chat.interlocutor_name.toLowerCase() === username.toLowerCase())?.id;
  const stage = useRef<HTMLDivElement>(null);
  const morphFrom = useRef<Map<string, DOMRect> | null>(null);
  const [entering, setEntering] = useState(false);
  const switchTo = (next: boolean) => {
    morphFrom.current = prefersReducedMotion() ? null : measureMorphs(stage.current);
    setEntering(morphFrom.current !== null);
    setEditingProfile(next);
  };
  useLayoutEffect(() => {
    const from = morphFrom.current;
    morphFrom.current = null;
    if (from && stage.current) playMorphs(stage.current, from);
  }, [isEditingProfile]);
  useEffect(() => {
    if (!entering) return undefined;
    const timer = window.setTimeout(() => setEntering(false), MORPH_MS + 120);
    return () => window.clearTimeout(timer);
  }, [entering]);
  if (tab === 'calls') {
    return <div className="absolute inset-0 z-40"><CallsComingSoon /></div>;
  }
  if (tab === 'profile') {
    return (
      <div data-testid="profile-tab" className="absolute inset-0 z-40 isolate overflow-hidden bg-background md:flex md:items-center md:justify-center md:p-6">
        <div className="max-md:hidden"><ProfilePageBackdrop background={profile?.background} /></div>
        <div data-testid="profile-tab-card"
          className="h-full w-full md:h-[min(760px,100%)] md:max-w-xl md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-background md:shadow-2xl">
          <div ref={stage} data-testid="profile-stage" className={cn('h-full w-full', entering && 'morph-enter')}>
            {isEditingProfile ? <OwnProfileEditor onBack={() => switchTo(false)} /> : (
              <UserProfileComponentRTK username={username} directChatId={savedChatId} onClose={onShowChats} hideMessageAction hideBack
                onEditProfile={() => switchTo(true)} onOpenGroup={(group) => { onShowChats(); onOpenGroup(group); }} />
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
}
