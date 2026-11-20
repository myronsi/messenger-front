import { createContext, useContext } from 'react';

export const CurrentUsernameContext = createContext('');

export const useCurrentUsername = () => useContext(CurrentUsernameContext);
