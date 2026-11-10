import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import { getTypingLabel } from './typingLabel';

const words = en.typingStatus;

describe('getTypingLabel', () => {
  it('shows the short form in a direct chat', () => {
    expect(getTypingLabel([{ action: 'typing', name: 'Anna' }], false, words, 'en')).toBe('typing…');
    expect(getTypingLabel([{ action: 'recording_voice' }], false, words, 'en')).toBe('recording voice…');
  });

  it('names one or two members of a group', () => {
    expect(getTypingLabel([{ action: 'typing', name: 'Anna' }], true, words, 'en')).toBe('Anna is typing…');
    expect(getTypingLabel([{ action: 'recording_voice', name: 'Anna' }], true, words, 'en')).toBe('Anna is recording voice…');
    expect(getTypingLabel([{ action: 'typing', name: 'Anna' }, { action: 'typing', name: 'Ben' }], true, words, 'en'))
      .toBe('Anna and Ben are typing…');
  });

  it('falls back while names are loading and counts three or more', () => {
    expect(getTypingLabel([{ action: 'typing' }], true, words, 'en')).toBe('typing…');
    expect(getTypingLabel([{ action: 'typing', name: 'Anna' }, { action: 'typing' }], true, words, 'en')).toBe('2 people are typing…');
    const three = [{ action: 'typing' as const }, { action: 'typing' as const }, { action: 'recording_voice' as const }];
    expect(getTypingLabel(three, true, words, 'en')).toBe('3 people are typing…');
    expect(getTypingLabel(three, true, ru.typingStatus, 'ru')).toBe('3 человека печатают…');
  });

  it('is empty when nobody types', () => {
    expect(getTypingLabel([], true, words, 'en')).toBe('');
  });
});
