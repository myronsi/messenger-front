import {
  AudioPresets, ConnectionQuality, DisconnectReason, MediaDeviceFailure, Room, RoomEvent, Track, createLocalAudioTrack, isE2EESupported,
  supportsAudioOutputSelection, type LocalAudioTrack, type Participant, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication,
  type TrackPublication,
} from 'livekit-client';
import E2EEWorker from 'livekit-client/e2ee-worker?worker';
import type { Call, CallGrant, CallKeyEnvelope, CallsApi } from '../api/callsApi';
import type { CallIdentity } from '../crypto/identity';
import { CallFailure } from '../model/errors';
import type { CallSession, DeviceOption } from '../model/stores';
import type { RosterEntry } from '../model/callState';
import type { VideoFeed } from '../model/videoStore';
import { CallKeyProvider } from './keyProvider';
import { KeyExchange, participantIdentity } from './keyExchange';
import { LocalMedia } from './localMedia';
import { MicrophoneGate } from './microphoneGate';
import { RemoteAudio } from './remoteAudio';
import { RemoteVideo } from './remoteVideo';

export const encryptionSupported = () => isE2EESupported();

export const openMicrophone = async (deviceId?: string) => {
  try {
    return await createLocalAudioTrack({
      deviceId: deviceId || undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    });
  } catch (error) {
    const failure = MediaDeviceFailure.getFailure(error);
    if (failure === MediaDeviceFailure.PermissionDenied) throw new CallFailure('mic-denied');
    if (failure === MediaDeviceFailure.NotFound) throw new CallFailure('mic-missing');
    if (failure === MediaDeviceFailure.DeviceInUse) throw new CallFailure('mic-in-use');
    throw new CallFailure('mic-failed');
  }
};

export interface EngineEvents {
  patch: (patch: Partial<CallSession>) => void;
  video: (feeds: VideoFeed[]) => void;
  speakers: (identities: string[]) => void;
  call: (call: Call) => void;
  epoch: (epoch: number, roster: RosterEntry[]) => void;
  lost: (removed: boolean) => void;
}

export interface EngineOptions {
  call: Call;
  grant: CallGrant;
  userId: string;
  sessionId: string;
  identity: CallIdentity;
  microphone: LocalAudioTrack;
  muted: boolean;
  api: CallsApi;
  events: EngineEvents;
}

const REMOVED = new Set<DisconnectReason>([
  DisconnectReason.PARTICIPANT_REMOVED, DisconnectReason.ROOM_DELETED, DisconnectReason.DUPLICATE_IDENTITY, DisconnectReason.ROOM_CLOSED,
]);

const DEVICE_NAMES: Record<MediaDeviceKind, string> = { audioinput: 'Microphone', audiooutput: 'Speaker', videoinput: 'Camera' };

const deviceOptions = (devices: MediaDeviceInfo[]): DeviceOption[] => devices
  .filter((device) => device.deviceId && device.deviceId !== 'default' && device.deviceId !== 'communications')
  .map((device, index) => ({ id: device.deviceId, label: device.label || `${DEVICE_NAMES[device.kind]} ${index + 1}` }));

export class CallEngine {
  private readonly worker = new E2EEWorker();
  private readonly provider = new CallKeyProvider();
  private readonly room: Room;
  private readonly keys: KeyExchange;
  private readonly audio: RemoteAudio;
  private readonly gate: MicrophoneGate;
  private readonly ownIdentity: string;
  private readonly remoteVideo: RemoteVideo;
  private readonly local: LocalMedia;
  private published = false;
  private connected = false;
  private fallingBack = false;
  private closed = false;

  constructor(private readonly options: EngineOptions) {
    this.ownIdentity = participantIdentity(options.userId, options.sessionId);
    this.audio = new RemoteAudio(this.ownIdentity);
    this.remoteVideo = new RemoteVideo({ ownIdentity: this.ownIdentity, onChange: () => this.emitVideo() });
    this.gate = new MicrophoneGate(options.microphone, options.muted, () => { void this.recoverMicrophone(); });
    this.room = new Room({
      encryption: { keyProvider: this.provider, worker: this.worker },
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
      stopLocalTrackOnUnpublish: true,
      publishDefaults: { audioPreset: AudioPresets.speech, dtx: true, videoCodec: 'vp8' },
    });
    this.local = new LocalMedia({
      ownIdentity: this.ownIdentity,
      target: {
        publishTrack: (track, publish) => this.room.localParticipant.publishTrack(track, publish),
        unpublishTrack: (track, stop) => this.room.localParticipant.unpublishTrack(track, stop),
      },
      patch: (patch) => { if (!this.closed) options.events.patch(patch); },
      changed: () => this.emitVideo(),
      devicesChanged: () => { void this.refreshDevices(); },
    });
    this.keys = new KeyExchange({
      callId: options.call.id, userId: options.userId, sessionId: options.sessionId, identity: options.identity,
      sink: { setParticipantKey: (identity, key, epoch) => this.installKey(identity, key, epoch) }, api: options.api,
      onCall: options.events.call,
      onEpoch: (epoch, roster) => {
        void this.gate.setKeyReady(false);
        void this.local.setKeyReady(false);
        this.audio.setRoster(roster);
        this.remoteVideo.setRoster(roster);
        options.events.patch({ encryption: 'pending' });
        options.events.epoch(epoch, roster);
      },
      onOwnKey: () => { void this.onOwnKey(); },
      onFailure: () => options.events.patch({ encryption: 'failed' }),
    });
    this.bind();
  }

