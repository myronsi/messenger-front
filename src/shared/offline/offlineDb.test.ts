import { describe, expect, it } from 'vitest';
import { deriveOfflineKeys } from './cipher';
import { memoryBackend } from './memoryBackend';
import { createOfflineDb } from './offlineDb';
import { indexWords, matchesQuery } from './searchWords';

const serverKey = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const message = (id: string, content: string) => ({ id, content, sender: 'alice' });

const setup = async () => {
  let clock = 1000;
  const backend = memoryBackend();
  const db = createOfflineDb(backend, await deriveOfflineKeys(serverKey), () => clock);
  return { backend, db, tick: () => { clock += 1; } };
};

describe('offline message database', () => {
  it('reads pages in id order, even across id lengths', async () => {
    const { db } = await setup();
    await db.storeMessages('1', [message('99', 'a'), message('1000', 'b'), message('100', 'c'), message('7', 'd')]);
    await db.storeMessages('2', [message('500', 'other chat')]);
    expect((await db.readLatest<{ id: string }>('1', 2)).map((m) => m.id)).toEqual(['100', '1000']);
    expect((await db.readOlder<{ id: string }>('1', '100', 5)).map((m) => m.id)).toEqual(['7', '99']);
    expect((await db.readNewer<{ id: string }>('1', '99', 5)).map((m) => m.id)).toEqual(['100', '1000']);
    expect(await db.newestId('1')).toBe('1000');
    expect(await db.newestId('3')).toBeNull();
  });

  it('applies edits only to stored messages, deletions and cleared histories', async () => {
    const { db, backend } = await setup();
    await db.storeMessages('1', [message('1', 'one'), message('2', 'two'), message('3', 'three')]);
    await db.updateMessage('1', message('2', 'two, edited'));
    await db.updateMessage('1', message('9', 'never loaded'));
    expect((await db.readLatest<{ content: string }>('1', 10)).map((m) => m.content)).toEqual(['one', 'two, edited', 'three']);
    await db.removeMessages('1', ['3']);
    await db.clearUpTo('1', '1');
    expect((await db.readLatest<{ id: string }>('1', 10)).map((m) => m.id)).toEqual(['2']);
    await db.dropChat('1');
    expect(backend.messageCount()).toBe(0);
  });

  it('finds messages by word prefixes without storing the words', async () => {
    const { db, backend } = await setup();
    await db.storeMessages('1', [message('1', 'Meeting at five o\'clock'), message('2', 'meetup tomorrow'), message('3', 'Привет, мир')]);
    await db.storeMessages('2', [message('4', 'meeting room booked')]);
    const ids = async (query: string, chatId?: string) => (await db.search<{ id: string }>(query, chatId)).map((hit) => hit.message.id);
    expect(await ids('meet')).toEqual(['4', '2', '1']);
    expect(await ids('meeting five')).toEqual(['1']);
    expect(await ids('meet', '1')).toEqual(['2', '1']);
    expect(await ids('мир')).toEqual(['3']);
    expect(await ids('x')).toEqual([]);
    const stored = await backend.getMessage('1', '00000000000000000001');
    expect(stored?.tokens.join(' ')).not.toContain('meet');
  });

  it('keeps media encrypted and drops the least used media first, then the least recent chats', async () => {
    const { db, tick } = await setup();
    await db.storeMessages('old', [message('1', 'x'.repeat(2000))]);
    tick();
    await db.openedChat('new');
    await db.storeMessages('new', [message('2', 'y'.repeat(2000))]);
    await db.saveMedia('/a', new Blob(['a'.repeat(3000)], { type: 'image/webp' }));
    tick();
    await db.saveMedia('/b', new Blob(['b'.repeat(3000)], { type: 'image/webp' }));
    tick();
    const restored = await db.loadMedia('/a');
    expect(restored?.fresh).toBe(true);
    expect(restored?.blob.type).toBe('image/webp');
    expect(await restored?.blob.text()).toBe('a'.repeat(3000));
    await db.saveMedia('/stale', new Blob(['s']), 0);
    expect((await db.loadMedia('/stale'))?.fresh).toBe(false);
    await db.enforceCap(null);

    const { total } = await db.usage();
    await db.enforceCap(total - 1);
    expect(await db.loadMedia('/b')).toBeUndefined();
    expect(await db.loadMedia('/a')).toBeDefined();
    await db.enforceCap(4000);
    expect(await db.readLatest('old', 5)).toEqual([]);
    expect(await db.readLatest('new', 5)).toHaveLength(1);
    await db.enforceCap(null);
    expect((await db.usage()).total).toBeLessThanOrEqual(4000);
  });
});

describe('search words', () => {
  it('indexes prefixes and matches every query word', () => {
    expect(indexWords('Hello, World')).toEqual(expect.arrayContaining(['he', 'hello', 'wo', 'world']));
    expect(matchesQuery('Hello, World', 'wor hel')).toBe(true);
    expect(matchesQuery('Hello, World', 'word')).toBe(false);
  });
});
