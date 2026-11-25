import { createContext, useContext } from 'react';
import type { EntityId } from '@/shared/api/entityId';

export const MessageChatContext = createContext<EntityId | undefined>(undefined);

export const useMessageChatId = () => useContext(MessageChatContext);
