import { describe, expect, it } from 'vitest';
import { addToSelection, canAddToSelection, MAX_SEPARATE_FILES, planUploads, splitSelection } from './fileSelection';

const texts = {
  uploadFileTooLarge: 'Max {size} MB',
  uploadUnsupportedType: 'Unsupported',
  albumLimit: 'Up to {max} album items',
  separateFilesLimit: 'Up to {max} files',
};

const named = (name: string, size = 10) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('file selection', () => {
  it('splits photos and videos from other files', () => {
    const files = [named('a.png'), named('doc.pdf'), named('b.mp4'), named('song.mp3')];
    const { media, others } = splitSelection(files);
    expect(media.map((file) => file.name)).toEqual(['a.png', 'b.mp4']);
    expect(others.map((file) => file.name)).toEqual(['doc.pdf', 'song.mp3']);
  });

  it('accepts a mixed selection', () => {
    const result = addToSelection([named('a.png')], [named('doc.pdf'), named('b.jpg')], true, texts);
    expect(result.files?.map((file) => file.name)).toEqual(['a.png', 'doc.pdf', 'b.jpg']);
  });

  it('keeps the album limit and a limit for separate files', () => {
    const media = Array.from({ length: 10 }, (_, index) => named(`${index}.png`));
    expect(addToSelection(media, [named('doc.pdf')], true, texts).files).toHaveLength(11);
    expect(addToSelection(media, [named('11.png')], true, texts).error).toBe('Up to 10 album items');
    const others = Array.from({ length: MAX_SEPARATE_FILES }, (_, index) => named(`${index}.pdf`));
    expect(addToSelection(others, [named('x.txt')], true, texts).error).toBe('Up to 10 files');
    expect(canAddToSelection([...media, ...others])).toBe(false);
    expect(canAddToSelection(media)).toBe(true);
  });

  it('names the limit of the file type that is too large', () => {
    expect(addToSelection([], [named('song.mp3', 26 * 1024 * 1024)], true, texts).error).toBe('Max 25 MB');
    expect(addToSelection([], [named('run.exe')], true, texts).error).toBe('Unsupported');
  });

  it('keeps one file without albums', () => {
    expect(addToSelection([named('a.png')], [named('doc.pdf'), named('b.png')], false, texts).files?.map((file) => file.name)).toEqual(['doc.pdf']);
  });

  it('sends the album once with the caption and every other file on its own', () => {
    const photo = named('a.png');
    const video = named('b.mov');
    const doc = named('doc.pdf');
    const song = named('song.mp3');
    const uploads = planUploads([photo, doc, video, song], 'Trip', (group) => group.map(() => undefined));
    expect(uploads).toEqual([
      { file: [photo, video], caption: 'Trip', drawings: [undefined, undefined] },
      { file: doc, caption: '', drawings: [undefined] },
      { file: song, caption: '', drawings: [undefined] },
    ]);
  });

  it('puts the caption on the first file when there is no album', () => {
    const doc = named('doc.pdf');
    const photo = named('a.png');
    expect(planUploads([doc], 'Hi', () => [])).toEqual([{ file: doc, caption: 'Hi', drawings: [] }]);
    expect(planUploads([doc, photo], 'Hi', () => []).map(({ file, caption }) => [file, caption])).toEqual([[photo, 'Hi'], [doc, '']]);
  });
});
