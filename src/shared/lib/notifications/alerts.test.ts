import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { authFetch } from '@/shared/auth/session';
import { loadNotifications, resetNotifications } from './api';
import { alertIncomingMessage } from './alerts';
import { notifyMessageFrame } from './frames';

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/shared/auth/session', () => ({ authFetch: vi.fn() }));
let sequence = 0;
const incoming = () => ({ chatId: '7', messageId: String(++sequence), senderId: '2', title: 'Alice', body: 'Secret', timestamp: new Date().toISOString() });
const settings = (extra = {}) => ({
  preferences: { enabled: true, sound: false, previews: false }, mutes: [], web_push: true, vapid_public_key: '', ...extra,
});
async function configure(data = settings()) {
  vi.mocked(authFetch).mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
  await loadNotifications();
}
beforeEach(async () => {
  vi.clearAllMocks(); localStorage.clear(); resetNotifications('1');
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  await configure();
});
describe('incoming message alerts', () => {
  it('hides private content by default and deduplicates replay', () => {
    const message = incoming(); alertIncomingMessage(message); alertIncomingMessage(message);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(toast).mock.calls)).not.toContain('Secret');
    expect(JSON.stringify(vi.mocked(toast).mock.calls)).not.toContain('Alice');
  });
  it('suppresses own messages, the focused conversation, stale messages, and background tabs', () => {
    alertIncomingMessage({ ...incoming(), senderId: '1' });
    alertIncomingMessage(incoming(), '7');
    alertIncomingMessage({ ...incoming(), timestamp: new Date(Date.now() - 120_000).toISOString() });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    alertIncomingMessage(incoming());
    expect(toast).not.toHaveBeenCalled();
  });
  it('respects global disable and timed chat mutes', async () => {
    await configure(settings({ preferences: { enabled: false } })); alertIncomingMessage(incoming());
    await configure(settings({ mutes: [{ chat_id: '7', until: new Date(Date.now() + 3600_000).toISOString() }] }));
    alertIncomingMessage(incoming()); expect(toast).not.toHaveBeenCalled();
  });
  it('reads real Go message envelopes and ignores non-message events', async () => {
    await configure(settings({ preferences: { enabled: true, previews: true, sound: false } }));
    const message = incoming();
    notifyMessageFrame({ type: 'read', chat_id: '7', data: {} });
    notifyMessageFrame({ type: 'message', chat_id: '7', data: { message: {
      id: message.messageId, sender: { id: '2', display_name: 'Alice' }, content: 'Secret', created_at: message.timestamp,
    } } });
    expect(toast).toHaveBeenCalledWith('Alice', expect.objectContaining({ description: 'Secret' }));
  });
  it('discards settings fetched for the account that just signed out', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(authFetch).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const request = loadNotifications(); resetNotifications('3');
    finish(new Response(JSON.stringify(settings()))); await request;
    alertIncomingMessage(incoming()); expect(toast).not.toHaveBeenCalled();
  });
});
