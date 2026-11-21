import type { PinnedMessage, PinScope } from '@/entities/message';

export type PinChatContext =
  | { kind: 'direct'; peerName: string; personalOnly: boolean }
  | { kind: 'group'; role: string | null | undefined };

const STAFF_ROLES = new Set(['owner', 'admin', 'moderator']);

export const pinScopes = (context: PinChatContext): PinScope[] => {
  if (context.kind === 'direct') return context.personalOnly ? ['me'] : ['me', 'everyone'];
  return STAFF_ROLES.has(context.role ?? '') ? ['me', 'everyone'] : ['me'];
};

export const unpinScopes = (pin: PinnedMessage): PinScope[] => (
  pin.scope === 'everyone' && pin.can_unpin_for_everyone ? ['me', 'everyone'] : ['me']
);

export const asksBeforePin = (context: PinChatContext) => pinScopes(context).length > 1;

export const asksBeforeUnpin = (pin: PinnedMessage) => pin.scope === 'everyone';

export const nextPinIndex = (index: number, length: number) => (length ? (index + 1) % length : 0);
