import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeviceRecoveryWaiting } from './DeviceRecoveryWaiting';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});

describe('DeviceRecoveryWaiting', () => {
  it('shows the match number in a labelled countdown ring with steps and actions', () => {
    const cancel = vi.fn();
    const other = vi.fn();
    render(<DeviceRecoveryWaiting username="anna.k" matchNumber={47} seconds={462} totalSeconds={600} onCancel={cancel} onTryAnotherWay={other} />);
    expect(screen.getByRole('img', { name: 'Your number is 47, 7 min 42 s left' })).toBeInTheDocument();
    expect(screen.getByText('7:42 left')).toBeInTheDocument();
    expect(screen.getByText('anna.k')).toBeInTheDocument();
    expect(screen.getByText('Tap 47 there. Never tap a number someone tells you over the phone.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for approval…');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try another way' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(other).toHaveBeenCalledOnce();
  });

  it('draws the ring as the remaining share of the total time', () => {
    const { container } = render(<DeviceRecoveryWaiting username="a" matchNumber={1} seconds={300} totalSeconds={600} onCancel={() => {}} onTryAnotherWay={() => {}} />);
    const [, progress] = container.querySelectorAll('circle');
    const dash = Number(progress.getAttribute('stroke-dasharray'));
    expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(dash / 2);
  });
});
