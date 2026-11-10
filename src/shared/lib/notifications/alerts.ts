import { toast } from 'sonner';
import { notificationAccount, notificationSnapshot } from './api';
import { openNotificationChatInApp } from './openChat';
import { isAppLanguage, type AppLanguage } from '@/shared/lang/languages';
import { notificationSettings as enWords } from '@/shared/lang/en/notificationSettings';
import { notificationSettings as ruWords } from '@/shared/lang/ru/notificationSettings';
import { notificationSettings as esWords } from '@/shared/lang/es/notificationSettings';
import { notificationSettings as deWords } from '@/shared/lang/de/notificationSettings';

const NOTIFICATION_WORDS: Record<AppLanguage, { newMessage: string; open: string }> = {
  en: enWords.notificationSettings, ru: ruWords.notificationSettings, es: esWords.notificationSettings, de: deWords.notificationSettings,
};

interface IncomingMessage { chatId: string; messageId: string; senderId: string; title: string; body: string; timestamp: string }
const seen = new Set<string>();
const activeToasts = new Set<string | number>();
let generation = 0;
export function clearMessageAlerts() {
  generation++;
  activeToasts.forEach((id) => toast.dismiss(id)); activeToasts.clear(); seen.clear();
}
let audio: AudioContext | null = null;
export const prepareNotificationSound = () => {
  if (!audio && 'AudioContext' in window) audio = new AudioContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => undefined);
};
export function alertIncomingMessage(message: IncomingMessage, activeChatId?: string | number) {
  const settings = notificationSnapshot();
  const user = notificationAccount(); const scheduledGeneration = generation;
  if (!settings?.preferences.enabled || message.senderId === notificationAccount()) return;
  if (!message.messageId || !message.chatId || Date.now() - Date.parse(message.timestamp) > 60_000) return;
  if (settings.mutes.some((m) => m.chat_id === message.chatId && Date.parse(m.until) > Date.now())) return;
  const key = `${notificationAccount()}:${message.messageId}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 1000) seen.delete(seen.values().next().value!);
  if (document.visibilityState !== 'visible' || String(activeChatId) === message.chatId) return;
  // A Web Lock elects one visible tab; the persisted marker also handles later replay in another tab.
  const show = () => {
    if (user !== notificationAccount() || scheduledGeneration !== generation || document.visibilityState !== 'visible') return;
    const latest = notificationSnapshot();
    if (!latest?.preferences.enabled || latest.mutes.some((m) => m.chat_id === message.chatId && Date.parse(m.until) > Date.now())) return;
    const marker = `messenger:notification-seen:${user}`;
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem(marker) || '[]') as string[]; } catch { /* Start a fresh replay window. */ }
    if (recent.includes(message.messageId)) return;
    localStorage.setItem(marker, JSON.stringify([...recent.slice(-99), message.messageId]));
    const stored = localStorage.getItem('language');
    const words = NOTIFICATION_WORDS[isAppLanguage(stored) ? stored : 'ru'];
    const id = toast(latest.preferences.previews ? message.title : 'Messenger', {
      description: latest.preferences.previews ? message.body : words.newMessage,
      action: { label: words.open, onClick: () => {
        if (user === notificationAccount() && scheduledGeneration === generation) openNotificationChatInApp(message.chatId);
      } },
      onDismiss: (item) => { activeToasts.delete(item.id); }, onAutoClose: (item) => { activeToasts.delete(item.id); },
    });
    if (id !== undefined) activeToasts.add(id);
    if (latest.preferences.sound && audio?.state === 'running') {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 660; gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.15);
    }
  };
  if (navigator.locks) void navigator.locks.request('messenger-notification', show);
  else show();
}
