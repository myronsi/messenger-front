import { toast } from 'sonner';
import { notificationAccount, notificationSnapshot } from './api';

interface IncomingMessage { chatId: string; messageId: string; senderId: string; title: string; body: string; timestamp: string }
const seen = new Set<string>();
let audio: AudioContext | null = null;
export const prepareNotificationSound = () => {
  if (!audio && 'AudioContext' in window) audio = new AudioContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => undefined);
};
export function alertIncomingMessage(message: IncomingMessage, activeChatId?: string | number) {
  const settings = notificationSnapshot();
  if (!settings?.preferences.enabled || message.senderId === notificationAccount()) return;
  if (!message.messageId || !message.chatId || Date.now() - Date.parse(message.timestamp) > 60_000) return;
  if (settings.mutes.some((m) => m.chat_id === message.chatId && Date.parse(m.until) > Date.now())) return;
  const key = `${notificationAccount()}:${message.messageId}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 1000) seen.delete(seen.values().next().value!);
  if (document.visibilityState !== 'visible' || String(activeChatId) === message.chatId && document.hasFocus()) return;
  // A Web Lock elects one visible tab; the persisted marker also handles later replay in another tab.
  const show = () => {
    const marker = `messenger:notification-seen:${notificationAccount()}`;
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem(marker) || '[]') as string[]; } catch { /* Start a fresh replay window. */ }
    if (recent.includes(message.messageId)) return;
    localStorage.setItem(marker, JSON.stringify([...recent.slice(-99), message.messageId]));
    const ru = localStorage.getItem('language') !== 'en';
    toast(settings.preferences.previews ? message.title : 'Messenger', {
      description: settings.preferences.previews ? message.body : ru ? 'Новое сообщение' : 'New message',
      action: { label: ru ? 'Открыть' : 'Open', onClick: () => window.location.assign(`/chat/${message.chatId}?notification=1`) },
    });
    if (settings.preferences.sound && audio?.state === 'running') {
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
