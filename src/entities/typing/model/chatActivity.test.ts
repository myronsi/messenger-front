import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { beginChatActivity, uploadActivity, useChatActivity } from './chatActivity';

describe('chat activity', () => {
  it('shows the most important running activity of a chat and ends each one once', () => {
    const { result } = renderHook(() => useChatActivity('5'));
    expect(result.current).toBeNull();
    let endSticker = () => {};
    let endPhoto = () => {};
    act(() => { endSticker = beginChatActivity('5', 'choosing_sticker'); });
    expect(result.current).toBe('choosing_sticker');
    act(() => { endPhoto = beginChatActivity('5', 'uploading_photo'); });
    expect(result.current).toBe('uploading_photo');
    act(() => { endPhoto(); endPhoto(); });
    expect(result.current).toBe('choosing_sticker');
    act(() => endSticker());
    expect(result.current).toBeNull();
  });

  it('keeps an activity while another upload of the same kind still runs', () => {
    const { result } = renderHook(() => useChatActivity('6'));
    let first = () => {};
    let second = () => {};
    act(() => { first = beginChatActivity('6', 'uploading_file'); second = beginChatActivity('6', 'uploading_file'); });
    act(() => first());
    expect(result.current).toBe('uploading_file');
    act(() => second());
    expect(result.current).toBeNull();
  });

  it('chooses the upload kind from the file types', () => {
    expect(uploadActivity(['image', 'image'])).toBe('uploading_photo');
    expect(uploadActivity(['image', 'video'])).toBe('uploading_video');
    expect(uploadActivity(['image', 'document'])).toBe('uploading_file');
    expect(uploadActivity(['audio'])).toBe('uploading_file');
  });
});
