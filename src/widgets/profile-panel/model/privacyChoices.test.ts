import { describe, expect, it } from 'vitest';
import { choiceOf, choicesFor, exceptionEffectsOf, modeFor } from './privacyChoices';

const avatarModes = ['everyone', 'shared_chats', 'everyone_except', 'nobody_except'];
const presenceModes = ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except'];

describe('privacyChoices', () => {
  it('shows the except modes as their plain choice', () => {
    expect(choiceOf('everyone_except')).toBe('everyone');
    expect(choiceOf('nobody_except')).toBe('nobody');
    expect(choiceOf('shared_chats')).toBe('shared_chats');
  });

  it('offers nobody even where the server only knows nobody_except', () => {
    expect(choicesFor(avatarModes)).toEqual(['everyone', 'shared_chats', 'nobody']);
    expect(choicesFor(['everyone', 'shared_chats', 'wait_approval'])).toEqual(['everyone', 'shared_chats', 'wait_approval']);
  });

  it('offers the exception lists that can change the outcome of a choice', () => {
    expect(exceptionEffectsOf('everyone')).toEqual(['deny']);
    expect(exceptionEffectsOf('nobody')).toEqual(['allow']);
    expect(exceptionEffectsOf('shared_chats')).toEqual(['deny']);
    expect(exceptionEffectsOf('wait_approval')).toEqual(['allow', 'deny']);
  });

  it('keeps existing exceptions when switching back to a choice', () => {
    expect(modeFor('everyone', avatarModes, 2)).toBe('everyone_except');
    expect(modeFor('everyone', avatarModes, 0)).toBe('everyone');
    expect(modeFor('nobody', presenceModes, 0)).toBe('nobody');
    expect(modeFor('nobody', presenceModes, 1)).toBe('nobody_except');
    expect(modeFor('nobody', avatarModes, 0)).toBe('nobody_except');
    expect(modeFor('shared_chats', avatarModes, 3)).toBe('shared_chats');
  });
});
