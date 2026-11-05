import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryKeyReceipt } from './RecoveryKeyReceipt';

const key = 'K7QM-2XRV-ABCD';
const readBlob = (blob: Blob) => new Promise<string>(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

describe('RecoveryKeyReceipt', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.restoreAllMocks());

  it('requires the correct last group and acknowledgement before clearing the receipt', () => {
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(screen.getByLabelText('I saved my recovery key'));
    fireEvent.change(screen.getByLabelText(/Type the last group/), { target: { value: 'wrong' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type the last group/), { target: { value: 'abcd' } });
    fireEvent.click(button);
    expect(done).toHaveBeenCalledOnce();
    expect(JSON.stringify(localStorage)).not.toContain(key);
    expect(JSON.stringify(sessionStorage)).not.toContain(key);
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
    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download QR' }));
    expect(blobs[0].type).toBe('image/svg+xml');
    expect(await readBlob(blobs[0])).toContain('<svg');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });

  it('warns before skipping and stores only a reminder flag', () => {
    const done = vi.fn();
    render(<RecoveryKeyReceipt recoveryKey={key} username="alice" onContinue={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(done).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('you may lose your account');
    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));
    expect(done).toHaveBeenCalledOnce();
    expect(localStorage.getItem('recovery_receipt_skipped:alice')).toBe('true');
    expect(JSON.stringify(localStorage)).not.toContain(key);
  });
});
