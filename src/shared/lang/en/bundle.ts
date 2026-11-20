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
import { legal } from './legal';
import { recoveryUi } from './recoveryUi';
import { securityUi } from './securityUi';
import { qrLogin } from './qrLogin';
import { calls } from './calls';
import { appShell } from './appShell';
import { appearance } from './appearance';
import { authLayout } from './authLayout';
import { notificationSettings } from './notificationSettings';
import { connections } from './connections';
import { presence } from './presence';
import { drawing } from './drawing';
import { typingStatus } from './typingStatus';
import { appLinks } from './appLinks';
import { stickers } from './stickers';
import { stickerPacks } from './stickerPacks';
import { chatOrganizer } from './chatOrganizer';
import { chatCleanup } from './chatCleanup';
import { profileRework } from './profileRework';
import { profileExtras } from './profileExtras';
import { customEmoji } from './customEmoji';
import { audioPlayer } from './audioPlayer';
import { groupCreate } from './groupCreate';
import { mainNav } from './mainNav';
import { personalization } from './personalization';
import { moderation } from './moderation';

export const en = {
  ...auth, ...profile, ...chat, ...group, ...messages,
  ...timeDate, ...confirmations, ...errors, ...fileTypes, ...supplemental, ...update, ...legal, ...recoveryUi, ...securityUi, ...qrLogin, ...calls, ...appShell,
  ...appearance, ...authLayout, ...notificationSettings, ...connections, ...presence, ...drawing, ...typingStatus, ...appLinks, ...stickers, ...stickerPacks,
  ...chatOrganizer, ...chatCleanup, ...profileRework, ...profileExtras, ...customEmoji, ...audioPlayer, ...groupCreate, ...mainNav, ...personalization,
  ...moderation,
};
