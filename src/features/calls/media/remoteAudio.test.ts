import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteAudio } from './remoteAudio';

const track = () => ({ kind: 'audio', attach: vi.fn(() => document.createElement('audio')), detach: vi.fn() });
const bob = { user_id: '2', session_id: 's-bob', identity_key: 'pk-bob' };

describe('remote call audio', () => {
  let audio: RemoteAudio | null = null;
  afterEach(() => { audio?.dispose(); audio = null; });

  it('plays only encrypted tracks of sessions on the roster', () => {
    const report = vi.fn();
    audio = new RemoteAudio('1:s-alice', report);
    audio.setRoster([bob]);
    const plain = track();
    const stranger = track();
    const peer = track();
    audio.add(plain, { isEncrypted: false }, '2:s-bob');
    audio.add(stranger, { isEncrypted: true }, '3:s-mallory');
    audio.add(peer, { isEncrypted: true }, '2:s-bob');
    expect(plain.attach).not.toHaveBeenCalled();
    expect(stranger.attach).not.toHaveBeenCalled();
    expect(peer.attach).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('[data-call-audio] audio')).toHaveLength(1);
  });

  it('checks again when the roster changes', () => {
    audio = new RemoteAudio('1:s-alice', vi.fn());
    const early = track();
    audio.add(early, { isEncrypted: true }, '2:s-bob');
    expect(audio.attachedCount()).toBe(0);
    audio.setRoster([bob]);
    expect(audio.attachedCount()).toBe(1);
    audio.setRoster([]);
    expect(audio.attachedCount()).toBe(0);
    expect(early.detach).toHaveBeenCalledTimes(1);
  });
});
