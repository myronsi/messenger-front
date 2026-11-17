import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MORPH_MS } from '../model/profileMorph';
import { MainTabPanes } from './MainTabPanes';

const box = (left: number, top: number, width: number, height: number) => () => (
  { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
const place = (rect: () => DOMRect) => (element: HTMLElement | null) => { if (element) element.getBoundingClientRect = rect; };

vi.mock('@/widgets/profile-panel', () => ({
  UserProfileComponentRTK: ({ onEditProfile }: { onEditProfile: () => void }) => (
    <div>
      <div data-morph="avatar" ref={place(box(20, 80, 112, 112))} />
      <div data-morph="name" data-morph-mode="move" ref={place(box(20, 200, 200, 30))} />
      <div data-morph="only-here" ref={place(box(0, 0, 10, 10))} />
      <button type="button" onClick={onEditProfile}>edit</button>
    </div>
  ),
  OwnProfileEditor: ({ onBack }: { onBack: () => void }) => (
    <div>
      <header data-morph-fade="">bar</header>
      <div data-morph="avatar" ref={place(box(20, 136, 112, 112))} />
      <div data-morph="name" data-morph-mode="move" ref={place(box(20, 256, 320, 36))} />
      <button type="button" onClick={onBack}>cancel</button>
    </div>
  ),
}));
vi.mock('@/widgets/main-nav', () => ({ CallsComingSoon: () => null }));
vi.mock('@/entities/chat', () => ({ useGetOneOnOneChatsQuery: () => ({ data: undefined }) }));
vi.mock('@/entities/user', () => ({ useGetUserByUsernameQuery: () => ({ data: undefined }) }));
vi.mock('@/shared/ui/profile/ProfileBackgroundFill', () => ({ ProfilePageBackdrop: () => null }));

const Harness = () => {
  const [editing, setEditing] = useState(false);
  return <MainTabPanes tab="profile" username="me" onShowChats={vi.fn()} onOpenGroup={vi.fn()} isEditingProfile={editing} setEditingProfile={setEditing} />;
};

describe('MainTabPanes profile to editor', () => {
  const animate = vi.fn();
  const original = Element.prototype.animate;
  beforeEach(() => {
    vi.useFakeTimers();
    animate.mockReset();
    Element.prototype.animate = animate as never;
  });
  afterEach(() => {
    vi.useRealTimers();
    Element.prototype.animate = original;
  });

  it('glides the shared parts from where they were and fades in the rest', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('edit'));
    const moves = animate.mock.calls.map(([frames]) => (frames as Keyframe[])[0].transform);
    expect(moves).toEqual(['translate(0px, -56px) scale(1, 1)', 'translate(0px, -56px) scale(1, 1)']);
    expect(screen.getByTestId('profile-stage')).toHaveClass('morph-enter');
    act(() => { vi.advanceTimersByTime(MORPH_MS + 200); });
    expect(screen.getByTestId('profile-stage')).not.toHaveClass('morph-enter');

    animate.mockReset();
    fireEvent.click(screen.getByText('cancel'));
    expect(animate.mock.calls.map(([frames]) => (frames as Keyframe[])[0].transform))
      .toEqual(['translate(0px, 56px) scale(1, 1)', 'translate(0px, 56px) scale(1, 1)']);
  });

  it('does not move anything when the user prefers less motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<Harness />);
    fireEvent.click(screen.getByText('edit'));
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByTestId('profile-stage')).not.toHaveClass('morph-enter');
    vi.unstubAllGlobals();
  });
});
