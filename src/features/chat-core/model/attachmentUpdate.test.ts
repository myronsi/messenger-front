import { describe, expect, it } from 'vitest';
import type { Message, MessageAttachment } from '@/entities/message';
import { applyAttachmentUpdate } from './messageUpdates';
import { parseServerEvent } from './socketEvents';

const video = (id: string, extra: Partial<MessageAttachment> = {}): MessageAttachment => ({
  attachment_id: id, kind: 'video', file_url: `/api/v2/attachments/${id}/content`, file_name: 'clip.mov', file_type: 'video/quicktime',
  file_size: 90, processing: 'queued', ...extra,
});

const message = (id: string, content: Message['content']): Message => ({ id, sender: 'a', timestamp: '', type: 'file', content } as Message);

describe('applyAttachmentUpdate', () => {
  it('replaces the attachment in single files and albums and keeps message-specific fields', () => {
    const drawing = { version: 1, items: [] } as unknown as MessageAttachment['drawing'];
    const previous = [
      message('1', { ...video('a'), caption: 'hi', drawing }),
      message('2', { ...video('b'), album: [video('b'), video('a')] }),
      message('3', 'text'),
    ];
    const update = video('a', { processing: 'done', file_type: 'video/mp4', file_size: 10, file_name: 'clip.mp4', source_url: '/src' });
    const next = applyAttachmentUpdate(previous, update);
    const first = next[0].content as MessageAttachment & { caption?: string };
    expect(first).toMatchObject({ processing: 'done', file_type: 'video/mp4', file_size: 10, source_url: '/src', caption: 'hi', file_name: 'clip.mov' });
    expect(first.drawing).toBe(drawing);
    const album = (next[1].content as { album: MessageAttachment[] }).album;
    expect(album[0].processing).toBe('queued');
    expect(album[1].processing).toBe('done');
    expect(next[2]).toBe(previous[2]);
  });

  it('returns the same list when nothing uses the attachment', () => {
    const previous = [message('1', video('a'))];
    expect(applyAttachmentUpdate(previous, video('z', { processing: 'done' }))).toBe(previous);
  });

  it('accepts the event from the socket', () => {
    expect(parseServerEvent({ type: 'attachment_updated', attachment: video('a') })).toMatchObject({ type: 'attachment_updated' });
  });
});
