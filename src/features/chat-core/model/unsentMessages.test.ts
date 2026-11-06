import { describe, expect, it } from 'vitest';
import { unconfirmedSends } from './unsentMessages';

describe('unconfirmedSends', () => {
  it('resends sent messages that are still unconfirmed and not queued, and forgets confirmed ones', () => {
    const sent = new Map([
      ['a', { type: 'message', content: 'a', client_temp_id: 'a' }],
      ['b', { type: 'message', content: 'b', client_temp_id: 'b' }],
      ['c', { type: 'message', content: 'c', client_temp_id: 'c' }],
    ]);
    const resend = unconfirmedSends(sent, ['a', 'c'], [{ type: 'message', content: 'c', client_temp_id: 'c' }]);
    expect(resend).toEqual([{ type: 'message', content: 'a', client_temp_id: 'a' }]);
    expect([...sent.keys()]).toEqual(['a', 'c']);
  });
});
