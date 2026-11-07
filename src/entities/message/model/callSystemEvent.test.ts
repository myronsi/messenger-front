import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import { formatCallDuration } from '@/shared/lib/callDuration';
import type { SystemEventInfo } from './types';
import { systemEventText } from './systemEvents';

const me = (id?: string | number | null) => id === '1';
const callEvent = (outcome: NonNullable<SystemEventInfo['call']>['outcome'], actor = '2', duration: number | null = null, kind: 'direct' | 'group' = 'direct'): SystemEventInfo => ({
  kind: 'call', actor_id: actor, actor_name: 'Anna', call: { call_id: '10', kind, outcome, duration_seconds: duration },
});

describe('call system messages', () => {
  it('shows the outcome and the duration of a call', () => {
    expect(systemEventText(callEvent('completed', '2', 192), en, me)).toBe('Call · 3:12');
    expect(systemEventText(callEvent('completed', '2', 3725, 'group'), en, me)).toBe('Group call · 1:02:05');
    expect(systemEventText(callEvent('completed', '2', 59), ru, me)).toBe('Звонок · 0:59');
  });

  it('tells the caller and the callee apart', () => {
    expect(systemEventText(callEvent('missed'), en, me)).toBe('Missed call');
    expect(systemEventText(callEvent('missed', '1'), en, me)).toBe('No answer');
    expect(systemEventText(callEvent('declined'), en, me)).toBe('You declined the call');
    expect(systemEventText(callEvent('declined', '1'), en, me)).toBe('Call declined');
    expect(systemEventText(callEvent('cancelled', '1'), en, me)).toBe('Cancelled call');
    expect(systemEventText(callEvent('cancelled'), en, me)).toBe('Missed call');
    expect(systemEventText(callEvent('failed'), en, me)).toBe('Call failed');
  });

  it('formats durations', () => {
    expect(formatCallDuration(0)).toBe('0:00');
    expect(formatCallDuration(-5)).toBe('0:00');
    expect(formatCallDuration(Number.NaN)).toBe('0:00');
    expect(formatCallDuration(3600)).toBe('1:00:00');
  });
});
