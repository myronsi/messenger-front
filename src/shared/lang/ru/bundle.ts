import { auth } from './auth';
import { profile } from './profile';
import { chat } from './chat';
import { group } from './group';
import { messages } from './messages';
import { timeDate } from './timeDate';
import { confirmations } from './confirmations';
import { errors } from './errors';
import { fileTypes } from './fileTypes';
import { supplemental } from './supplemental';
import { update } from './update';

export const ru = {
  ...auth, ...profile, ...chat, ...group, ...messages,
  ...timeDate, ...confirmations, ...errors, ...fileTypes, ...supplemental, ...update,
};
