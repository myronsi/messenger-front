import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { de } from '@/shared/lang/de';
import { ru } from '@/shared/lang/ru';
import { es } from '@/shared/lang/es';
import type { EntityId } from '@/shared/api/entityId';
import { systemEventText } from './systemEvents';
import type { SystemEventInfo } from './types';

const me = (id?: EntityId | null) => id === '1';
const event = (overrides: Partial<SystemEventInfo>): SystemEventInfo => ({
  kind: 'message_pinned', actor_id: '2', actor_name: 'Anna', message_id: '50', snippet: 'Meeting at 5', message_type: 'text', ...overrides,
});

describe('pin system lines', () => {
  it('quotes the snippet and names the actor', () => {
    expect(systemEventText(event({}), en, me)).toBe('Anna pinned "Meeting at 5"');
    expect(systemEventText(event({ kind: 'message_unpinned' }), en, me)).toBe('Anna unpinned "Meeting at 5"');
    expect(systemEventText(event({ actor_id: '1' }), en, me)).toBe('You pinned "Meeting at 5"');
    expect(systemEventText(event({ kind: 'message_unpinned', actor_id: '1' }), en, me)).toBe('You unpinned "Meeting at 5"');
  });

  it('names a message without text by its kind', () => {
    expect(systemEventText(event({ snippet: '', message_type: 'voice' }), en, me)).toBe('Anna pinned a voice message');
    expect(systemEventText(event({ snippet: '', message_type: 'sticker', actor_id: '1' }), en, me)).toBe('You pinned a sticker');
    expect(systemEventText(event({ kind: 'message_unpinned', snippet: '', message_type: 'file' }), en, me)).toBe('Anna unpinned a message');
  });

  it('has the line in every language', () => {
    expect(systemEventText(event({}), de, me)).toBe('Anna hat „Meeting at 5“ angeheftet');
    expect(systemEventText(event({}), ru, me)).toBe('Anna закрепил(а) «Meeting at 5»');
    expect(systemEventText(event({ actor_id: '1' }), ru, me)).toBe('Вы закрепили «Meeting at 5»');
    expect(systemEventText(event({ kind: 'message_unpinned' }), es, me)).toBe('Anna desfijó «Meeting at 5»');
    expect(systemEventText(event({ snippet: '', message_type: 'voice' }), de, me)).toBe('Anna hat eine Sprachnachricht angeheftet');
  });

  it('falls back when the pinner account is gone', () => {
    expect(systemEventText(event({ actor_id: null, actor_name: '' }), en, me)).toBe('Someone pinned "Meeting at 5"');
  });
});
