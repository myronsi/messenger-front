import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionTiles, BioBubble, PillTabs, WaveHeader } from './ProfileHero';
import { profileHue } from './profileHue';

describe('profile hero parts', () => {
  it('gives the same name the same wave color', () => {
    expect(profileHue('Anna')).toBe(profileHue('Anna'));
    expect(profileHue('Anna')).toBeGreaterThanOrEqual(0);
    expect(profileHue('Anna')).toBeLessThan(360);
  });

  it('shows the name, the status and the online dot', () => {
    render(<WaveHeader seed="anna" online avatar={<img alt="Anna" />} title="Anna" status="online now" />);
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('online now')).toBeInTheDocument();
    expect(screen.getByTestId('profile-online-dot')).toBeInTheDocument();
  });

  it('runs a tile action and switches pill tabs', () => {
    const onChat = vi.fn();
    const onSelect = vi.fn();
    render(<>
      <ActionTiles tiles={[{ key: 'chat', label: 'Chat', icon: <span />, onClick: onChat }]} />
      <BioBubble text="hello" />
      <PillTabs tabs={[{ key: 'media', label: 'Media' }, { key: 'links', label: 'Links' }]} active="media" onSelect={onSelect} />
    </>);
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Links' }));
    expect(onChat).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith('links');
    expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-bio-bubble')).toHaveTextContent('hello');
  });

  it('hides the tab row when there is only one tab', () => {
    render(<PillTabs tabs={[{ key: 'details', label: 'Info' }]} active="details" onSelect={vi.fn()} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
