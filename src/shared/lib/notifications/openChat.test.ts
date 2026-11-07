import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openNotificationChatInApp, routeNotificationChats } from './openChat';

describe('opening chats from notifications', () => {
  const container = new EventTarget() as EventTarget & { startMessages: () => void };
  const assign = vi.fn();
  let stop: (() => void) | null = null;

  beforeEach(() => {
    container.startMessages = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
  });
  afterEach(() => {
    stop?.(); stop = null;
    assign.mockReset();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  const workerMessage = (data: unknown) => container.dispatchEvent(new MessageEvent('message', { data }));

  it('routes a worker click inside the app instead of reloading the page', () => {
    const navigate = vi.fn();
    stop = routeNotificationChats(navigate);
    expect(container.startMessages).toHaveBeenCalled();
    workerMessage({ type: 'open-chat', chatId: '77', notification: true, reply: false });
    workerMessage({ type: 'open-chat', chatId: '78', notification: true, reply: true });
    expect(navigate.mock.calls).toEqual([['/chat/77?notification=1'], ['/chat/78?notification=1&reply=1']]);
    expect(assign).not.toHaveBeenCalled();
  });

  it('ignores other worker messages and invalid chat ids', () => {
    const navigate = vi.fn();
    stop = routeNotificationChats(navigate);
    workerMessage({ type: 'open-chat', chatId: '77' });
    workerMessage({ type: 'open-chat', chatId: '../x', notification: true });
    workerMessage({ type: 'notification-account', chatId: '77', notification: true });
    workerMessage(null);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes the in-app toast through the router and falls back to a page load without one', () => {
    const navigate = vi.fn();
    stop = routeNotificationChats(navigate);
    openNotificationChatInApp('7');
    expect(navigate).toHaveBeenCalledWith('/chat/7?notification=1');
    stop(); stop = null;
    workerMessage({ type: 'open-chat', chatId: '77', notification: true });
    openNotificationChatInApp('7');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/chat/7?notification=1');
  });
});
