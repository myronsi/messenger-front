import React from 'react';
import { Image as ImageIcon, Info, MessageCircle, Music, Search } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

type ProfilePanelView = 'details' | 'search' | 'photos' | 'audios';

interface UserProfileActionsProps {
  actionCount: number;
  actionColumns: number;
  showDetails: boolean;
  showMessage: boolean;
  showPhotos: boolean;
  showAudios: boolean;
  showSearch: boolean;
  activeView: ProfilePanelView;
  onSelectView: (view: ProfilePanelView) => void;
  onMessage: () => void;
}

const UserProfileActions: React.FC<UserProfileActionsProps> = ({
  actionCount, actionColumns, showDetails, showMessage, showPhotos, showAudios,
  showSearch, activeView, onSelectView, onMessage,
}) => {
  const { translations } = useLanguage();
  if (actionCount <= 0) return null;
  const buttonClass = (view: ProfilePanelView) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
    activeView === view ? 'bg-gray-100 text-primary' : 'text-gray-700 hover:bg-gray-100'
  }`;
  return (
    <div className="grid gap-2 border-y border-gray-200 px-4 py-3" style={{ gridTemplateColumns: `repeat(${actionColumns}, minmax(0, 1fr))` }}>
      {showDetails && <button onClick={() => onSelectView('details')} className={buttonClass('details')}><Info className="h-5 w-5" /><span className="text-xs font-medium">{translations.info || 'Info'}</span></button>}
      {showMessage && <button onClick={onMessage} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm text-primary transition-colors hover:bg-gray-100"><MessageCircle className="h-5 w-5" /><span className="text-xs font-medium">{translations.message || 'Message'}</span></button>}
      {showPhotos && <button onClick={() => onSelectView('photos')} className={buttonClass('photos')}><ImageIcon className="h-5 w-5" /><span className="text-xs font-medium">{translations.photos || 'Photos'}</span></button>}
      {showAudios && <button onClick={() => onSelectView('audios')} className={buttonClass('audios')}><Music className="h-5 w-5" /><span className="text-xs font-medium">{translations.audios || 'Audios'}</span></button>}
      {showSearch && <button onClick={() => onSelectView('search')} className={buttonClass('search')}><Search className="h-5 w-5" /><span className="text-xs font-medium">{translations.search || 'Search'}</span></button>}
    </div>
  );
};

export default UserProfileActions;
