import { describe, expect, it } from 'vitest';
import { notificationSettings } from '@/shared/lang/en/notificationSettings';
import { describeMessage } from './alerts';

const words = notificationSettings.notificationSettings;

describe('in-app alert text', () => {
  it('names polls, contacts and places with their own label', () => {
    expect(describeMessage({ kind: 'poll', body: 'Lunch?' }, words)).toBe('📊 Lunch?');
    expect(describeMessage({ kind: 'contact', body: '' }, words)).toBe('👤 Contact');
    expect(describeMessage({ kind: 'contact', body: 'Ben' }, words)).toBe('👤 Ben');
    expect(describeMessage({ kind: 'location', body: '' }, words)).toBe('📍 Location');
    expect(describeMessage({ kind: 'location', body: '📍 Office https://www.openstreetmap.org/?mlat=1' }, words)).toBe('📍 Location: Office');
  });
});
