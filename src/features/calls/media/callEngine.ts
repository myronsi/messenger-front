import {
  AudioPresets, ConnectionQuality, DisconnectReason, MediaDeviceFailure, Room, RoomEvent, Track, createLocalAudioTrack, isE2EESupported,
  supportsAudioOutputSelection, type LocalAudioTrack, type Participant, type RemoteTrack,
} from 'livekit-client';
import E2EEWorker from 'livekit-client/e2ee-worker?worker';
import type { Call, CallGrant, CallKeyEnvelope, CallsApi } from '../api/callsApi';
import type { CallIdentity } from '../crypto/identity';
import { CallFailure } from '../model/errors';
import type { CallSession, DeviceOption } from '../model/stores';
import type { RosterEntry } from '../model/callState';
import { CallKeyProvider } from './keyProvider';
import { KeyExchange } from './keyExchange';

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

const deviceOptions = (devices: MediaDeviceInfo[]): DeviceOption[] => devices
  .filter((device) => device.deviceId && device.deviceId !== 'default' && device.deviceId !== 'communications')
  .map((device, index) => ({ id: device.deviceId, label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${index + 1}` }));

export class CallEngine {
  private readonly worker = new E2EEWorker();
  private readonly provider = new CallKeyProvider();
  private readonly room: Room;
  private readonly keys: KeyExchange;
  private readonly audio = document.createElement('div');
  private readonly elements = new Map<RemoteTrack, HTMLMediaElement>();
  private muted: boolean;
  private published = false;
  private closed = false;

  constructor(private readonly options: EngineOptions) {
    this.muted = options.muted;
    this.room = new Room({
      encryption: { keyProvider: this.provider, worker: this.worker },
      adaptiveStream: false,
      dynacast: false,
      disconnectOnPageLeave: true,
      stopLocalTrackOnUnpublish: true,
      publishDefaults: { audioPreset: AudioPresets.speech, dtx: true },
    });
    this.keys = new KeyExchange({
      callId: options.call.id, userId: options.userId, sessionId: options.sessionId, identity: options.identity,
      sink: this.provider, api: options.api,
      onCall: options.events.call,
      onEpoch: (epoch, roster) => {
        void this.applyMicrophone();
        options.events.patch({ encryption: 'pending' });
        options.events.epoch(epoch, roster);
      },
      onOwnKey: () => { void this.onOwnKey(); },
      onFailure: () => options.events.patch({ encryption: 'failed' }),
    });
    this.audio.hidden = true;
    this.audio.dataset.callAudio = 'true';
    document.body.appendChild(this.audio);
    this.bind();
  }

  private bind() {
    const { events } = this.options;
    this.room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        this.elements.set(track, element);
        this.audio.appendChild(element);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
        this.elements.get(track)?.remove();
        this.elements.delete(track);
      })
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
        if (this.closed || reason === DisconnectReason.CLIENT_INITIATED) return;
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
    await this.applyMicrophone();
  }

  private async applyMicrophone() {
    const { microphone } = this.options;
    if (this.published) {
      if (this.muted) await microphone.mute().catch(() => undefined);
      else await microphone.unmute().catch(() => undefined);
    }
    microphone.mediaStreamTrack.enabled = !this.muted && this.keys.hasOwnKey();
  }

  handleCall(call: Call) {
    void this.keys.handleCall(call);
  }

  handleKeys(items: readonly CallKeyEnvelope[]) {
    void this.keys.handleEnvelopes(items);
  }

  async setMuted(muted: boolean) {
    this.muted = muted;
    await this.applyMicrophone();
  }

  async selectInput(deviceId: string) {
    await this.room.switchActiveDevice('audioinput', deviceId);
    await this.applyMicrophone();
  }

  async selectOutput(deviceId: string) {
    await this.room.switchActiveDevice('audiooutput', deviceId);
  }

  async startAudio() {
    await this.room.startAudio();
    this.options.events.patch({ audioBlocked: !this.room.canPlaybackAudio });
  }

  private async refreshDevices() {
    const [inputs, outputs] = await Promise.all([
      Room.getLocalDevices('audioinput', false).catch(() => []),
      supportsAudioOutputSelection() ? Room.getLocalDevices('audiooutput', false).catch(() => []) : Promise.resolve([]),
    ]);
    if (this.closed) return;
    this.options.events.patch({
      inputs: deviceOptions(inputs), outputs: deviceOptions(outputs), outputSupported: supportsAudioOutputSelection() && outputs.length > 0,
      input: this.room.getActiveDevice('audioinput') ?? '', output: this.room.getActiveDevice('audiooutput') ?? '',
    });
  }

  async dispose() {
    if (this.closed) return;
    this.closed = true;
    this.keys.dispose();
    try {
      await this.room.disconnect(true);
    } finally {
      this.options.microphone.stop();
      this.room.removeAllListeners();
      this.audio.querySelectorAll('audio').forEach((element) => { element.srcObject = null; });
      this.elements.clear();
      this.audio.remove();
      this.worker.terminate();
    }
  }
}
