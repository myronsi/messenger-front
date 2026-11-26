import {
  AudioPresets, MediaDeviceFailure, ScreenSharePresets, Track, TrackEvent, VideoPresets, createLocalScreenTracks, createLocalVideoTrack,
  type LocalAudioTrack, type LocalTrack, type LocalVideoTrack, type TrackPublishOptions, type VideoCaptureOptions,
} from 'livekit-client';
import { CallFailure } from '../model/errors';
import type { CallSession, CameraFacing } from '../model/stores';
import type { VideoFeed, VideoHandle } from '../model/videoStore';
import { LocalVideoPublisher, type PublishTarget } from './localVideo';

const CAMERA_CAPTURE = VideoPresets.h720.resolution;
const SCREEN_CAPTURE = ScreenSharePresets.h1080fps15.resolution;

export const CAMERA_PUBLISH: TrackPublishOptions = {
  source: Track.Source.Camera, videoCodec: 'vp8', simulcast: true, videoEncoding: VideoPresets.h720.encoding,
  videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
};

export const SCREEN_PUBLISH: TrackPublishOptions = {
  source: Track.Source.ScreenShare, videoCodec: 'vp8', simulcast: true, screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
  screenShareSimulcastLayers: [ScreenSharePresets.h360fps3],
};

export const SCREEN_AUDIO_PUBLISH: TrackPublishOptions = {
  source: Track.Source.ScreenShareAudio, audioPreset: AudioPresets.music, dtx: false, red: false,
};

export const openCamera = async (deviceId: string | undefined, facingMode: CameraFacing) => {
  try {
    return await createLocalVideoTrack({
      deviceId: deviceId || undefined, facingMode: deviceId ? undefined : facingMode, resolution: CAMERA_CAPTURE,
    });
  } catch (error) {
    const failure = MediaDeviceFailure.getFailure(error);
    if (failure === MediaDeviceFailure.PermissionDenied) throw new CallFailure('camera-denied');
    if (failure === MediaDeviceFailure.NotFound) throw new CallFailure('camera-missing');
    if (failure === MediaDeviceFailure.DeviceInUse) throw new CallFailure('camera-in-use');
    throw new CallFailure('camera-failed');
  }
};

const captureScreen = (audio: boolean) => createLocalScreenTracks({
  audio, resolution: SCREEN_CAPTURE, contentHint: 'detail', selfBrowserSurface: 'exclude', surfaceSwitching: 'include', systemAudio: 'exclude',
});

