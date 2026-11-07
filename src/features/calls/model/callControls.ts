import { currentEngine } from './callController';
import { leaveUnjoinedStart } from './callRuntime';
import { patchSession, sessionStore } from './stores';

export const toggleMute = async () => {
  const muted = !sessionStore.get().muted;
  patchSession({ muted });
  await currentEngine()?.setMuted(muted).catch(() => undefined);
};

export const selectInputDevice = async (deviceId: string) => {
  const engine = currentEngine();
  patchSession({ input: deviceId });
  if (!engine) return;
  try {
    await engine.selectInput(deviceId);
  } catch {
    if (currentEngine() === engine) patchSession({ notice: 'mic-failed', input: '' });
  }
};

export const selectOutputDevice = async (deviceId: string) => {
  patchSession({ output: deviceId });
  await currentEngine()?.selectOutput(deviceId).catch(() => undefined);
};

export const enableCallAudio = async () => {
  await currentEngine()?.startAudio().catch(() => undefined);
};

export const setCodeVerified = (verified: boolean) => patchSession({ verified });

export const dismissCallNotice = () => patchSession({ notice: null });

export const cancelTakeover = () => {
  const { takeoverCallId } = sessionStore.get();
  patchSession({ takeoverCallId: null });
  leaveUnjoinedStart(takeoverCallId);
};
