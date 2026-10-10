import { describe, expect, it } from 'vitest';
import { UPLOAD_LIMITS, formatMegabytes, uploadKindOf, validateUploadFile } from './uploadValidation';

const file = (type: string, size: number) => ({ type, size });

describe('validateUploadFile', () => {
  it('accepts any type of message file within the limit of its kind', () => {
    expect(validateUploadFile(file('image/jpeg', 1024))).toBeNull();
    expect(validateUploadFile(file('video/quicktime', UPLOAD_LIMITS.video))).toBeNull();
    expect(validateUploadFile(file('application/x-msdownload', 10))).toBeNull();
    expect(validateUploadFile(file('', 10))).toBeNull();
  });

  it('applies the limit of the kind', () => {
    expect(validateUploadFile(file('image/png', UPLOAD_LIMITS.image + 1))).toEqual({ reason: 'tooLarge', limitBytes: UPLOAD_LIMITS.image });
    expect(validateUploadFile(file('audio/ogg', UPLOAD_LIMITS.audio + 1))).toEqual({ reason: 'tooLarge', limitBytes: UPLOAD_LIMITS.audio });
    expect(validateUploadFile(file('application/pdf', UPLOAD_LIMITS.file + 1))).toEqual({ reason: 'tooLarge', limitBytes: UPLOAD_LIMITS.file });
  });

  it('rejects empty files', () => {
    expect(validateUploadFile(file('text/plain', 0))).toEqual({ reason: 'empty' });
  });

  it('accepts only decodable images as avatars, up to the avatar limit', () => {
    expect(validateUploadFile(file('image/webp', 1024), 'avatar')).toBeNull();
    expect(validateUploadFile(file('image/bmp', 1024), 'avatar')).toEqual({ reason: 'unsupportedType' });
    expect(validateUploadFile(file('image/png', UPLOAD_LIMITS.avatar + 1), 'avatar')).toEqual({ reason: 'tooLarge', limitBytes: UPLOAD_LIMITS.avatar });
  });

  it('names kinds and sizes', () => {
    expect(uploadKindOf('video/mp4')).toBe('video');
    expect(uploadKindOf('application/zip')).toBe('file');
    expect(formatMegabytes(UPLOAD_LIMITS.image)).toBe('20 MB');
  });
});
