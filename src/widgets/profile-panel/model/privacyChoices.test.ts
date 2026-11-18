import { describe, expect, it } from 'vitest';
import { choiceOf, choicesFor, exceptionEffectsOf } from './privacyChoices';

describe('privacyChoices', () => {
  it('shows the old except modes as their plain choice', () => {
    expect(choiceOf('everyone_except')).toBe('everyone');
    expect(choiceOf('nobody_except')).toBe('nobody');
    expect(choiceOf('shared_chats')).toBe('shared_chats');
  });

  it('offers the choices of a setting in one order', () => {
    expect(choicesFor(['nobody', 'shared_chats', 'everyone'])).toEqual(['everyone', 'shared_chats', 'nobody']);
    expect(choicesFor(['everyone', 'shared_chats', 'nobody', 'wait_approval'])).toEqual(['everyone', 'shared_chats', 'nobody', 'wait_approval']);
    expect(choicesFor(['everyone', 'nobody'])).toEqual(['everyone', 'nobody']);
  });

  it('offers the exception lists that can change the outcome of a choice', () => {
    expect(exceptionEffectsOf('everyone')).toEqual(['deny']);
    expect(exceptionEffectsOf('nobody')).toEqual(['allow']);
    expect(exceptionEffectsOf('shared_chats')).toEqual(['deny']);
    expect(exceptionEffectsOf('wait_approval')).toEqual(['allow', 'deny']);
  });
});
