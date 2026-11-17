import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WHEEL_ITEM_PX, WheelColumn } from './WheelColumn';

const items = ['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((label, index) => ({ value: index + 1, label }));

const Harness = ({ onChange }: { onChange?: (value: number) => void }) => {
  const [value, setValue] = useState(2);
  return <WheelColumn label="Month" items={items} value={value} onChange={(next) => { setValue(next); onChange?.(next); }} />;
};

describe('WheelColumn', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts on the chosen value and scrolls it into the middle', () => {
    render(<Harness />);
    const list = screen.getByRole('listbox', { name: 'Month' });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Feb');
    expect(list.scrollTop).toBe(WHEEL_ITEM_PX);
  });

  it('moves with the arrow keys, Home and End', () => {
    render(<Harness />);
    const list = screen.getByRole('listbox', { name: 'Month' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Mar');
    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('May');
    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Jan');
    expect(list.scrollTop).toBe(0);
  });

  it('picks a tapped item and the item the scroll settles on', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('option', { name: 'Apr' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    const list = screen.getByRole('listbox', { name: 'Month' });
    list.scrollTop = WHEEL_ITEM_PX * 4 + 7;
    fireEvent.scroll(list);
    expect(onChange).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(120); });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });
});
