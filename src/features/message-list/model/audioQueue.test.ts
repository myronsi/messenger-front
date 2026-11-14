import { describe, expect, it } from 'vitest';
import type { Message } from '@/entities/message';
import { audioQueueFor } from './audioQueue';

const voice = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'Ann', timestamp: 't', type: 'file', read_by: [],
  content: { file_url: '/v.ogg', file_name: 'v.ogg', file_type: 'voice', file_size: 1 }, ...extra,
});
const song = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'a', timestamp: 't', type: 'file', read_by: [],
  content: { file_url: `/${id}.mp3`, file_name: `${id}.mp3`, file_type: 'audio/mpeg', file_size: 1 }, ...extra,
});
const photo = (id: string): Message => ({
  id, sender: 'a', timestamp: 't', type: 'file', read_by: [],
  content: { file_url: '/p.jpg', file_name: 'p.jpg', file_type: 'image/jpeg', file_size: 1 },
});
const text = (id: string): Message => ({ id, sender: 'a', timestamp: 't', type: 'message', content: 'hi', read_by: [] });
const ids = (messages: Message[], id: string) => audioQueueFor(messages, id, 'Voice message')?.upcoming.map((track) => track.id);

describe('audioQueueFor', () => {
  it('queues the following voice messages, skipping text, songs and deleted ones', () => {
    const messages = [voice('1'), text('2'), song('3'), voice('4', { is_deleted: true }), voice('5')];
    expect(ids(messages, '1')).toEqual(['5']);
    expect(audioQueueFor(messages, '1', 'Voice message')?.track).toMatchObject({ kind: 'voice', title: 'Ann · Voice message' });
  });

  it('queues the following songs, skipping voice messages and other files', () => {
    const messages = [song('1'), voice('2'), photo('3'), song('4'), song('5')];
    expect(ids(messages, '1')).toEqual(['4', '5']);
    expect(audioQueueFor(messages, '1', 'Voice message')?.track).toMatchObject({ kind: 'music', title: '1.mp3' });
  });

  it('has nothing to queue after the last one of its kind or for other messages', () => {
    expect(ids([voice('1'), song('2')], '1')).toEqual([]);
    expect(audioQueueFor([text('1')], '1', 'Voice message')).toBeNull();
  });
});
