import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScrollToBottomButton from './ScrollToBottomButton';

const props = { label: 'Scroll to bottom', countLabel: 'Scroll to bottom, 120 new messages' };

describe('ScrollToBottomButton', () => {
  it('renders nothing while hidden', () => {
    render(<ScrollToBottomButton {...props} visible={false} count={0} onClick={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is shown without a badge when there are no new messages', async () => {
    render(<ScrollToBottomButton {...props} visible count={0} onClick={() => {}} />);
    const button = await screen.findByRole('button', { name: 'Scroll to bottom' });
    expect(button.textContent).toBe('');
  });

  it('caps the badge at 99+ and exposes the count in the label', async () => {
    render(<ScrollToBottomButton {...props} visible count={120} onClick={() => {}} />);
    const button = await screen.findByRole('button', { name: props.countLabel });
    expect(button.textContent).toBe('99+');
    expect(screen.getByRole('status').textContent).toBe(props.countLabel);
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<ScrollToBottomButton {...props} visible count={1} onClick={onClick} />);
    await userEvent.click(await screen.findByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});