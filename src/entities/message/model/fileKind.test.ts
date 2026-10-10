import { describe, expect, it } from 'vitest';
import { fileKindOf } from './fileKind';

const content = (fields: Partial<Parameters<typeof fileKindOf>[0]>) => ({ file_url: 'u', file_name: 'x', file_type: '', file_size: 1, ...fields });

describe('fileKindOf', () => {
  it("follows the server's kind over the name", () => {
    expect(fileKindOf(content({ kind: 'file', file_name: 'broken.png', file_type: 'application/octet-stream' }))).toBe('file');
    expect(fileKindOf(content({ kind: 'image', file_name: 'photo' }))).toBe('image');
    expect(fileKindOf(content({ kind: 'voice' }))).toBe('voice');
  });

  it('guesses from the type and name without a kind', () => {
    expect(fileKindOf(content({ file_type: 'voice' }))).toBe('voice');
    expect(fileKindOf(content({ file_type: 'image' }))).toBe('image');
    expect(fileKindOf(content({ file_name: 'a.JPG' }))).toBe('image');
    expect(fileKindOf(content({ file_type: 'video/quicktime' }))).toBe('video');
    expect(fileKindOf(content({ file_type: 'audio/mpeg' }))).toBe('audio');
    expect(fileKindOf(content({ file_name: 'notes.txt' }))).toBe('file');
  });
});
