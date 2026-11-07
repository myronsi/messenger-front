import { describe, expect, it, vi } from 'vitest';
import { TrackEvent } from 'livekit-client';
import { MicrophoneGate } from './microphoneGate';

const fakeTrack = () => {
  const listeners = new Map<string, Set<() => void>>();
  const emit = (event: string) => listeners.get(event)?.forEach((listener) => listener());
  const track = {
    isMuted: false,
    mediaStreamTrack: { enabled: true } as MediaStreamTrack,
    mute: vi.fn(async () => {
      track.isMuted = true;
      track.mediaStreamTrack.enabled = false;
      emit(TrackEvent.Muted);
    }),
    unmute: vi.fn(async () => {
      track.isMuted = false;
      track.mediaStreamTrack.enabled = true;
      emit(TrackEvent.Unmuted);
    }),
    restart: () => {
      track.mediaStreamTrack = { enabled: !track.isMuted } as MediaStreamTrack;
      emit(TrackEvent.Restarted);
    },
    on: (event: string, listener: () => void) => { listeners.set(event, (listeners.get(event) ?? new Set()).add(listener)); },
    off: (event: string, listener: () => void) => { listeners.get(event)?.delete(listener); },
  };
  return track;
};

describe('microphone gate', () => {
  it('mutes through LiveKit while the own key is missing, so a track restart stays silent', async () => {
    const track = fakeTrack();
    const gate = new MicrophoneGate(track, false, vi.fn());
    await gate.setKeyReady(false);
    expect(track.isMuted).toBe(true);
    track.restart();
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await gate.setKeyReady(true);
    expect(track.isMuted).toBe(false);
    expect(track.mediaStreamTrack.enabled).toBe(true);
  });

  it('silences a restarted track at once when the restart unmuted it while the gate is closed', async () => {
    const track = fakeTrack();
    const gate = new MicrophoneGate(track, false, vi.fn());
    await gate.setKeyReady(false);
    track.isMuted = false;
    track.restart();
    expect(track.mediaStreamTrack.enabled).toBe(false);
    await gate.apply();
    expect(track.isMuted).toBe(true);
  });

  it('keeps the user mute apart from the key gate', async () => {
    const track = fakeTrack();
    const gate = new MicrophoneGate(track, true, vi.fn());
    await gate.setKeyReady(true);
    expect(track.isMuted).toBe(true);
    await gate.setMuted(false);
    expect(track.isMuted).toBe(false);
    await gate.setKeyReady(false);
    await gate.setMuted(false);
    expect(track.isMuted).toBe(true);
    await gate.setKeyReady(true);
    expect(track.isMuted).toBe(false);
  });

  it('reports a failed unmute and keeps the track silent', async () => {
    const track = fakeTrack();
    const onError = vi.fn();
    const gate = new MicrophoneGate(track, false, onError);
    await gate.setKeyReady(false);
    track.unmute.mockRejectedValueOnce(new Error('NotFoundError'));
    await gate.setKeyReady(true);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(track.mediaStreamTrack.enabled).toBe(false);
  });
});