export const openScreen = async () => {
  try {
    try {
      return await captureScreen(true);
    } catch (error) {
      if (error instanceof TypeError) return await captureScreen(false);
      throw error;
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : '';
    if (name === 'NotAllowedError' && /system/i.test(message)) throw new CallFailure('share-denied');
    if (name === 'NotAllowedError' || name === 'AbortError') return null;
    throw new CallFailure('share-failed');
  }
};

export interface LocalMediaHost {
  ownIdentity: string;
  target: PublishTarget<LocalTrack>;
  patch: (patch: Partial<CallSession>) => void;
  changed: () => void;
  devicesChanged: () => void;
}

interface ScreenShare {
  video: LocalVideoTrack;
  audio: LocalAudioTrack | null;
}

const cameraHandle = (track: LocalVideoTrack): VideoHandle => ({
  attach: (element) => track.attach(element), detach: (element) => track.detach(element),
});

export class LocalMedia {
  private readonly publisher: LocalVideoPublisher<LocalTrack>;
  private camera: LocalVideoTrack | null = null;
  private cameraFeed: VideoFeed | null = null;
  private facing: CameraFacing = 'user';
  private cameraQueue: Promise<void> = Promise.resolve();
  private screen: ScreenShare | null = null;
  private screenStarting = false;
  private closed = false;

  constructor(private readonly host: LocalMediaHost) {
    this.publisher = new LocalVideoPublisher<LocalTrack>(host.target, (track, error) => { void this.dropTrack(track, error); });
  }

  setKeyReady(ready: boolean) {
    return this.publisher.setKeyReady(ready);
  }

  feeds(): VideoFeed[] {
    const camera = this.camera;
    const mirrored = this.facing === 'user';
    if (!camera) this.cameraFeed = null;
    else if (!this.cameraFeed || this.cameraFeed.mirrored !== mirrored) {
      this.cameraFeed = {
        id: `${this.host.ownIdentity}/camera`, identity: this.host.ownIdentity, source: 'camera', local: true, muted: false, mirrored,
        handle: this.cameraFeed?.handle ?? cameraHandle(camera),
      };
    }
    return this.cameraFeed ? [this.cameraFeed] : [];
  }

  setCameraEnabled(on: boolean, deviceId?: string) {
    return this.serialCamera(async () => {
      if (this.closed) return;
      if (!on) await this.stopCamera();
      else if (!this.camera) await this.startCamera(deviceId);
      else if (deviceId !== undefined) await this.restartCamera({ deviceId: deviceId || undefined, resolution: CAMERA_CAPTURE });
    });
  }

  flipCamera() {
    return this.serialCamera(async () => {
      if (!this.camera || this.closed) return;
      const facing: CameraFacing = this.facing === 'user' ? 'environment' : 'user';
      await this.restartCamera({ facingMode: facing, resolution: CAMERA_CAPTURE });
      this.facing = facing;
      this.host.patch({ facing, cameraDevice: '' });
      this.host.changed();
    });
  }

  async startScreenShare() {
    if (this.screen || this.screenStarting || this.closed) return;
    this.screenStarting = true;
    this.host.patch({ sharing: 'starting' });
    let tracks: LocalTrack[] | null;
    try {
      tracks = await openScreen();
    } catch (error) {
      if (!this.closed) this.host.patch({ sharing: 'off' });
      throw error;
    } finally {
      this.screenStarting = false;
    }
    const video = tracks?.find((track): track is LocalVideoTrack => track.kind === Track.Kind.Video);
    if (!tracks || !video || this.closed) {
      tracks?.forEach((track) => track.stop());
      if (!this.closed) this.host.patch({ sharing: 'off' });
      return;
    }
    const audio = tracks.find((track): track is LocalAudioTrack => track.kind === Track.Kind.Audio) ?? null;
    this.screen = { video, audio };
    video.on(TrackEvent.Ended, this.onScreenEnded);
    this.publisher.add(video, SCREEN_PUBLISH);
    if (audio) this.publisher.add(audio, SCREEN_AUDIO_PUBLISH);
    this.host.patch({ sharing: 'on' });
  }

  async stopScreenShare() {
    const screen = this.screen;
    this.screen = null;
    if (!this.closed) this.host.patch({ sharing: 'off' });
    if (!screen) return;
    screen.video.off(TrackEvent.Ended, this.onScreenEnded);
    await Promise.all([this.publisher.remove(screen.video), screen.audio ? this.publisher.remove(screen.audio) : undefined]);
  }

  release() {
    this.closed = true;
    this.screen?.video.off(TrackEvent.Ended, this.onScreenEnded);
    this.camera?.off(TrackEvent.Muted, this.onCameraLost);
    this.publisher.release();
    this.camera = null;
    this.cameraFeed = null;
    this.screen = null;
  }

  private serialCamera(action: () => Promise<void>) {
    const run = this.cameraQueue.then(action);
    this.cameraQueue = run.catch(() => undefined);
    return run;
  }

  private async restartCamera(capture: VideoCaptureOptions) {
    const track = this.camera;
    if (track) await this.publisher.whenOpen(track, () => track.restartTrack(capture));
  }

  private async startCamera(deviceId?: string) {
    this.host.patch({ camera: 'starting' });
    let track: LocalVideoTrack;
    try {
      track = await openCamera(deviceId, this.facing);
    } catch (error) {
      if (!this.closed) this.host.patch({ camera: 'off' });
      throw error;
    }
    if (this.closed) {
      track.stop();
      return;
    }
    this.camera = track;
    this.cameraFeed = null;
    track.on(TrackEvent.Muted, this.onCameraLost);
    this.publisher.add(track, CAMERA_PUBLISH);
    this.host.changed();
    this.host.patch({ camera: 'on' });
    this.host.devicesChanged();
  }

  private async stopCamera() {
    const track = this.camera;
    this.camera = null;
    this.host.changed();
    this.host.patch({ camera: 'off' });
    if (!track) return;
    track.off(TrackEvent.Muted, this.onCameraLost);
    await this.publisher.remove(track);
  }

  private onCameraLost = (track: LocalTrack) => {
    if (track === this.camera) void this.dropTrack(track, new Error('camera track ended'));
  };

  private onScreenEnded = () => { void this.stopScreenShare(); };

  private async dropTrack(track: LocalTrack, error: unknown) {
    if (this.closed) return;
    console.warn('Stopped a local call track after an error', { source: track.source, error });
    if (track === this.camera) {
      await this.serialCamera(() => this.stopCamera());
      this.host.patch({ notice: 'camera-failed' });
      return;
    }
    const screen = this.screen;
    if (!screen) return;
    if (track === screen.audio) {
      await this.publisher.remove(track);
      if (this.screen === screen) this.screen = { ...screen, audio: null };
      return;
    }
    if (track !== screen.video) return;
    await this.stopScreenShare();
    this.host.patch({ notice: 'share-failed' });
  }
}
