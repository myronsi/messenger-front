import { auth } from './auth';
import { profile } from './profile';
import { chat } from './chat';
import { group } from './group';
import { messages } from './messages';
import { timeDate } from './timeDate';
import { confirmations } from './confirmations';
import { errors } from './errors';
import { fileTypes } from './fileTypes';

export * from './auth';
export * from './profile';
export * from './chat';
export * from './group';
export * from './messages';
export * from './timeDate';
export * from './confirmations';
export * from './errors';
export * from './fileTypes';

export const en = {
  ...auth,
  ...profile,
  ...chat,
  ...group,
  ...messages,
  ...timeDate,
  ...confirmations,
  ...errors,
  ...fileTypes,
};