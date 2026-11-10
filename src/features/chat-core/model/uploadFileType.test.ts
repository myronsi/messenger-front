import { describe, expect, it } from 'vitest';
import { appendMessageFiles, createLocalFileContent, getLocalUploadFileType } from './uploadFileType';

const drawing = { version: 1, items: [{ type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0, 0] }] };

describe('upload files with drawings', () => {
  it('sends the drawings in file order', () => {
    const form = new FormData();
    appendMessageFiles(form, [
      { file: new Blob(['a']), fileName: 'a.png' },
      { file: new Blob(['b']), fileName: 'b.png', drawing },
    ]);
    expect(form.getAll('file')).toHaveLength(2);
    expect(JSON.parse(String(form.get('drawings')))).toEqual([null, drawing]);
  });

  it('sends no drawings field without drawings', () => {
    const form = new FormData();
    appendMessageFiles(form, [{ file: new Blob(['a']), fileName: 'a.png' }]);
    expect(form.has('drawings')).toBe(false);
  });

  it('shows the drawing on the message while it uploads', () => {
    const content = createLocalFileContent([{ file: new Blob(['a'], { type: 'image/png' }), fileName: 'a.png', drawing }], '');
    expect(content.drawing).toEqual(drawing);
  });
});

describe('getLocalUploadFileType', () => {
  it('trusts an audio type over the webm extension', () => {
    expect(getLocalUploadFileType('voice.webm', 'audio/webm')).toBe('audio');
    expect(getLocalUploadFileType('clip.webm', 'video/webm')).toBe('video');
    expect(getLocalUploadFileType('clip.webm')).toBe('video');
  });

  it('falls back to the extension without a type', () => {
    expect(['a.wav', 'a.opus', 'a.PNG', 'a.mov', 'a.pdf', 'README'].map((name) => getLocalUploadFileType(name))).toEqual(['audio', 'audio', 'image', 'video', 'document', 'none']);
  });
});
