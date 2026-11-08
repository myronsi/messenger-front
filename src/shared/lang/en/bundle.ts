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
import { docs } from './docs';
import { recoveryUi } from './recoveryUi';
import { securityUi } from './securityUi';
import { qrLogin } from './qrLogin';
import { calls } from './calls';
import { appShell } from './appShell';
import { appearance } from './appearance';
import { authLayout } from './authLayout';

export const en = {
  ...auth, ...profile, ...chat, ...group, ...messages,
  ...timeDate, ...confirmations, ...errors, ...fileTypes, ...supplemental, ...update, ...docs, ...recoveryUi, ...securityUi, ...qrLogin, ...calls, ...appShell,
  ...appearance, ...authLayout,
};
