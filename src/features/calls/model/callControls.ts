import { currentEngine } from './callController';
import { patchSession, sessionStore } from './stores';

export const toggleMute = async () => {
  const muted = !sessionStore.get().muted;
  patchSession({ muted });
  await currentEngine()?.setMuted(muted).catch(() => undefined);
};

export const selectInputDevice = async (deviceId: string) => {
  patchSession({ input: deviceId });
  await currentEngine()?.selectInput(deviceId || 'default').catch(() => undefined);
};

export const selectOutputDevice = async (deviceId: string) => {
  patchSession({ output: deviceId });
  await currentEngine()?.selectOutput(deviceId || 'default').catch(() => undefined);
};

export const enableCallAudio = async () => {
  await currentEngine()?.startAudio().catch(() => undefined);
};

export const setCodeVerified = (verified: boolean) => patchSession({ verified });

export const dismissCallNotice = () => patchSession({ notice: null, otherTab: false });

export const cancelTakeover = () => patchSession({ takeoverCallId: null });
