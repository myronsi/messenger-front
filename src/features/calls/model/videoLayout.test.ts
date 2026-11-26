import { describe, expect, it } from 'vitest';
import { bubbleTile, callLayout, callPeople, gridColumns, stageColumns, type CallPerson, type LayoutInput } from './videoLayout';
import type { VideoFeed } from './videoStore';

const handle = { attach: (element: HTMLMediaElement) => element, detach: () => undefined };

const person = (id: string, self = false): CallPerson => ({ identity: `${id}:s-${id}`, userId: id, self });

const camera = (id: string, extra: Partial<VideoFeed> = {}): VideoFeed => ({
  id: `${id}:s-${id}/cam`, identity: `${id}:s-${id}`, source: 'camera', local: false, muted: false, mirrored: false, handle, ...extra,
});

const share = (id: string, extra: Partial<VideoFeed> = {}): VideoFeed => ({
  id: `${id}:s-${id}/screen`, identity: `${id}:s-${id}`, source: 'screen', local: false, muted: false, mirrored: false, handle, ...extra,
});

const input = (patch: Partial<LayoutInput>): LayoutInput => ({
  people: [person('1', true), person('2'), person('3')], feeds: [], speakers: [], recentSpeaker: null, pinned: null, share: null, ...patch,
});

describe('call video layout', () => {
  it('stays the audio view while nobody sends video', () => {
    expect(callLayout(input({}))).toEqual({ mode: 'audio' });
    expect(callLayout(input({ feeds: [camera('2', { muted: true })] }))).toEqual({ mode: 'audio' });
  });

  it('puts everyone in a grid with the own tile last once a camera is on', () => {
    const layout = callLayout(input({ feeds: [camera('1', { local: true, mirrored: true })], speakers: ['2:s-2'] }));
    expect(layout.mode).toBe('grid');
    if (layout.mode !== 'grid') return;
    expect(layout.tiles.map((tile) => [tile.userId, tile.self, !!tile.feed, tile.speaking])).toEqual([
      ['2', false, false, true], ['3', false, false, false], ['1', true, true, false],
    ]);
    expect(layout.columns).toBe(2);
  });

  it('sizes the grid by the number of tiles and narrows it on phones', () => {
    expect([1, 2, 4, 5, 9, 10].map(gridColumns)).toEqual([1, 2, 2, 3, 3, 4]);
    expect(stageColumns(2, 2, true)).toBe(1);
    expect(stageColumns(6, 3, true)).toBe(2);
    expect(stageColumns(6, 3, false)).toBe(3);
  });

  it('puts a screen share on the stage with the people in the strip', () => {
    const layout = callLayout(input({ feeds: [share('2'), camera('3')] }));
    expect(layout.mode).toBe('stage');
    if (layout.mode !== 'stage') return;
    expect(layout.main).toMatchObject({ kind: 'screen', userId: '2', id: 'screen:2:s-2/screen' });
    expect(layout.strip.map((tile) => tile.id)).toEqual(['person:2:s-2', 'person:3:s-3', 'person:1:s-1']);
    expect(layout.shares).toHaveLength(1);
  });

  it('lets the viewer switch between several shares and falls back when the chosen one ends', () => {
    const feeds = [share('2'), share('3')];
    const first = callLayout(input({ feeds }));
    const chosen = callLayout(input({ feeds, share: 'screen:3:s-3/screen' }));
    const gone = callLayout(input({ feeds: [share('2')], share: 'screen:3:s-3/screen' }));
    expect(first.mode === 'stage' && first.main.userId).toBe('2');
    expect(chosen.mode === 'stage' && [chosen.main.userId, chosen.shares.length]).toEqual(['3', 2]);
    expect(gone.mode === 'stage' && gone.main.userId).toBe('2');
  });

  it('puts a pinned tile on the stage and moves every other tile to the strip', () => {
    const layout = callLayout(input({ feeds: [share('2'), camera('3')], pinned: 'person:3:s-3' }));
    expect(layout.mode).toBe('stage');
    if (layout.mode !== 'stage') return;
    expect(layout.main.id).toBe('person:3:s-3');
    expect(layout.strip.map((tile) => tile.id)).toEqual(['screen:2:s-2/screen', 'person:2:s-2', 'person:1:s-1']);
  });

  it('ignores a pin on a tile that left the call', () => {
    expect(callLayout(input({ feeds: [camera('2')], pinned: 'person:9:s-9' })).mode).toBe('grid');
  });

  it('never shows the own screen share or a share from someone off the roster', () => {
    const layout = callLayout(input({ feeds: [share('1', { local: true }), share('9')] }));
    expect(layout).toEqual({ mode: 'audio' });
  });

  it('shows the pinned or speaking person in the minimized call, else nothing', () => {
    const feeds = [camera('2'), camera('3'), camera('1', { local: true })];
    expect(bubbleTile(input({ feeds, pinned: 'person:3:s-3', speakers: ['2:s-2'] }))?.userId).toBe('3');
    expect(bubbleTile(input({ feeds, speakers: ['1:s-1', '2:s-2'] }))?.userId).toBe('2');
    expect(bubbleTile(input({ feeds, recentSpeaker: '3:s-3' }))?.userId).toBe('3');
    expect(bubbleTile(input({ feeds }))).toBeNull();
    expect(bubbleTile(input({ people: [person('1', true), person('2')], feeds: [camera('2')] }))?.userId).toBe('2');
    expect(bubbleTile(input({ feeds: [camera('2', { muted: true })], speakers: ['2:s-2'] }))).toBeNull();
  });

  it('builds the people from the joined sessions of the call', () => {
    const people = callPeople({
      participants: [
        { user_id: '1', state: 'joined', session_id: 's-1', identity_key: null, joined_at: null },
        { user_id: '2', state: 'ringing', session_id: null, identity_key: null, joined_at: null },
        { user_id: '3', state: 'joined', session_id: 's-3', identity_key: null, joined_at: null },
      ],
    }, '1', 's-1');
    expect(people).toEqual([{ identity: '1:s-1', userId: '1', self: true }, { identity: '3:s-3', userId: '3', self: false }]);
  });
});
