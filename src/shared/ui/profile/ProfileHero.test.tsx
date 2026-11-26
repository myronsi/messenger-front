import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileActions, ProfileBanner, ProfileTabs } from './ProfileHero';
import { profileHue } from './profileHue';

describe('profile hero parts', () => {
  it('gives the same name the same banner color', () => {
    expect(profileHue('Anna')).toBe(profileHue('Anna'));
    expect(profileHue('Anna')).toBeGreaterThanOrEqual(0);
    expect(profileHue('Anna')).toBeLessThan(360);
  });

  it('shows the name, the subtitle, the actions and the online dot', () => {
    render(<ProfileBanner seed="anna" online avatar={<img alt="Anna" />} title="Anna" subtitle="@anna · online now"
      actions={<button type="button">Mute</button>} />);
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('@anna · online now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(screen.getByTestId('profile-online-dot')).toBeInTheDocument();
  });

  it('shows a chosen background instead of the arcs', () => {
    const { container, rerender } = render(<ProfileBanner seed="anna" avatar={<img alt="" />} title="Anna" />);
    expect(container.querySelector('svg circle')).not.toBeNull();
    rerender(<ProfileBanner seed="anna" avatar={<img alt="" />} title="Anna" background={{ kind: 'preset', preset: 'ocean' }} />);
    expect(screen.getByTestId('profile-background-fill').style.backgroundImage).toContain('linear-gradient');
    expect(container.querySelector('svg circle')).toBeNull();
  });

  it('puts the primary action first and shows every action as a named icon button', () => {
    const onBlock = vi.fn();
    render(<ProfileActions tiles={[
      { key: 'block', label: 'Block', icon: <span />, danger: true, onClick: onBlock },
      { key: 'chat', label: 'Chat', icon: <span />, primary: true },
    ]} />);
    const buttons = within(screen.getByTestId('profile-action-tiles')).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Chat', 'Block']);
    expect(buttons.map((button) => button.textContent)).toEqual(['', '']);
    expect(buttons[0]).toHaveAttribute('title', 'Chat');
    expect(buttons[1]).toHaveClass('text-destructive');
    fireEvent.click(buttons[1]);
    expect(onBlock).toHaveBeenCalledOnce();
  });

  it('switches underline tabs', () => {
    const onSelect = vi.fn();
    render(<ProfileTabs tabs={[{ key: 'details', label: 'Info' }, { key: 'links', label: 'Links' }]} active="details" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Links' }));
    expect(onSelect).toHaveBeenCalledWith('links');
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
  });
});
