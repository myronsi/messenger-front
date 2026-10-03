import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, validateUploadFile } from './uploadValidation';

describe('validateUploadFile', () => {
  it('accepts supported files within the size limit', () => {
    expect(validateUploadFile({ name: 'photo.JPG', size: 1024 })).toBeNull();
    expect(validateUploadFile({ name: 'clip.mov', size: MAX_UPLOAD_BYTES })).toBeNull();
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

  it('rejects files over 10 MB', () => {
    expect(validateUploadFile({ name: 'doc.pdf', size: MAX_UPLOAD_BYTES + 1 })).toBe('tooLarge');
  });

  it('rejects unsupported or extensionless files', () => {
    expect(validateUploadFile({ name: 'run.exe', size: 10 })).toBe('unsupportedType');
    expect(validateUploadFile({ name: 'README', size: 10 })).toBe('unsupportedType');
  });
});
