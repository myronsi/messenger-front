import { describe, expect, it } from 'vitest';
import { uploadLimitBytes, validateUploadFile } from './uploadValidation';

const MB = 1024 * 1024;

describe('validateUploadFile', () => {
  it('accepts supported files within the size limit', () => {
    expect(validateUploadFile({ name: 'photo.JPG', size: 1024 })).toBeNull();
    expect(validateUploadFile({ name: 'clip.mov', size: 100 * MB })).toBeNull();
  });

  it('accepts every supported upload extension', () => {
    const supportedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif',
      'mp4', 'mov', 'ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac',
      'pdf', 'doc', 'docx', 'txt', 'pptx', 'zip',
      'js', 'ts', 'py', 'java', 'cpp', 'html', 'css',
    ];

    supportedExtensions.forEach((extension) => {
      expect(validateUploadFile({ name: `file.${extension}`, size: 1024 })).toBeNull();
    });
  });

  it('rejects files over their type limit', () => {
    expect(validateUploadFile({ name: 'doc.pdf', size: 10 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'photo.png', size: 10 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'song.mp3', size: 10 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'clip.mp4', size: 100 * MB + 1 })).toBe('tooLarge');
    expect(validateUploadFile({ name: 'photo.png', size: 10 * MB })).toBeNull();
  });

  it('rejects unsupported or extensionless files', () => {
    expect(validateUploadFile({ name: 'run.exe', size: 10 })).toBe('unsupportedType');
    expect(validateUploadFile({ name: 'README', size: 10 })).toBe('unsupportedType');
  });

  it('allows 100 MB for videos and 10 MB for everything else', () => {
    expect([uploadLimitBytes('a.jpg'), uploadLimitBytes('a.m4a'), uploadLimitBytes('a.mp4'), uploadLimitBytes('a.pdf')]).toEqual([10 * MB, 10 * MB, 100 * MB, 10 * MB]);
  });
});
