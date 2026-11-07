import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';

const Broken = () => { throw new Error('Failed to fetch dynamically imported module'); };

describe('ChunkErrorBoundary', () => {
  it('shows the fallback instead of unmounting the rest of the app', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <div>
        <p>call panel</p>
        <ChunkErrorBoundary fallback={<p>unavailable</p>}><Broken /></ChunkErrorBoundary>
      </div>,
    );
    expect(screen.getByText('call panel')).toBeInTheDocument();
    expect(screen.getByText('unavailable')).toBeInTheDocument();
    error.mockRestore();
  });
});
