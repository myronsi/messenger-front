const WAIT_MS = 5000;
const STEP_MS = 100;

export const focusComposerWhenReady = (chatId: string, now = () => Date.now()) => {
  const until = now() + WAIT_MS;
  const attempt = () => {
    const field = document.querySelector<HTMLTextAreaElement>(`[data-chat-id="${chatId}"] [data-testid="message-input-field"]`);
    if (field && !field.disabled) {
      field.focus();
      return;
    }
    if (now() < until) window.setTimeout(attempt, STEP_MS);
  };
  attempt();
};

export const listenForNotificationReply = () => {
  const container = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  if (!container) return () => undefined;
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'notification-reply' && /^\d+$/.test(String(event.data.chat_id))) {
      focusComposerWhenReady(String(event.data.chat_id));
    }
  };
  container.addEventListener('message', onMessage);
  return () => container.removeEventListener('message', onMessage);
};
