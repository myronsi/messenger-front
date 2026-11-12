import { describe, expect, it } from 'vitest';
import type { ServerEvent } from '@myronsi/messenger-api';
import { goServerEvent } from './goSocket';

const error = (clientTempId?: string) => ({
  type: 'error', event_id: '1', chat_id: '5', data: { code: 'validation_failed', message: 'data does not match the typing event' },
  ...(clientTempId === undefined ? {} : { client_temp_id: clientTempId }),
}) as ServerEvent;

describe('goServerEvent errors', () => {
  it('ignores an error without client_temp_id, which only answers a typing event', () => {
    expect(goServerEvent(error(), '5')).toBeNull();
  });

  it('still reports errors of messages and operations', () => {
    expect(goServerEvent(error('c-1'), '5')).toEqual({ type: 'error', message: 'data does not match the typing event', message_id: 'c-1', code: 'validation_failed' });
    expect(goServerEvent(error('op:1'), '5')).toEqual({ type: 'error', message: 'data does not match the typing event', operation_error: true });
  });
});
