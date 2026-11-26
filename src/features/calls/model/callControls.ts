import { currentEngine } from './callController';
import { leaveUnjoinedStart } from './callRuntime';
import { CallFailure } from './errors';
import { patchSession, sessionStore, type CallNotice } from './stores';

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

const failureNotice = (error: unknown, fallback: CallNotice) => (error instanceof CallFailure ? error.notice : fallback);

export const toggleCamera = async () => {
  const engine = currentEngine();
  const { camera, cameraDevice } = sessionStore.get();
  if (!engine || camera === 'starting') return;
  try {
    await engine.setCameraEnabled(camera === 'off', cameraDevice);
  } catch (error) {
    if (currentEngine() === engine) patchSession({ notice: failureNotice(error, 'camera-failed') });
  }
};

export const flipCamera = async () => {
  const engine = currentEngine();
  if (!engine) return;
  try {
    await engine.flipCamera();
  } catch {
    if (currentEngine() === engine) patchSession({ notice: 'camera-failed' });
  }
};

export const selectCameraDevice = async (deviceId: string) => {
  const engine = currentEngine();
  patchSession({ cameraDevice: deviceId });
  if (!engine || sessionStore.get().camera !== 'on') return;
  try {
    await engine.setCameraEnabled(true, deviceId);
  } catch {
    if (currentEngine() === engine) patchSession({ notice: 'camera-failed', cameraDevice: '' });
  }
};

export const toggleScreenShare = async () => {
  const engine = currentEngine();
  const { sharing } = sessionStore.get();
  if (!engine || sharing === 'starting') return;
  if (sharing === 'on') {
    await engine.stopScreenShare().catch(() => undefined);
    return;
  }
  try {
    await engine.startScreenShare();
  } catch (error) {
    if (currentEngine() === engine) patchSession({ notice: failureNotice(error, 'share-failed') });
  }
};

export const stopScreenShare = async () => {
  await currentEngine()?.stopScreenShare().catch(() => undefined);
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
