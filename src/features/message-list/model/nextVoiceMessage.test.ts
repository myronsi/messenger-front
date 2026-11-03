import { describe, expect, it } from 'vitest';
import type { Message } from '@/entities/message';
import { nextVoiceMessageId } from './nextVoiceMessage';

const voice = (id: string, extra: Partial<Message> = {}): Message => ({
  id, sender: 'a', timestamp: 't', type: 'file', read_by: [],
  content: { file_url: '/v.ogg', file_name: 'v.ogg', file_type: 'voice', file_size: 1 }, ...extra,
});
const text = (id: string): Message => ({ id, sender: 'a', timestamp: 't', type: 'message', content: 'hi', read_by: [] });

describe('nextVoiceMessageId', () => {
  it('continues with the next voice message, skipping text and deleted ones', () => {
    const messages = [voice('1'), text('2'), voice('3', { is_deleted: true }), voice('4')];
    expect(nextVoiceMessageId(messages, '1')).toBe('4');
  });

  it('stops after the last voice message', () => {
    expect(nextVoiceMessageId([voice('1'), text('2')], '1')).toBeNull();
  });
});
