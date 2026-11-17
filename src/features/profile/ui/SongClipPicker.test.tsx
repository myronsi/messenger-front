import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { SongClipPicker } from './SongClipPicker';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
const mocks = vi.hoisted(() => ({ upload: vi.fn(), waveform: vi.fn(), tags: vi.fn() }));
vi.mock('../api/profileExtrasApi', () => ({ uploadProfileFile: mocks.upload }));
vi.mock('@/shared/lib/songTags', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/lib/songTags')>(), readSongTags: mocks.tags,
}));
vi.mock('../model/waveform', async (importOriginal) => ({
  ...await importOriginal<typeof import('../model/waveform')>(), readWaveform: mocks.waveform,
}));

const t = en.profileExtras;
const song = new File(['x'], 'Bed of Roses.mp3', { type: 'audio/mpeg' });

class FakeAudio {
  currentTime = 0;
  duration = 120;
  src = '';
  preload = '';
  onloadedmetadata: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onplay: (() => void) | null = null;
  onpause: (() => void) | null = null;
  play = vi.fn(() => { this.onplay?.(); return Promise.resolve(); });
  pause = vi.fn(() => { this.onpause?.(); });
  constructor(src: string) { this.src = src; }
}

const box = { left: 0, width: 400, top: 0, height: 80, right: 400, bottom: 80, x: 0, y: 0, toJSON: () => ({}) };

describe('SongClipPicker', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio);
    URL.createObjectURL = vi.fn(() => 'blob:song');
    URL.revokeObjectURL = vi.fn();
    mocks.waveform.mockResolvedValue({ peaks: Array(64).fill(0.5), duration: 120 });
    mocks.upload.mockResolvedValue({ id: '7', tags: { title: 'Tag title', artist: 'Tag artist' } });
    mocks.tags.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fills title, artist and cover from the file tags and starts with the first 30 seconds', async () => {
    mocks.tags.mockResolvedValue({ title: 'Real Title', artist: 'Real Artist', cover: new Blob(['c'], { type: 'image/jpeg' }) });
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByLabelText(t.musicTitle)).toHaveAttribute('placeholder', 'Bed of Roses');
    await waitFor(() => expect(screen.getByLabelText(t.musicTitle)).toHaveValue('Real Title'));
    expect(screen.getByLabelText(t.musicArtist)).toHaveValue('Real Artist');
    expect(screen.getByTestId('song-cover')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('clip-window')).toBeInTheDocument());
    expect(screen.getByTestId('clip-range')).toHaveTextContent('0:00 – 0:30');
    expect(screen.getByTestId('clip-window')).toHaveStyle({ left: '0%', width: '25%' });
  });

  it('moves the 30 second window by dragging and by arrow keys', async () => {
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={vi.fn()} />);
    const track = await screen.findByTestId('clip-track');
    await waitFor(() => expect(screen.getByTestId('clip-window')).toBeInTheDocument());
    track.getBoundingClientRect = () => box as DOMRect;
    track.setPointerCapture = vi.fn();
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(screen.getByTestId('clip-range')).toHaveTextContent('1:00 – 1:30');
    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(screen.getByTestId('clip-range')).toHaveTextContent('1:01 – 1:31');
    fireEvent.pointerDown(track, { clientX: 390, pointerId: 2 });
    expect(screen.getByTestId('clip-range')).toHaveTextContent('1:30 – 2:00');
  });

  it('uploads only the chosen part and keeps what the user typed over any tags', async () => {
    mocks.tags.mockResolvedValue({ title: 'File Title' });
    const onDone = vi.fn();
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={onDone} />);
    await waitFor(() => expect(screen.getByRole('button', { name: t.clipDone })).toBeEnabled());
    await waitFor(() => expect(screen.getByLabelText(t.musicTitle)).toHaveValue('File Title'));
    fireEvent.change(screen.getByLabelText(t.musicArtist), { target: { value: 'MSI' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t.clipDone })); });
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ file: song, purpose: 'profile_music', startMs: 0, endMs: 30000 }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ title: 'File Title', artist: 'MSI' }));
  });

  it.each([
    [{ title: 'Tag title', artist: 'Tag artist' }, { title: 'Tag title', artist: 'Tag artist' }],
    [{ title: null, artist: null }, { title: 'Bed of Roses', artist: '' }],
  ])('falls back to server tags %o and then to the file name', async (serverTags, expected) => {
    mocks.upload.mockResolvedValue({ id: '8', tags: serverTags });
    const onDone = vi.fn();
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={onDone} />);
    await waitFor(() => expect(screen.getByRole('button', { name: t.clipDone })).toBeEnabled());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t.clipDone })); });
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining(expected));
  });

  it('stays open with a message when the upload fails', async () => {
    mocks.upload.mockRejectedValue(new Error('nope'));
    const onDone = vi.fn();
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={onDone} />);
    await waitFor(() => expect(screen.getByRole('button', { name: t.clipDone })).toBeEnabled());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t.clipDone })); });
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(t.musicFailed)).toBeInTheDocument();
  });

  it('uses the whole song when it is shorter than 30 seconds', async () => {
    mocks.waveform.mockResolvedValue({ peaks: Array(64).fill(0.5), duration: 12 });
    render(<SongClipPicker file={song} onCancel={vi.fn()} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('clip-range')).toHaveTextContent('0:00 – 0:12'));
    expect(screen.getByTestId('clip-window')).toHaveStyle({ left: '0%', width: '100%' });
  });
});
