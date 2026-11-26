import { describe, expect, it } from 'vitest';
import {
  appearanceFromWire, settingsFromWire, settingsPatchToWire, wallpaperFromWire, wallpapersFromWire, wallpaperToWire,
} from './wireFormat';

const attachment = { id: 'a1', kind: 'image', filename: 'bg.webp', content_type: 'image/webp', size: 10, url: '/api/v2/attachments/a1/content' } as const;

describe('client settings wire format', () => {
  it('maps appearance and lists both ways and falls back for unknown values', () => {
    expect(appearanceFromWire(null)).toBeNull();
    expect(appearanceFromWire({ accent: 'unknown', font_size: 18, density: 'compact', corners: 'round' }))
      .toEqual({ accent: 'blue', fontSize: 18, density: 'compact', corners: 'round' });
    expect(settingsFromWire({
      appearance: null, recent_emoji: ['😀', '😀', '🔥'], recent_reactions: ['👍'], version: 3, updated_at: null,
    })).toEqual({ appearance: null, recentEmoji: ['😀', '🔥'], recentReactions: ['👍'], version: 3 });
    expect(settingsPatchToWire({ appearance: { accent: 'teal', fontSize: 15, density: 'comfortable', corners: 'sharp' }, recentEmoji: ['a'] }))
      .toEqual({ appearance: { accent: 'teal', font_size: 15, density: 'comfortable', corners: 'sharp' }, recent_emoji: ['a'] });
  });

  it('maps backgrounds both ways', () => {
    expect(wallpaperFromWire({ kind: 'preset', preset: 'grid' })).toEqual({ kind: 'builtin', preset: 'grid' });
    expect(wallpaperFromWire({ kind: 'preset', preset: 'sunset' })).toEqual({ kind: 'builtin', preset: 'plain' });
    expect(wallpaperFromWire({ kind: 'color', colors: ['#112233'] })).toEqual({ kind: 'color', colors: ['#112233'], pattern: 'none' });
    expect(wallpaperFromWire({ kind: 'media', attachment, blur: 5, dim: 25 }))
      .toEqual({ kind: 'photo', photo: { id: 'a1', url: attachment.url }, blur: 5, dim: 25 });
    expect(wallpaperFromWire({ kind: 'media' })).toBeNull();
    expect(wallpaperToWire({ kind: 'builtin', preset: 'dots' })).toEqual({ kind: 'preset', preset: 'dots' });
    expect(wallpaperToWire({ kind: 'color', colors: ['#112233', '#445566'], pattern: 'grid' }))
      .toEqual({ kind: 'color', colors: ['#112233', '#445566'], pattern: 'grid' });
    expect(wallpaperToWire({ kind: 'photo', photo: { id: 'a1', url: '' }, blur: 3, dim: null })).toEqual({ kind: 'media', attachment_id: 'a1', blur: 3 });
  });

  it('splits the list into the default and per-chat backgrounds', () => {
    expect(wallpapersFromWire([
      { chat_id: null, wallpaper: { kind: 'preset', preset: 'tint' }, set_by: '1', updated_at: '' },
      { chat_id: '42', wallpaper: { kind: 'color', colors: ['#000000'], pattern: 'dots' }, set_by: '2', updated_at: '' },
    ])).toEqual({ fallback: { kind: 'builtin', preset: 'tint' }, chats: { 42: { kind: 'color', colors: ['#000000'], pattern: 'dots' } } });
  });
});
