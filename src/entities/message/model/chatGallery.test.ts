import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ViewerImage } from '@/shared/ui/image-viewer';
import { ChatGalleryContext, chatGalleryEntries, galleryFor, useGalleryOpener } from './chatGallery';
import { requestMediaForward } from './mediaForward';

vi.mock('./mediaForward', () => ({ requestMediaForward: vi.fn() }));
import type { ChatPhoto } from './types';

const info = (photo: ChatPhoto) => ({ sender: photo.sender ?? '' });
const photo = (id: string, timestamp: string, extra: Partial<ChatPhoto> = {}): ChatPhoto => ({
  id, timestamp, file_url: `https://cdn.test/${id}.jpg`, file_name: `${id}.jpg`, file_type: 'image/jpeg', sender: 'Ann', ...extra,
});
const attachment = (name: string, type = 'image/jpeg') => ({ file_url: `https://cdn.test/${name}`, file_name: name, file_type: type, file_size: 1 });

describe('chatGalleryEntries', () => {
  it('lists media oldest first and expands albums in their own order', () => {
    const entries = chatGalleryEntries([
      photo('3', '2026-11-03T10:00:00Z'),
      photo('2', '2026-11-02T10:00:00Z', { album: [attachment('a.jpg'), attachment('b.mp4', 'video/mp4')] }),
      photo('1', '2026-11-01T10:00:00Z', { display_url: 'https://cdn.test/1-display.jpg' }),
    ], info);
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://cdn.test/1.jpg', 'https://cdn.test/a.jpg', 'https://cdn.test/b.mp4', 'https://cdn.test/3.jpg',
    ]);
    expect(entries[0].image).toMatchObject({ url: 'https://cdn.test/1-display.jpg', fullUrl: 'https://cdn.test/1.jpg', info: { sender: 'Ann' } });
    expect(entries[2].image.isVideo).toBe(true);
    expect(entries.map((entry) => entry.messageId)).toEqual(['1', '2', '2', '3']);
  });

  it('skips media without a file', () => {
    expect(chatGalleryEntries([photo('1', '2026-11-01T10:00:00Z', { file_url: '' })], info)).toEqual([]);
  });
});

describe('galleryFor', () => {
  const entries = chatGalleryEntries([
    photo('1', '2026-11-01T10:00:00Z'),
    photo('2', '2026-11-02T10:00:00Z', { album: [attachment('a.jpg'), attachment('b.jpg')] }),
    photo('3', '2026-11-03T10:00:00Z'),
  ], info);
  const local = (name: string): ViewerImage => ({ url: `local-${name}`, name });

  it('opens the whole chat at the clicked item and keeps the message own viewer items', () => {
    const opened = galleryFor(entries, '2', [local('a'), local('b')], ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'], 1);
    expect(opened.index).toBe(2);
    expect(opened.messageIds).toEqual(['1', '2', '2', '3']);
    expect(opened.images.map((image) => image.url)).toEqual(['https://cdn.test/1.jpg', 'local-a', 'local-b', 'https://cdn.test/3.jpg']);
  });

  it('falls back to the message alone when the chat list does not have it yet', () => {
    const opened = galleryFor(entries, 'temp-9', [local('new')], ['blob:new'], 0);
    expect(opened).toEqual({ images: [local('new')], index: 0, messageIds: ['temp-9'] });
  });

  it('lets every saved message in the gallery be forwarded after closing the viewer', () => {
    const close = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(ChatGalleryContext.Provider, { value: entries }, children);
    const { result } = renderHook(() => useGalleryOpener('3', close), { wrapper });
    const opened = result.current([local('c')], ['https://cdn.test/3.jpg'], 0);
    opened.images[1].onForward?.();
    expect(close).toHaveBeenCalledOnce();
    expect(requestMediaForward).toHaveBeenCalledWith('2');
    expect(result.current([local('x')], ['blob:x'], 0).images[0].onForward).toBeDefined();
    const onMakeSticker = vi.fn();
    result.current([{ ...local('c'), onMakeSticker }], ['https://cdn.test/3.jpg'], 0).images[3].onMakeSticker?.();
    expect(close).toHaveBeenCalledTimes(2);
    expect(onMakeSticker).toHaveBeenCalledOnce();
    const unsent = renderHook(() => useGalleryOpener('temp-1', close), { wrapper }).result.current([local('y')], ['blob:y'], 0);
    expect(unsent.images[0].onForward).toBeUndefined();
  });
});
