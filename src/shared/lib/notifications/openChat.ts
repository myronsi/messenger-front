type ChatOpener = (path: string) => void;

let opener: ChatOpener | null = null;

export const notificationChatPath = (chatId: string, reply = false) => `/chat/${chatId}?notification=1${reply ? '&reply=1' : ''}`;

export function openNotificationChatInApp(chatId: string, reply = false) {
  if (!/^[1-9]\d*$/.test(chatId)) return;
  const path = notificationChatPath(chatId, reply);
  if (opener) opener(path);
  else window.location.assign(path);
}

const onWorkerMessage = (event: MessageEvent) => {
  const data: unknown = event.data;
  if (typeof data !== 'object' || data === null) return;
  const message = data as { type?: unknown; chatId?: unknown; notification?: unknown; reply?: unknown };
  if (message.type !== 'open-chat' || message.notification !== true || typeof message.chatId !== 'string') return;
  openNotificationChatInApp(message.chatId, message.reply === true);
};

export function routeNotificationChats(next: ChatOpener) {
  opener = next;
  const container = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  container?.addEventListener('message', onWorkerMessage);
  container?.startMessages?.();
  return () => {
    if (opener !== next) return;
    opener = null;
    container?.removeEventListener('message', onWorkerMessage);
  };
}
