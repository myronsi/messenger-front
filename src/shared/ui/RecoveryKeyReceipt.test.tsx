import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryKeyReceipt } from './RecoveryKeyReceipt';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});

const key = 'K7QM-2XRV-ABCD-EFGH-JKLM-NPQR-STUV-WXYZ';
const readBlob = (blob: Blob) => new Promise<string>(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

const captureDownloads = () => {
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob as Blob); return 'blob:receipt'; });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { blobs, click };
};

describe('RecoveryKeyReceipt', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('explains the key and shows one chip per group with the full key for assistive tech', () => {
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Copy recovery key' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Save your spare key' })).toBeInTheDocument();
    expect(screen.getByTestId('recovery-key')).toHaveTextContent(key);
    expect(screen.getByText('K7QM')).toBeInTheDocument();
    expect(screen.getByText('WXYZ')).toBeInTheDocument();
    expect(screen.getByText("Upper or lower case doesn't matter.")).toBeInTheDocument();
  });

  it('unlocks the checkbox only after the key is downloaded, then continue after ticking it', () => {
    captureDownloads();
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    const checkbox = screen.getByRole('checkbox', { name: /I saved my recovery key somewhere safe/ });
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Download or copy it first.')).toBeInTheDocument();
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Download recovery key' }));
    expect(screen.getByRole('button', { name: 'Downloaded' })).toBeInTheDocument();
    expect(checkbox).toBeEnabled();
    expect(button).toBeDisabled();
    fireEvent.click(checkbox);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(done).toHaveBeenCalledOnce();
    expect(JSON.stringify(localStorage)).not.toContain(key);
    expect(JSON.stringify(sessionStorage)).not.toContain(key);
  });

  it('also unlocks the checkbox after copying the key', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy recovery key' })); });
    expect(writeText).toHaveBeenCalledWith(key);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });

  it('falls back to a selection copy when the clipboard API is denied', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy recovery key' })); });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });

  it('shows the manual copy hint and unlocks the checkbox when every copy path fails', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    Object.defineProperty(document, 'execCommand', { value: vi.fn(() => false), configurable: true });
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy recovery key' })); });
    expect(screen.getByRole('status')).toHaveTextContent('Select the key and copy it manually.');
    expect(screen.getByRole('button', { name: 'Copy recovery key' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });

  it('unlocks the checkbox when the key is copied manually', () => {
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.copy(screen.getByText('K7QM'));
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });

  it('downloads a private file with the account, the key and how to use it', async () => {
    const { blobs, click } = captureDownloads();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download recovery key' }));
    const text = await readBlob(blobs[0]);
    expect(text).toContain('MESSENGER RECOVERY KEY');
    expect(text).toContain('Account: alice');
    expect(text).toContain('K7QM-2XRV-ABCD-EFGH\nJKLM-NPQR-STUV-WXYZ');
    expect(text).toContain('1. On the sign-in page, choose "Forgot password?".');
    expect(text).toContain('2. Choose "Use my recovery key".');
    expect(text).toContain('two-factor authentication');
    expect(text).toContain('The key works once.');
    expect(click.mock.instances[0]).toHaveAttribute('download', 'messenger-recovery-alice.txt');
  });

  it('leaves out the two-factor note during sign-up', async () => {
    const { blobs } = captureDownloads();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} context="signup" />);
    expect(screen.queryByText(/two-factor authentication/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download recovery key' }));
    expect(await readBlob(blobs[0])).not.toContain('two-factor');
  });

  it('shows the QR code under more ways to save and downloads it as SVG', async () => {
    const { blobs } = captureDownloads();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    const more = screen.getByRole('button', { name: 'More ways to save' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Download QR' }));
    expect(blobs[0].type).toBe('image/svg+xml');
    expect(await readBlob(blobs[0])).toContain('<svg');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });

  it('warns and skips in one action, storing only a reminder flag', () => {
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    expect(screen.getByText(/you may lose your account/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));
    expect(done).toHaveBeenCalledOnce();
    expect(localStorage.getItem('recovery_receipt_skipped:alice')).toBe('true');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });
});
