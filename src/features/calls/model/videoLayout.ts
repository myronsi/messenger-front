import type { Call } from '../api/callsApi';
import { participantIdentity } from './callState';
import type { VideoFeed, VideoState } from './videoStore';

export interface CallPerson {
  identity: string;
  userId: string;
  self: boolean;
}

export interface CallTile {
  id: string;
  kind: 'person' | 'screen';
  identity: string;
  userId: string;
  self: boolean;
  feed: VideoFeed | null;
  speaking: boolean;
}

export type CallLayout =
  | { mode: 'audio' }
  | { mode: 'grid'; tiles: CallTile[]; columns: number }
  | { mode: 'stage'; main: CallTile; strip: CallTile[]; shares: CallTile[] };

export type LayoutInput = Pick<VideoState, 'feeds' | 'speakers' | 'pinned' | 'share' | 'recentSpeaker'> & { people: readonly CallPerson[] };

export const callPeople = (call: Pick<Call, 'participants'> | null, userId: string | null, sessionId: string | null): CallPerson[] => (
  (call?.participants ?? []).flatMap((participant) => (participant.state === 'joined' && participant.session_id ? [{
    identity: participantIdentity(participant.user_id, participant.session_id),
    userId: participant.user_id,
    self: participant.user_id === userId && participant.session_id === sessionId,
  }] : []))
);

export const personTileId = (identity: string) => `person:${identity}`;
export const screenTileId = (feedId: string) => `screen:${feedId}`;

export const hasLiveVideo = (tile: CallTile) => !!tile.feed && !tile.feed.muted;

export const gridColumns = (count: number) => {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
};

export const stageColumns = (count: number, columns: number, narrow: boolean) => {
  if (!narrow) return columns;
  return count <= 2 ? 1 : 2;
};

export const callTiles = ({ people, feeds, speakers }: Pick<LayoutInput, 'people' | 'feeds' | 'speakers'>) => {
  const speaking = new Set(speakers);
  const ordered = [...people.filter((person) => !person.self), ...people.filter((person) => person.self)];
  const persons: CallTile[] = ordered.map((person) => ({
    id: personTileId(person.identity),
    kind: 'person',
    identity: person.identity,
    userId: person.userId,
    self: person.self,
    feed: feeds.find((feed) => feed.source === 'camera' && feed.identity === person.identity) ?? null,
    speaking: speaking.has(person.identity),
  }));
  const screens: CallTile[] = feeds
    .filter((feed) => feed.source === 'screen' && !feed.local)
    .flatMap((feed) => {
      const owner = people.find((person) => person.identity === feed.identity);
      if (!owner) return [];
      return [{
        id: screenTileId(feed.id), kind: 'screen' as const, identity: feed.identity, userId: owner.userId, self: owner.self, feed, speaking: false,
      }];
    });
  return { persons, screens };
};

export const callLayout = (input: LayoutInput): CallLayout => {
  const { persons, screens } = callTiles(input);
  if (screens.length === 0 && !persons.some(hasLiveVideo)) return { mode: 'audio' };
  const all = [...screens, ...persons];
  const pinned = input.pinned ? all.find((tile) => tile.id === input.pinned) : undefined;
  if (pinned) return { mode: 'stage', main: pinned, strip: all.filter((tile) => tile !== pinned), shares: screens };
  if (screens.length > 0) {
    const main = screens.find((tile) => tile.id === input.share) ?? screens[0];
    return { mode: 'stage', main, strip: persons, shares: screens };
  }
  return { mode: 'grid', tiles: persons, columns: gridColumns(persons.length) };
};

export const bubbleTile = (input: LayoutInput): CallTile | null => {
  const { persons, screens } = callTiles(input);
  const all = [...screens, ...persons];
  const pinned = input.pinned ? all.find((tile) => tile.id === input.pinned) : undefined;
  if (pinned && hasLiveVideo(pinned)) return pinned;
  const live = persons.filter(hasLiveVideo);
  const speaker = input.speakers.map((identity) => live.find((tile) => tile.identity === identity)).find((tile) => tile && !tile.self)
    ?? live.find((tile) => !tile.self && tile.identity === input.recentSpeaker);
  if (speaker) return speaker;
  const others = persons.filter((tile) => !tile.self);
  if (others.length === 1 && hasLiveVideo(others[0])) return others[0];
  return null;
};
