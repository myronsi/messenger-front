import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EntityId } from '@/shared/api/entityId';

export const useOpenGroupChat = () => {
  const navigate = useNavigate();
  return useCallback((chatId: EntityId, name: string) => {
    navigate(`/chat/${chatId}`, { state: { chatId, chatName: name, type: 'group' } });
  }, [navigate]);
};
