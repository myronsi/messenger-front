import { describe, expect, it } from 'vitest';
import { attachmentView, isAudioAttachment, isVideoAttachment, isVoiceAttachment } from './videoAttachment';
import type { MessageAttachment } from './types';

const file = (extra: Partial<MessageAttachment>): MessageAttachment => ({ file_url: '/a', file_name: 'a.bin', file_type: '', file_size: 1, ...extra });

describe('attachmentView', () => {
  it('plays audio the server marked as audio or voice', () => {
    expect(attachmentView(file({ kind: 'audio', file_name: 'song.webm', file_type: 'audio/webm' }), false)).toBe('audio');
    expect(attachmentView(file({ kind: 'voice', file_name: 'voice.ogg', file_type: 'voice' }), false)).toBe('audio');
  });

  it('plays every audio content type', () => {
    const types = ['audio/wave', 'audio/x-wav', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/webm'];
    types.forEach((type) => expect(attachmentView(file({ kind: 'file', file_type: type }), false)).toBe('audio'));
  });

  it('shows a video tile only for kind video', () => {
    expect(attachmentView(file({ kind: 'video', file_name: 'clip.webm', file_type: 'video/webm' }), false)).toBe('video');
    expect(attachmentView(file({ kind: 'file', file_name: 'clip.mkv', file_type: 'application/octet-stream' }), false)).toBe('file');
    expect(attachmentView(file({ kind: 'file', file_name: 'clip.mp4', file_type: 'video/mp4' }), false)).toBe('file');
  });

  it('shows images by kind or by a picture name', () => {
    expect(attachmentView(file({ kind: 'image', file_name: 'photo', file_type: 'image/png' }), false)).toBe('image');
    expect(attachmentView(file({ file_name: 'photo.png', file_type: 'image' }), true)).toBe('image');
    expect(attachmentView(file({ kind: 'file', file_name: 'report.pdf', file_type: 'application/pdf' }), false)).toBe('file');
  });

  it('keeps the old rules for messages without a kind', () => {
    expect(attachmentView(file({ file_name: 'voice.opus', file_type: 'application/octet-stream' }), false)).toBe('audio');
    expect(attachmentView(file({ file_name: 'song.wav', file_type: 'audio' }), false)).toBe('audio');
    expect(attachmentView(file({ file_name: 'clip.mov', file_type: 'video' }), false)).toBe('video');
    expect(attachmentView(file({ file_name: 'clip.webm', file_type: 'audio/webm' }), false)).toBe('audio');
    expect(attachmentView(file({ file_name: 'clip.webm', file_type: 'file' }), false)).toBe('video');
  });
});

describe('attachment helpers', () => {
  it('tells voice messages from music', () => {
    expect(isVoiceAttachment(file({ kind: 'voice' }))).toBe(true);
    expect(isVoiceAttachment(file({ file_name: 'note.opus' }))).toBe(true);
    expect(isVoiceAttachment(file({ kind: 'audio', file_name: 'song.opus' }))).toBe(false);
  });

  it('never treats audio as video', () => {
    expect(isAudioAttachment(file({ file_type: 'audio/webm', file_name: 'a.webm' }))).toBe(true);
    expect(isVideoAttachment(file({ file_type: 'audio/webm', file_name: 'a.webm' }))).toBe(false);
  });
});
