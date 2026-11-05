import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProfileTabHighlight } from './ProfileTabHighlight';

it('moves one highlight between the actual button positions instead of fading separate highlights', () => {
  const x = vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function(this: HTMLElement) {
    return this.dataset.profileTab === 'photos' ? 200 : 0;
  });
  const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80);
  const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(48);
  const content = (active: string) => <div><ProfileTabHighlight active={active} />
    <button data-profile-tab="details">Info</button><button data-profile-tab="photos">Photos</button></div>;
  try {
    const view = render(content('details'));
    const highlight = screen.getByTestId('profile-tab-highlight');
    expect(highlight.style.transform).toContain('var(--profile-swipe-next, 0) * 200px');
    expect(highlight.style.opacity).toBe('');
    view.rerender(content('photos'));
    expect(highlight.style.transform).toContain('calc(200px');
    expect(highlight.style.transform).toContain('var(--profile-swipe-previous, 0) * -200px');
  } finally {
    x.mockRestore(); width.mockRestore(); height.mockRestore();
  }
});

it('remeasures when sections load without changing the active section', () => {
  let buttonWidth = 120;
  const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => buttonWidth);
  const x = vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function(this: HTMLElement) {
    return this.dataset.profileTab === 'photos' ? buttonWidth * 2 : 0;
  });
  const content = (loaded: boolean) => <div><ProfileTabHighlight active="details" layoutKey={String(loaded)} />
    <button data-profile-tab="details">Info</button><button>Participants</button>
    {loaded && <button data-profile-tab="photos">Photos</button>}</div>;
  try {
    const view = render(content(false));
    const highlight = screen.getByTestId('profile-tab-highlight');
    expect(highlight.style.width).toContain('120px');
    buttonWidth = 80;
    view.rerender(content(true));
    expect(highlight.style.width).toContain('80px');
    expect(highlight.style.transform).toContain('var(--profile-swipe-next, 0) * 160px');
  } finally {
    width.mockRestore(); x.mockRestore();
  }
});
