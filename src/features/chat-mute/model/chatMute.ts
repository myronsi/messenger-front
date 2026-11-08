import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { muteNotifications, notificationSnapshot, subscribeNotifications, type NotificationSettings } from '@/shared/lib/notifications/api';
import { localeOf } from '@/shared/lang/languages';

export type MuteDuration = '1h' | '8h' | 'forever';
export interface ChatMute { until: Date; forever: boolean }

const FOREVER_FROM_YEAR = 9000;

export const getChatMute = (settings: NotificationSettings | null, chatId: EntityId, now = Date.now()): ChatMute | null => {
  const mute = settings?.mutes.find((item) => String(item.chat_id) === String(chatId));
  if (!mute) return null;
  const until = new Date(mute.until);
  if (!(until.getTime() > now)) return null;
  return { until, forever: until.getUTCFullYear() >= FOREVER_FROM_YEAR };
};

export const formatMuteUntil = (until: Date, language: string, now = new Date()) => {
  const locale = localeOf(language);
  const sameDay = until.toDateString() === now.toDateString();
  return until.toLocaleString(locale, sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const MAX_TIMEOUT_MS = 2_147_483_647;

export const useChatMuteStatus = (chatId?: EntityId | null) => {
  const settings = useSyncExternalStore(subscribeNotifications, notificationSnapshot);
  const [, setExpiredAt] = useState(0);
  const mute = chatId ? getChatMute(settings, chatId) : null;
  const endsAt = mute && !mute.forever ? mute.until.getTime() : 0;
  useEffect(() => {
    if (!endsAt) return;
    const timeout = window.setTimeout(() => setExpiredAt(endsAt), Math.min(Math.max(endsAt - Date.now(), 0) + 50, MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timeout);
  }, [endsAt]);
  return { mute, isAvailable: !!settings };
};

export const useChatMute = (chatId?: EntityId | null) => {
  const { mute, isAvailable } = useChatMuteStatus(chatId);
  const [busy, setBusy] = useState(false);
  const setMute = useCallback(async (duration: MuteDuration | 'off') => {
    if (!chatId) return;
    setBusy(true);
    try {
      await muteNotifications(String(chatId), duration);
    } finally {
      setBusy(false);
    }
  }, [chatId]);
  return { mute, busy, setMute, isAvailable };
};