  private bind() {
    const { events } = this.options;
    this.room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        this.audio.add(track, publication, participant.identity);
        this.remoteVideo.add(track, publication, participant.identity);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        this.audio.remove(track);
        this.remoteVideo.remove(track);
      })
      .on(RoomEvent.TrackMuted, (_publication: TrackPublication, participant: Participant) => { if (!participant.isLocal) this.remoteVideo.refresh(); })
      .on(RoomEvent.TrackUnmuted, (_publication: TrackPublication, participant: Participant) => { if (!participant.isLocal) this.remoteVideo.refresh(); })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => events.speakers(speakers.map((speaker) => speaker.identity)))
      .on(RoomEvent.AudioPlaybackStatusChanged, () => events.patch({ audioBlocked: !this.room.canPlaybackAudio }))
      .on(RoomEvent.Reconnecting, () => events.patch({ phase: 'reconnecting' }))
      .on(RoomEvent.Reconnected, () => {
        events.patch({ phase: 'connected' });
        void this.catchUpKeys();
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: Participant) => {
        if (!participant.isLocal) return;
        events.patch({ quality: quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost ? 'poor' : 'good' });
      })
      .on(RoomEvent.MediaDevicesChanged, () => { void this.refreshDevices(); })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (this.closed || !this.connected || reason === DisconnectReason.CLIENT_INITIATED) return;
        this.connected = false;
        events.lost(reason !== undefined && REMOVED.has(reason));
      });
  }

  async connect() {
    const { call, grant, events } = this.options;
    if (!isE2EESupported()) throw new CallFailure('unsupported');
    await this.room.setE2EEEnabled(true);
    void this.keys.handleCall(call);
    await this.room.connect(grant.url, grant.token, { autoSubscribe: true });
    if (this.closed) return;
    this.connected = true;
    events.patch({ phase: 'connected', audioBlocked: !this.room.canPlaybackAudio });
    await this.catchUpKeys();
    await this.refreshDevices();
  }

  async catchUpKeys() {
    if (!this.closed) await this.keys.catchUp();
  }

  private async onOwnKey() {
    if (this.closed) return;
    this.options.events.patch({ encryption: 'ready' });
    if (!this.published) {
      this.published = true;
      try {
        await this.room.localParticipant.publishTrack(this.options.microphone, { source: Track.Source.Microphone });
      } catch {
        this.published = false;
        this.options.events.patch({ encryption: 'failed' });
        return;
      }
    }
    if (!this.keys.hasOwnKey()) return;
    await Promise.all([this.gate.setKeyReady(true), this.local.setKeyReady(true)]);
  }

  private async installKey(identity: string, key: Uint8Array, epoch: number) {
    await this.provider.setParticipantKey(identity, key, epoch);
    if (identity !== this.ownIdentity) this.remoteVideo.keyChanged(identity);
  }

  private emitVideo() {
    if (!this.closed) this.options.events.video([...this.local.feeds(), ...this.remoteVideo.feeds()]);
  }

  setCameraEnabled(on: boolean, deviceId?: string) {
    return this.local.setCameraEnabled(on, deviceId);
  }

  flipCamera() {
    return this.local.flipCamera();
  }

  startScreenShare() {
    return this.local.startScreenShare();
  }

  stopScreenShare() {
    return this.local.stopScreenShare();
  }

  handleCall(call: Call) {
    void this.keys.handleCall(call);
  }

  handleKeys(items: readonly CallKeyEnvelope[]) {
    void this.keys.handleEnvelopes(items);
  }

  async setMuted(muted: boolean) {
    await this.gate.setMuted(muted);
  }

  private async switchInput(deviceId: string) {
    const exact = !!deviceId;
    if (this.published) await this.room.switchActiveDevice('audioinput', deviceId || 'default', exact);
    else await this.options.microphone.setDeviceId(exact ? { exact: deviceId } : 'default');
  }

  async selectInput(deviceId: string) {
    try {
      await this.switchInput(deviceId);
    } catch (error) {
      if (deviceId) await this.switchInput('').catch(() => undefined);
      throw error;
    } finally {
      await this.gate.apply();
      void this.refreshDevices();
    }
  }

  private async recoverMicrophone() {
    if (this.closed) return;
    this.options.events.patch({ notice: 'mic-failed', input: '' });
    if (this.fallingBack) return;
    this.fallingBack = true;
    try {
      await this.options.microphone.setDeviceId('default').catch(() => undefined);
      await this.gate.apply();
    } finally {
      this.fallingBack = false;
    }
  }

  async selectOutput(deviceId: string) {
    await this.room.switchActiveDevice('audiooutput', deviceId, false);
  }

  async startAudio() {
    await this.room.startAudio();
    this.options.events.patch({ audioBlocked: !this.room.canPlaybackAudio });
  }

  private async refreshDevices() {
    const [inputs, outputs, cameras] = await Promise.all([
      Room.getLocalDevices('audioinput', false).catch(() => []),
      supportsAudioOutputSelection() ? Room.getLocalDevices('audiooutput', false).catch(() => []) : Promise.resolve([]),
      Room.getLocalDevices('videoinput', false).catch(() => []),
    ]);
    if (this.closed) return;
    this.options.events.patch({
      inputs: deviceOptions(inputs), outputs: deviceOptions(outputs), cameras: deviceOptions(cameras),
      outputSupported: supportsAudioOutputSelection() && outputs.length > 0,
      input: this.room.getActiveDevice('audioinput') ?? '', output: this.room.getActiveDevice('audiooutput') ?? '',
    });
  }

  async dispose() {
    if (this.closed) return;
    this.closed = true;
    this.keys.dispose();
    this.gate.dispose();
    this.remoteVideo.dispose();
    try {
      await this.room.disconnect(true);
    } finally {
      this.options.microphone.stop();
      this.local.release();
      this.room.removeAllListeners();
      this.audio.dispose();
      this.worker.terminate();
    }
  }
}
