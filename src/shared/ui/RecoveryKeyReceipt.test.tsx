import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryKeyReceipt } from './RecoveryKeyReceipt';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});

const key = 'K7QM-2XRV-ABCD';
const readBlob = (blob: Blob) => new Promise<string>(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

describe('RecoveryKeyReceipt', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.restoreAllMocks());

  it('shows the key as one chip per group and keeps the full key for assistive tech', () => {
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    expect(screen.getByTestId('recovery-key')).toHaveTextContent(key);
    expect(screen.getByText('K7QM')).toBeInTheDocument();
    expect(screen.getByText('2XRV')).toBeInTheDocument();
    expect(screen.getByText('ABCD')).toBeInTheDocument();
  });

  it('requires the correct last group before clearing the receipt', () => {
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    const button = screen.getByRole('button', { name: 'I saved it, continue' });
    fireEvent.change(screen.getByLabelText('To confirm, type the last group'), { target: { value: 'wrong' } });
    expect(button).toBeDisabled();
    expect(screen.queryByText('Matches')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To confirm, type the last group'), { target: { value: 'abcd' } });
    expect(screen.getByText('Matches')).toBeInTheDocument();
    fireEvent.click(button);
    expect(done).toHaveBeenCalledOnce();
    expect(JSON.stringify(localStorage)).not.toContain(key);
    expect(JSON.stringify(sessionStorage)).not.toContain(key);
  });

  it('shows registration progress only when asked', () => {
    const { rerender } = render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    expect(screen.queryByRole('img', { name: /Step/ })).not.toBeInTheDocument();
    rerender(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} progress={{ current: 2, total: 3 }} />);
    expect(screen.getByRole('img', { name: 'Step 2 of 3' })).toBeInTheDocument();
  });

  it('downloads a private text receipt with username, key and instructions', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob as Blob); return 'blob:receipt'; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download .txt' }));
    const text = await readBlob(blobs[0]);
    expect(text).toContain('Username: alice');
    expect(text).toContain(`Recovery key: ${key}`);
    expect(text).toContain('single use');
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toHaveAttribute('download', 'messenger-recovery-alice.txt');
  });

  it('shows and downloads the QR as a standalone SVG', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob as Blob); return 'blob:receipt'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download QR' }));
    expect(blobs[0].type).toBe('image/svg+xml');
    expect(await readBlob(blobs[0])).toContain('<svg');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });

  it('warns before skipping and stores only a reminder flag', () => {
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    fireEvent.click(screen.getByRole('button', { name: "Skip for now (we'll remind you)" }));
    expect(done).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('you may lose your account');
    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));
    expect(done).toHaveBeenCalledOnce();
    expect(localStorage.getItem('recovery_receipt_skipped:alice')).toBe('true');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });
});
