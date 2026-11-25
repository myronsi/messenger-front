import { describe, expect, it } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { goServerEvent } from './goSocket';

const error = (clientTempId?: string) => ({
  type: 'error', event_id: '1', chat_id: '5', data: { code: 'validation_failed', message: 'data does not match the typing event' },
  ...(clientTempId === undefined ? {} : { client_temp_id: clientTempId }),
}) as ServerEvent;

describe('goServerEvent errors', () => {
  it('keeps the field that caused a refused send', () => {
    const refused = { type: 'error', event_id: '1', chat_id: '5', client_temp_id: 'v-1', data: { code: 'forbidden', message: 'no', field: 'voice_video_messages' } };
    expect(goServerEvent(refused as ServerEvent, '5')).toMatchObject({ type: 'error', message_id: 'v-1', field: 'voice_video_messages' });
  });

  it('ignores an error without client_temp_id, which only answers a typing event', () => {
    expect(goServerEvent(error(), '5')).toBeNull();
  });

  it('still reports errors of messages and operations', () => {
    expect(goServerEvent(error('c-1'), '5')).toEqual({ type: 'error', message: 'data does not match the typing event', message_id: 'c-1', code: 'validation_failed' });
    expect(goServerEvent(error('op:1'), '5')).toEqual({ type: 'error', message: 'data does not match the typing event', operation_error: true, code: 'validation_failed' });
  });
});

describe('goServerEvent poll updates', () => {
  it('passes the new poll of the message on', () => {
    const poll = {
      question: 'Lunch?', options: [{ text: 'Pizza', voter_count: 1 }], multiple_answers: false, anonymous: true, quiz: false, explanation: null,
      close_at: null, closed_at: null, total_voters: 1, my_votes: [], can_close: false, version: 2,
    };
    const event = { type: 'poll_updated', event_id: '1', chat_id: '5', data: { message_id: '30', poll } } as ServerEvent;
    expect(goServerEvent(event, '5')).toEqual({ type: 'poll_updated', message_id: '30', poll });
    expect(goServerEvent(event, '6')).toBeNull();
  });
});
