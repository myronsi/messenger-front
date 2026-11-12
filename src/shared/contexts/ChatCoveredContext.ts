import { createContext, useContext } from 'react';

export const ChatCoveredContext = createContext(false);

export const useChatCovered = () => useContext(ChatCoveredContext);
