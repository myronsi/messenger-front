import { describe, expect, it } from 'vitest';
import { appendMessageFiles, createLocalFileContent } from './uploadFileType';

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
