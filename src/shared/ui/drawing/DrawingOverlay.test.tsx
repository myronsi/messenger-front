import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrawingOverlay } from './DrawingOverlay';

const drawing = {
  version: 1,
  items: [
    { type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0.1, 0.2, 0.3, 0.4] },
    { type: 'text' as const, color: '#0000ff', x: 0.5, y: 0.5, size: 0.05, text: 'first\nsecond' },
  ],
};

describe('DrawingOverlay', () => {
  it('draws strokes and multi-line labels in image coordinates', () => {
    const { container } = render(<DrawingOverlay drawing={drawing} aspect={2} />);
    const svg = screen.getByTestId('drawing-overlay');
    expect(svg).toHaveAttribute('viewBox', '0 0 1000 500');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
    expect(container.querySelector('path')).toHaveAttribute('d', 'M 100 100 L 100 100 L 300 200');
    expect([...container.querySelectorAll('tspan')].map((line) => line.textContent)).toEqual(['first', 'second']);
  });

  it('fits like the image it covers', () => {
    render(<DrawingOverlay drawing={drawing} aspect={1} fit="contain" />);
    expect(screen.getByTestId('drawing-overlay')).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });

  it('draws nothing without a drawing or a known image shape', () => {
    const { container, rerender } = render(<DrawingOverlay drawing={drawing} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DrawingOverlay drawing={{ version: 1, items: [] }} aspect={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
