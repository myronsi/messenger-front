import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { File as FileIcon } from 'lucide-react';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { downloadFile } from '@/shared/lib/downloadFile';
import FileMessage from './FileMessage';

vi.mock('@/shared/lib/downloadFile', () => ({ downloadFile: vi.fn() }));

const config = { icon: FileIcon, onHover: FileIcon } as never;
const renderFile = (props: Partial<React.ComponentProps<typeof FileMessage>> = {}) => render(
  <LanguageProvider><FileMessage config={config} fileName="pack.zip" fileUrl="/media/pack.zip" isMobile={false} fileSize={1024} {...props} /></LanguageProvider>,
);

beforeEach(() => {
  localStorage.setItem('language', 'en');
  vi.mocked(downloadFile).mockReset();
});

describe('FileMessage', () => {
  it('offers cancel instead of download while the file is uploading', () => {
    const onCancelUpload = vi.fn();
    renderFile({ uploadProgress: 57, onCancelUpload });
    expect(screen.queryByTestId('download-file')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '57');
    expect(screen.getByTestId('file-transfer-status')).toHaveTextContent('57%');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel upload: pack.zip' }));
    expect(onCancelUpload).toHaveBeenCalledOnce();
  });

  it('fills a ring while downloading and cancels the download on a second click', async () => {
    let report: (percent: number | null) => void = () => undefined;
    let signal: AbortSignal | undefined;
    vi.mocked(downloadFile).mockImplementation((_url, _name, options = {}) => {
      report = options.onProgress ?? report;
      signal = options.signal;
      return new Promise(() => undefined);
    });
    renderFile();
    fireEvent.click(screen.getByRole('button', { name: 'Download: pack.zip' }));
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    act(() => report(40));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByTestId('file-transfer-status')).toHaveTextContent('40%');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel download: pack.zip' }));
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
