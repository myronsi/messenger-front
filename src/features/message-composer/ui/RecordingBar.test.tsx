import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecordingBar from './RecordingBar';

vi.mock('./LiveWaveform', () => ({ default: () => <div data-testid="live-waveform" /> }));

const renderBar = (locked: boolean, paused = false) => {
  const onTogglePause = vi.fn();
  const onDiscard = vi.fn();
  render(<RecordingBar seconds={4} stream={null} locked={locked} paused={paused} pauseLabel="Pause" resumeLabel="Resume" onTogglePause={onTogglePause} onDiscard={onDiscard} />);
  return { onTogglePause, onDiscard };
};

describe('RecordingBar', () => {
  it('offers pause only once the recording is locked', () => {
    renderBar(false);
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.getByText('4s')).toBeInTheDocument();
  });

  it('pauses and resumes a locked recording', () => {
    const { onTogglePause } = renderBar(true);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('shows resume while paused', () => {
    renderBar(true, true);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });
});
