import { describe, expect, it } from 'vitest';
import { isAlbumFile, UPLOAD_ACCEPT, uploadKindOf, uploadLimitBytes, uploadLimitMegabytes, validateUploadFile } from './uploadValidation';

const MB = 1024 * 1024;

describe('validateUploadFile', () => {
  it('accepts supported files within the size limit', () => {
    expect(validateUploadFile({ name: 'photo.JPG', size: 1024 })).toBeNull();
    expect(validateUploadFile({ name: 'clip.mov', size: 100 * MB })).toBeNull();
  });

  it('accepts every supported upload extension', () => {
    const supportedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic', 'heif', 'svg',
      'mp4', 'mov', 'webm', 'ogg', 'oga', 'opus', 'mp3', 'wav', 'm4a', 'aac', 'flac',
      'pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'json', 'xls', 'xlsx', 'pptx', 'zip',
      'js', 'ts', 'py', 'java', 'cpp', 'html', 'css',
    ];

    supportedExtensions.forEach((extension) => {
      expect(validateUploadFile({ name: `file.${extension}`, size: 1024 })).toBeNull();
      expect(UPLOAD_ACCEPT.split(',')).toContain(`.${extension}`);
    });
  });

  it('rejects files over their type limit', () => {
    expect(validateUploadFile({ name: 'photo.png', size: 20 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'photo.png', size: 20 * MB })).toBeNull();
    expect(validateUploadFile({ name: 'song.mp3', size: 25 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'song.wav', size: 25 * MB })).toBeNull();
    expect(validateUploadFile({ name: 'clip.mp4', size: 100 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'doc.pdf', size: 100 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'table.xlsx', size: 60 * MB })).toBeNull();
  });

  it('rejects unsupported or extensionless files', () => {
    expect(validateUploadFile({ name: 'run.exe', size: 10 })).toBe('unsupportedType');
    expect(validateUploadFile({ name: 'README', size: 10 })).toBe('unsupportedType');
  });

  it('uses the server limits per kind', () => {
    expect(['a.jpg', 'a.m4a', 'a.mp4', 'a.pdf', 'a.bmp'].map(uploadLimitMegabytes)).toEqual([20, 25, 100, 100, 100]);
    expect(uploadLimitBytes('a.opus')).toBe(25 * MB);
  });

  it('knows the kind of a file from its name', () => {
    expect(['a.webp', 'a.flac', 'a.webm', 'a.heic', 'a.svg'].map(uploadKindOf)).toEqual(['image', 'audio', 'video', 'file', 'file']);
  });

  it('puts only photos and videos into albums', () => {
    expect(['a.png', 'b.mov', 'c.pdf', 'd.mp3', 'e.heic'].map((name) => isAlbumFile({ name }))).toEqual([true, true, false, false, false]);
  });
});
