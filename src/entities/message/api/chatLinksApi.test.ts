import { describe, expect, it } from 'vitest';
import { linkItem } from './chatLinksApi';

const message = (content: string) => ({
  id: '9', chat_id: '1', type: 'text', content, created_at: '2026-11-12T10:00:00Z',
  sender: { id: '2', username: 'ann', display_name: 'Ann' },
}) as unknown as Parameters<typeof linkItem>[0];

describe('linkItem', () => {
  it('takes the first web link of the text without trailing punctuation', () => {
    expect(linkItem(message('see https://example.com/a?b=1). thanks'))).toMatchObject({ url: 'https://example.com/a?b=1', sender: 'Ann', senderUsername: 'ann' });
  });

  it('turns a www link into https', () => {
    expect(linkItem(message('go to www.example.org now'))?.url).toBe('https://www.example.org');
  });

  it('skips messages without a link', () => {
    expect(linkItem(message('no link here'))).toBeNull();
  });
});
