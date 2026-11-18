import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { deliveryErrorText, unconfirmedSends, voiceVideoRefusal } from './unsentMessages';

describe('voice and video refusals', () => {
  it('names the setting when the server refuses a voice message or video', () => {
    const refused = { status: 403, body: { code: 'forbidden', errors: [{ field: 'voice_video_messages', message: 'not accepted' }] } };
    expect(voiceVideoRefusal(refused, en)).toBe(en.voiceVideoBlocked);
    expect(voiceVideoRefusal({ status: 403, body: { code: 'forbidden' } }, en)).toBeUndefined();
    expect(voiceVideoRefusal(new Error('network'), en)).toBeUndefined();
  });

  it('keeps the refusal text instead of the generic privacy text', () => {
    expect(deliveryErrorText(en.voiceVideoBlocked, en)).toBe(en.voiceVideoBlocked);
  });
});

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
