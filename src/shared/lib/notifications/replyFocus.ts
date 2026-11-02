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

