import { useState } from 'react';
import { ChatWallpaperDialog, type ChatWallpaperTarget } from './ChatWallpaperDialog';

export const useChatWallpaperAction = () => {
  const [target, setTarget] = useState<ChatWallpaperTarget | null>(null);
  return {
    open: setTarget,
    dialog: <ChatWallpaperDialog target={target} onClose={() => setTarget(null)} />,
  };
};
