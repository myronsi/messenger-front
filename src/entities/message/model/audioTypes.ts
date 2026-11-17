import type { EntityId } from '@/shared/api/entityId';

export type AudioTrackKind = 'voice' | 'music';

export interface AudioTrack {
  id: EntityId;
  src: string;
  title: string;
  kind: AudioTrackKind;
  duration?: number;
  artist?: string;
  cover?: string;
  origin?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioPlayerState {
  track: AudioTrack | null;
  list: AudioTrack[];
  index: number;
  playing: boolean;
  loading: boolean;
  error: boolean;
  time: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

export const IDLE: AudioPlayerState = {
  track: null, list: [], index: -1, playing: false, loading: false, error: false, time: 0, duration: 0, shuffle: false, repeat: 'off',
};
