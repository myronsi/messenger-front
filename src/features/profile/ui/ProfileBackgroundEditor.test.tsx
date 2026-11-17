import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { ProfileBackgroundEditor } from './ProfileBackgroundEditor';
import { needsBannerCrop } from '../model/bannerCrop';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../api/profileExtrasApi', () => ({ uploadProfileFile: mocks.upload }));
vi.mock('@/shared/ui/AvatarCropModal', () => ({
  default: ({ shape, title, onConfirm }: { shape: string; title: string; onConfirm: (file: File) => void }) => (
    <button type="button" data-shape={shape} onClick={() => onConfirm(new File(['c'], 'cropped.jpg', { type: 'image/jpeg' }))}>{title}</button>
  ),
}));

const t = en.profileExtras;
const pick = (file: File) => fireEvent.change(screen.getByTestId('profile-background-input'), { target: { files: [file] } });

describe('ProfileBackgroundEditor', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:image');
    URL.revokeObjectURL = vi.fn();
    mocks.upload.mockReset();
    mocks.upload.mockResolvedValue({ id: '5' });
  });

  it('crops photos as a banner but keeps GIFs and videos as they are', () => {
    expect(needsBannerCrop(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(needsBannerCrop(new File([''], 'a.gif', { type: 'image/gif' }))).toBe(false);
    expect(needsBannerCrop(new File([''], 'a.mp4', { type: 'video/mp4' }))).toBe(false);
  });

  it('asks to crop a photo first and uploads the cropped banner', async () => {
    const onSave = vi.fn(async () => undefined);
    render(<ProfileBackgroundEditor embedded background={null} onSave={onSave} />);
    pick(new File(['p'], 'photo.png', { type: 'image/png' }));
    expect(mocks.upload).not.toHaveBeenCalled();
    const crop = screen.getByRole('button', { name: t.cropBackground });
    expect(crop).toHaveAttribute('data-shape', 'banner');
    fireEvent.click(crop);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(mocks.upload.mock.calls[0][0].file.name).toBe('cropped.jpg');
    expect(onSave).toHaveBeenCalledWith({ kind: 'media', attachment_id: '5' }, { kind: 'media', attachment: { id: '5' } });
  });

  it('uploads a GIF straight away', async () => {
    const onSave = vi.fn(async () => undefined);
    render(<ProfileBackgroundEditor embedded background={null} onSave={onSave} />);
    pick(new File(['g'], 'fun.gif', { type: 'image/gif' }));
    expect(screen.queryByRole('button', { name: t.cropBackground })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(mocks.upload.mock.calls[0][0].file.name).toBe('fun.gif');
  });
});
