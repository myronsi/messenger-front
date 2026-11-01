import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { loadNotifications, muteNotifications, notificationRequest, notificationSnapshot } from '@/shared/lib/notifications/api';
import { saveNotifications, subscribeNotifications, type NotificationPreferences } from '@/shared/lib/notifications/api';
import { disableNotificationDevice, enableNotificationDevice, notificationDeviceEnabled, notificationSupported } from '@/shared/lib/notifications/device';

interface Props { isActive: boolean; onBack: () => void }
export default function NotificationSettingsPanel({ isActive, onBack }: Props) {
  const { language } = useLanguage();
  const ru = language === 'ru';
  const settings = useSyncExternalStore(subscribeNotifications, notificationSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabledHere, setEnabledHere] = useState(notificationDeviceEnabled);
  const [chatId, setChatId] = useState('');
  const [duration, setDuration] = useState<'off' | '1h' | '8h' | 'forever'>('1h');
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    void loadNotifications().catch(() => { if (!cancelled) setError(ru ? 'Не удалось загрузить настройки.' : 'Unable to load settings.'); });
    void (async () => {
      let next: string | null = '/chats?limit=100';
      const all: { id: string; name: string }[] = [];
      while (next && !cancelled) {
        const page = await notificationRequest(next);
        for (const chat of page.items || []) all.push({ id: chat.id, name: chat.name || chat.peer?.display_name || chat.peer?.username || chat.id });
        next = page.next_cursor ? `/chats?limit=100&after=${encodeURIComponent(page.next_cursor)}` : null;
      }
      if (!cancelled) setChats(all);
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [isActive, ru]);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); setEnabledHere(notificationDeviceEnabled()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : ru ? 'Не удалось сохранить настройки.' : 'Unable to save settings.'); }
    finally { setBusy(false); }
  };
  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (settings) void perform(() => saveNotifications({ ...settings.preferences, [key]: value }));
  };
  return <section className="h-full overflow-y-auto bg-white p-4" aria-label={ru ? 'Уведомления' : 'Notifications'}>
    <button className="mb-5 flex items-center gap-2 text-sm" onClick={onBack}><ArrowLeft size={18} />{ru ? 'Профиль' : 'Profile'}</button>
    <h3 className="mb-2 flex items-center gap-2 text-xl font-semibold"><Bell size={22} />{ru ? 'Уведомления' : 'Notifications'}</h3>
    <p className="mb-5 text-sm text-gray-500">{ru ? 'Настройте уведомления о новых сообщениях.' : 'Choose how you hear about new messages.'}</p>
    {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
    {!settings ? <button onClick={() => void perform(loadNotifications)}>{ru ? 'Загрузить настройки' : 'Load settings'}</button> : <>
      <div className="divide-y rounded-lg border px-4">
        {([
          ['enabled', ru ? 'Уведомления о сообщениях' : 'Message notifications'],
          ['sound', ru ? 'Звук' : 'Sound'],
          ['previews', ru ? 'Показывать имя и текст сообщения' : 'Show sender and message previews'],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 py-4 text-sm">
          {label}<input type="checkbox" checked={settings.preferences[key]} disabled={busy} onChange={(e) => toggle(key, e.target.checked)} />
        </label>)}
      </div>
      <p className="my-3 text-xs text-gray-500">{ru ? 'По умолчанию текст сообщения скрыт на экране блокировки.' : 'Message content is hidden on the lock screen by default.'}</p>
      <button className="my-3 rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={busy || !notificationSupported()}
        onClick={() => void perform(() => enabledHere ? disableNotificationDevice() : enableNotificationDevice(settings))}>
        {enabledHere ? ru ? 'Отключить на этом устройстве' : 'Disable on this device' : ru ? 'Включить на этом устройстве' : 'Enable on this device'}
      </button>
      {!notificationSupported() && <p className="text-sm text-gray-500">{ru ? 'Этот браузер не поддерживает push-уведомления.' : 'This browser does not support push notifications.'}</p>}
      <h4 className="mb-3 mt-6 font-medium">{ru ? 'Без звука для чата' : 'Mute a conversation'}</h4>
      <label className="block text-sm">{ru ? 'Чат' : 'Conversation'}
        <select className="my-2 block w-full rounded border p-2" value={chatId} onChange={(e) => setChatId(e.target.value)}>
          <option value="">{ru ? 'Выберите чат' : 'Choose a conversation'}</option>
          {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">{ru ? 'Длительность' : 'Duration'}
        <select className="my-2 block w-full rounded border p-2" value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
          <option value="1h">{ru ? '1 час' : '1 hour'}</option><option value="8h">{ru ? '8 часов' : '8 hours'}</option>
          <option value="forever">{ru ? 'Пока не включу' : 'Until I turn it back on'}</option><option value="off">{ru ? 'Включить уведомления' : 'Unmute'}</option>
        </select>
      </label>
      <button disabled={busy || !chatId} className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        onClick={() => void perform(() => muteNotifications(chatId, duration))}>{ru ? 'Применить' : 'Apply'}</button>
      {settings.mutes.length > 0 && <ul className="mt-4 space-y-3 text-sm">
        {settings.mutes.map((mute) => <li key={mute.chat_id} className="flex items-center justify-between gap-3">
          <span>{chats.find((chat) => chat.id === mute.chat_id)?.name || mute.chat_id}</span>
          <button disabled={busy} className="underline" onClick={() => void perform(() => muteNotifications(mute.chat_id, 'off'))}>
            {ru ? 'Включить' : 'Unmute'}
          </button>
        </li>)}
      </ul>}
    </>}
  </section>;
}
