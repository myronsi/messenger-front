import React from 'react';
import { Image as ImageIcon, Info, MessageCircle, Music } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ChatMuteAction } from '@/features/chat-mute';
import { ProfileTabHighlight } from '@/shared/ui/ProfileTabHighlight';

type ProfilePanelView = 'details' | 'photos' | 'audios';

interface UserProfileActionsProps {
  actionCount: number;
  actionColumns: number;
  showDetails: boolean;
  showMessage: boolean;
  showPhotos: boolean;
  showAudios: boolean;
  muteChatId?: EntityId;
  activeView: ProfilePanelView;
  onSelectView: (view: ProfilePanelView) => void;
  onMessage: () => void;
}

const UserProfileActions: React.FC<UserProfileActionsProps> = ({
  actionCount, actionColumns, showDetails, showMessage, showPhotos, showAudios,
  muteChatId, activeView, onSelectView, onMessage,
}) => {
  const { translations } = useLanguage();
  if (actionCount <= 0) return null;
  const buttonClass = (view: ProfilePanelView) => `relative isolate flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
    activeView === view ? 'text-primary' : 'text-gray-700 [@media(hover:hover)]:hover:bg-gray-100'
  }`;
  return (
    <div className="relative isolate grid gap-2 border-y border-gray-200 px-4 py-3" style={{ gridTemplateColumns: `repeat(${actionColumns}, minmax(0, 1fr))` }}>
      <ProfileTabHighlight active={activeView} layoutKey={`${actionColumns}:${showDetails}:${showMessage}:${showPhotos}:${showAudios}:${!!muteChatId}`} />
      {showDetails && <button data-profile-tab="details" onClick={() => onSelectView('details')} className={buttonClass('details')}><Info className="h-5 w-5" /><span className="text-xs font-medium">{translations.info || 'Info'}</span></button>}
      {showMessage && <button onClick={onMessage} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"><MessageCircle className="h-5 w-5" /><span className="text-xs font-medium">{translations.message || 'Message'}</span></button>}
      {showPhotos && <button data-profile-tab="photos" onClick={() => onSelectView('photos')} className={buttonClass('photos')}><ImageIcon className="h-5 w-5" /><span className="text-xs font-medium">{translations.photos || 'Photos'}</span></button>}
      {showAudios && <button data-profile-tab="audios" onClick={() => onSelectView('audios')} className={buttonClass('audios')}><Music className="h-5 w-5" /><span className="text-xs font-medium">{translations.audios || 'Audios'}</span></button>}
      {muteChatId && <ChatMuteAction chatId={muteChatId} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors hover:bg-gray-100 disabled:opacity-50" />}
    </div>
  );
};

export default UserProfileActions;
