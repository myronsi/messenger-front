import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Browser } from '@playwright/test';

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

export const livekitConfig = () => {
  const key = process.env.E2E_LIVEKIT_KEY;
  const secret = process.env.E2E_LIVEKIT_SECRET;
  if (!key || !secret) return null;
  return {
    key, secret,
    wsUrl: process.env.E2E_LIVEKIT_URL ?? 'ws://localhost:7880',
    httpUrl: (process.env.E2E_LIVEKIT_URL ?? 'ws://localhost:7880').replace(/^ws/, 'http'),
  };
};

export const mintLivekitToken = (claims: Record<string, unknown>, ttlSeconds = 300) => {
  const config = livekitConfig()!;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: config.key, nbf: now - 5, exp: now + ttlSeconds, jti: randomUUID(), ...claims }));
  const signature = createHmac('sha256', config.secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
};

export interface LivekitParticipant {
  identity: string;
  tracks?: Array<{ sid: string; type?: string; source?: string; encryption?: string; muted?: boolean }>;
}

export const livekitParticipants = async (room: string) => {
  const config = livekitConfig()!;
  const token = mintLivekitToken({ video: { roomAdmin: true, roomList: true, room } }, 60);
  const response = await fetch(`${config.httpUrl}/twirp/livekit.RoomService/ListParticipants`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ room }),
  });
  if (response.status === 404) return [];
  const body = await response.json() as { participants?: LivekitParticipant[] };
  return body.participants ?? [];
};

export const roomName = (callId: string) => `call-${callId}`;
export interface EavesdropResult {
  mode: 'plain' | 'wrong-key';
  connectedMs: number;
  removedAfterMs: number | null;
  disconnectReason: number | null;
  tracks: Array<{ participant: string; publicationEncrypted: boolean; participantEncrypted: boolean }>;
  peakLevel: number;
  packetsReceived: number;
  bytesReceived: number;
  concealedSamples: number;
  totalSamplesReceived: number;
  encryptionErrors: string[];
  connectError: string | null;
  hidden: boolean;
}

export const eavesdrop = async (browser: Browser, callId: string, mode: 'plain' | 'wrong-key', hidden = false): Promise<EavesdropResult> => {
  const config = livekitConfig()!;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('/version.json');
    await page.addScriptTag({ path: path.resolve('node_modules/livekit-client/dist/livekit-client.umd.js') });
    const workerCode = readFileSync(path.resolve('node_modules/livekit-client/dist/livekit-client.e2ee.worker.js'), 'utf8');
    const token = mintLivekitToken({
      sub: `eavesdropper-${mode}-${randomUUID().slice(0, 8)}`,
      video: { room: roomName(callId), roomJoin: true, canSubscribe: true, canPublish: false, canPublishData: false, hidden },
    });
    return await page.evaluate(async ({ url, token: grant, code, wrongKey, isHidden }) => {
      type Lk = typeof import('livekit-client');
      const LK = (window as unknown as { LivekitClient: Lk }).LivekitClient;
      const result = {
        mode: wrongKey ? 'wrong-key' as const : 'plain' as const, connectedMs: 0, removedAfterMs: null as number | null,
        disconnectReason: null as number | null, tracks: [] as EavesdropResult['tracks'], peakLevel: 0, packetsReceived: 0, bytesReceived: 0,
        concealedSamples: 0, totalSamplesReceived: 0, encryptionErrors: [] as string[],
        connectError: null as string | null, hidden: isHidden,
      };
      let room: InstanceType<Lk['Room']>;
      if (wrongKey) {
        class WrongKeys extends LK.BaseKeyProvider {
          async fill() {
            for (let index = 0; index < 16; index += 1) {
              const material = await LK.createKeyMaterialFromBuffer(crypto.getRandomValues(new Uint8Array(32)).buffer);
              this.onSetEncryptionKey(material, undefined, index);
            }
          }
        }
        const keyProvider = new WrongKeys({ sharedKey: true, ratchetWindowSize: 0, keyringSize: 16 });
        const worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
        room = new LK.Room({ encryption: { keyProvider, worker } });
        await room.setE2EEEnabled(true);
        await keyProvider.fill();
      } else {
        room = new LK.Room();
      }
      const audio = new AudioContext();
      await audio.resume();
      const meters: Array<{ analyser: AnalyserNode; samples: Float32Array<ArrayBuffer> }> = [];
      const started = performance.now();
      room.on(LK.RoomEvent.EncryptionError, (error: Error) => { if (result.encryptionErrors.length < 5) result.encryptionErrors.push(error.message); });
      room.on(LK.RoomEvent.Disconnected, (reason?: number) => {
        result.disconnectReason = reason ?? null;
        result.removedAfterMs = Math.round(performance.now() - started);
      });
      room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        result.tracks.push({ participant: participant.identity, publicationEncrypted: publication.isEncrypted, participantEncrypted: participant.isEncrypted });
        const element = track.attach();
        document.body.appendChild(element);
        const analyser = audio.createAnalyser();
        audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])).connect(analyser);
        meters.push({ analyser, samples: new Float32Array(analyser.fftSize) });
      });
      try {
        await room.connect(url, grant, { autoSubscribe: true });
      } catch (error) {
        result.connectError = String(error);
        result.removedAfterMs ??= Math.round(performance.now() - started);
        await audio.close();
        return result;
      }
      result.connectedMs = Math.round(performance.now() - started);
      const pcs = () => {
        type Transport = { pc?: RTCPeerConnection };
        const { engine } = room as unknown as { engine: { pcManager?: { subscriber?: Transport; publisher?: Transport } } };
        return [engine.pcManager?.subscriber?.pc, engine.pcManager?.publisher?.pc].filter((pc): pc is RTCPeerConnection => !!pc);
      };
      const collect = async () => {
        let packets = 0;
        let bytes = 0;
        let concealed = 0;
        let total = 0;
        for (const pc of pcs()) {
          const stats = await pc.getStats().catch(() => null);
          stats?.forEach((report) => {
            if (report.type !== 'inbound-rtp' || report.kind !== 'audio') return;
            packets += report.packetsReceived ?? 0;
            bytes += report.bytesReceived ?? 0;
            concealed += report.concealedSamples ?? 0;
            total += report.totalSamplesReceived ?? 0;
          });
        }
        if (packets >= result.packetsReceived) {
          result.packetsReceived = packets;
          result.bytesReceived = bytes;
          result.concealedSamples = concealed;
          result.totalSamplesReceived = total;
        }
      };
      for (let round = 0; round < 80 && room.state !== 'disconnected'; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        for (const meter of meters) {
          meter.analyser.getFloatTimeDomainData(meter.samples);
          for (const sample of meter.samples) result.peakLevel = Math.max(result.peakLevel, Math.abs(sample));
        }
        if (round % 10 === 0) await collect();
      }
      await collect();
      result.peakLevel = Number(result.peakLevel.toFixed(4));
      await room.disconnect();
      await audio.close();
      return result;
    }, { url: config.wsUrl, token, code: workerCode, wrongKey: mode === 'wrong-key', isHidden: hidden });
  } finally {
    await context.close();
  }
};