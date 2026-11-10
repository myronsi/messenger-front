import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { es } from '@/shared/lang/es';
import { ru } from '@/shared/lang/ru';
import { participantCountLabel } from './groupChatUtils';

describe('participantCountLabel', () => {
  it('uses lowercase English plural forms', () => {
    expect(participantCountLabel(1, en, 'en')).toBe('1 participant');
    expect(participantCountLabel(4, en, 'en')).toBe('4 participants');
    expect(participantCountLabel(0, en, 'en')).toBe('0 participants');
  });

  it('uses the Russian one, few and many forms', () => {
    expect(participantCountLabel(1, ru, 'ru')).toBe('1 участник');
    expect(participantCountLabel(21, ru, 'ru')).toBe('21 участник');
    expect(participantCountLabel(3, ru, 'ru')).toBe('3 участника');
    expect(participantCountLabel(5, ru, 'ru')).toBe('5 участников');
    expect(participantCountLabel(11, ru, 'ru')).toBe('11 участников');
  });

  it('uses the Spanish singular and plural', () => {
    expect(participantCountLabel(1, es, 'es')).toBe('1 participante');
    expect(participantCountLabel(7, es, 'es')).toBe('7 participantes');
  });

  it('falls back to the other form and to the bare number', () => {
    expect(participantCountLabel(2, { participantsCountOther: '{count} people' }, 'ru')).toBe('2 people');
    expect(participantCountLabel(2, {}, 'en')).toBe('2');
  });
});
