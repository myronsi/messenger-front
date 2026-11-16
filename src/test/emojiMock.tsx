import { vi } from 'vitest';

export const emojiEntityMock = () => ({
  useEmojiPacks: () => [],
  useRecentEmoji: () => [],
  rememberEmoji: vi.fn(),
  openEmojiPacks: vi.fn(),
  useShortcodeEncoder: () => (text: string) => text,
  ReactionEmoji: ({ reaction }: { reaction: string }) => <>{reaction}</>,
});
