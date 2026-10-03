import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { messengerApi } from '@/shared/api/baseApi';

// The store only holds the RTK Query cache; app/store.ts checks this stays in sync with the real store.
export type RootState = { [messengerApi.reducerPath]: ReturnType<typeof messengerApi.reducer> };
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
