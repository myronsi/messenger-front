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

  it('puts the labeled primary action first and keeps the others as icon buttons', () => {
    const onBlock = vi.fn();
    render(<ProfileActions tiles={[
      { key: 'block', label: 'Block', icon: <span />, danger: true, onClick: onBlock },
      { key: 'chat', label: 'Chat', icon: <span />, primary: true },
    ]} />);
    const buttons = within(screen.getByTestId('profile-action-tiles')).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Chat', 'Block']);
    expect(buttons[0]).toHaveTextContent('Chat');
    expect(buttons[1]).toHaveTextContent('');
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
