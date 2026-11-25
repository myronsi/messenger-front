import { toast } from 'sonner';
import { notificationAccount, notificationSnapshot } from './api';
import { openNotificationChatInApp } from './openChat';
import type { AppLanguage } from '@/shared/lang/languages';
import { preferredLanguage } from '@/shared/lang/preferredLanguage';
import { notificationSettings as enWords } from '@/shared/lang/en/notificationSettings';
import { notificationSettings as ruWords } from '@/shared/lang/ru/notificationSettings';
import { notificationSettings as esWords } from '@/shared/lang/es/notificationSettings';
import { notificationSettings as deWords } from '@/shared/lang/de/notificationSettings';

export type MessageKind = 'text' | 'photo' | 'video' | 'audio' | 'voice' | 'file' | 'album' | 'sticker' | 'poll' | 'contact' | 'location';
type Words = { newMessage: string; open: string } & Record<Exclude<MessageKind, 'text'>, string>;
const NOTIFICATION_WORDS: Record<AppLanguage, Words> = {
  en: enWords.notificationSettings, ru: ruWords.notificationSettings, es: esWords.notificationSettings, de: deWords.notificationSettings,
};

interface IncomingMessage {
  chatId: string; messageId: string; senderId: string; title: string; body: string; timestamp: string; kind?: MessageKind; live?: boolean;
}
const STALE_MS = 60_000;
const seen = new Set<string>();
const activeToasts = new Set<string | number>();
let generation = 0;
let clockLead = Infinity;
export function clearMessageAlerts() {
  generation++; clockLead = Infinity;
  activeToasts.forEach((id) => toast.dismiss(id)); activeToasts.clear(); seen.clear();
}
const messageAge = (message: IncomingMessage) => {
  const lag = Date.now() - Date.parse(message.timestamp);
  if (message.live) clockLead = Math.min(clockLead, lag);
  return Number.isFinite(clockLead) && clockLead > STALE_MS ? lag - clockLead : lag;
};
const withoutLead = (body: string, lead: string) => (body.startsWith(lead) ? body.slice(lead.length) : body).trim();

const richText = (kind: 'poll' | 'contact' | 'location', body: string, words: Words) => {
  if (kind === 'poll') return `📊 ${withoutLead(body, '📊') || words.poll}`;
  if (kind === 'contact') return `👤 ${withoutLead(body, '👤') || words.contact}`;
  const name = withoutLead(body, '📍').replace(/\s*https?:\/\/\S+/g, '').trim();
  return name ? `📍 ${words.location}: ${name}` : `📍 ${words.location}`;
};

export const describeMessage = (message: Pick<IncomingMessage, 'body' | 'kind'>, words: Words) => {
  const kind = message.kind ?? 'text';
  if (kind === 'poll' || kind === 'contact' || kind === 'location') return richText(kind, message.body, words);
  if (kind === 'text') return message.body || words.newMessage;
  if (kind === 'sticker') return message.body ? `${message.body} ${words.sticker}` : words.sticker;
  if (kind === 'voice') return words.voice;
  return message.body || words[kind];
};
let audio: AudioContext | null = null;
export const prepareNotificationSound = () => {
  if (!audio && 'AudioContext' in window) audio = new AudioContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => undefined);
};
export function alertIncomingMessage(message: IncomingMessage, activeChatId?: string | number) {
  const settings = notificationSnapshot();
  const user = notificationAccount(); const scheduledGeneration = generation;
  if (!settings?.preferences.enabled || message.senderId === notificationAccount()) return;
  if (!message.messageId || !message.chatId || messageAge(message) > STALE_MS) return;
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
    const words = NOTIFICATION_WORDS[preferredLanguage()];
    const id = toast(latest.preferences.previews ? message.title : 'Messenger', {
      description: latest.preferences.previews ? describeMessage(message, words) : words.newMessage,
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
