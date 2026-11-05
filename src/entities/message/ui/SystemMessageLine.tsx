import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { SystemEventInfo } from '../model/types';
import { systemEventText } from '../model/systemEvents';

interface SystemMessageLineProps {
  event: SystemEventInfo;
  isMe: (id?: EntityId | null) => boolean;
}

const SystemMessageLine: React.FC<SystemMessageLineProps> = ({ event, isMe }) => {
  const { translations } = useLanguage();
  return (
    <div data-testid="system-message" className="motion-message flex justify-center px-4">
      <div className="max-w-[85%] rounded-full bg-accent/80 px-3 py-1 text-center text-xs text-accent-foreground">
        {systemEventText(event, translations, isMe)}
      </div>
    </div>
  );
};

export default SystemMessageLine;
