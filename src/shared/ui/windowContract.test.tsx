import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_GHOST_MS, setExitGhostsEnabled } from '@/shared/lib/useExitGhost';
import { ActionDialog } from './ActionDialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from './alert-dialog';
import ConfirmModal from './ConfirmModal';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { ModalSurface } from './ModalSurface';
import { Sheet, SheetContent, SheetTitle } from './sheet';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { cancel: 'Cancel', close: 'Close' } }) }));

type WindowKind = {
  name: string;
  render: (close: () => void) => ReactElement;
  opened: () => HTMLElement;
  pressOutside: () => void;
  openAnimation: (node: HTMLElement) => boolean;
};

const radixOutside = () => {
  const overlay = document.querySelector<HTMLElement>('[data-state="open"].fixed.inset-0:not([role="dialog"]):not([role="alertdialog"])');
  fireEvent.pointerDown(overlay ?? document.body);
  fireEvent.click(overlay ?? document.body);
};
const surfaceOutside = () => {
  const surface = document.querySelector<HTMLElement>('[data-modal-surface]:not([data-exit-ghost])')!;
  fireEvent.pointerDown(surface);
  fireEvent.click(surface);
};

const KINDS: WindowKind[] = [
  {
    name: 'Dialog',
    render: (close) => <Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent><DialogTitle>Window</DialogTitle></DialogContent></Dialog>,
    opened: () => screen.getByRole('dialog'),
    pressOutside: radixOutside,
    openAnimation: (node) => node.classList.contains('dialog-motion') && node.getAttribute('data-state') === 'open',
  },
  {
    name: 'AlertDialog',
    render: (close) => (
      <AlertDialog open onOpenChange={(open) => { if (!open) close(); }}>
        <AlertDialogContent><AlertDialogTitle>Window</AlertDialogTitle></AlertDialogContent>
      </AlertDialog>
    ),
    opened: () => screen.getByRole('alertdialog'),
    pressOutside: radixOutside,
    openAnimation: (node) => node.classList.contains('dialog-motion') && node.getAttribute('data-state') === 'open',
  },
  {
    name: 'Sheet',
    render: (close) => <Sheet open onOpenChange={(open) => { if (!open) close(); }}><SheetContent><SheetTitle>Window</SheetTitle></SheetContent></Sheet>,
    opened: () => screen.getByRole('dialog'),
    pressOutside: radixOutside,
    openAnimation: (node) => node.className.includes('data-[state=open]:animate-in') && node.getAttribute('data-state') === 'open',
  },
  {
    name: 'ModalSurface',
    render: (close) => <ModalSurface label="Window" onDismiss={close} className="fixed inset-0"><div>Inside</div></ModalSurface>,
    opened: () => screen.getByRole('dialog'),
    pressOutside: surfaceOutside,
    openAnimation: (node) => node.hasAttribute('data-modal-surface') && !node.hasAttribute('data-own-motion'),
  },
  {
    name: 'ActionDialog',
    render: (close) => <ActionDialog icon={null} title="Window" confirmText="OK" onConfirm={vi.fn()} onCancel={close} />,
    opened: () => screen.getByRole('dialog'),
    pressOutside: surfaceOutside,
    openAnimation: (node) => node.hasAttribute('data-modal-surface'),
  },
  {
    name: 'ConfirmModal',
    render: (close) => <ConfirmModal title="Window" message="Sure?" onConfirm={vi.fn()} onCancel={close} />,
    opened: () => screen.getByRole('dialog'),
    pressOutside: surfaceOutside,
    openAnimation: (node) => node.hasAttribute('data-modal-surface'),
  },
];

const SystemBack = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>system back</button>;
};
const routed = (children: ReactNode) => <MemoryRouter>{children}<SystemBack /></MemoryRouter>;

describe.each(KINDS)('$name follows the window rule', (kind) => {
  const width = window.innerWidth;
  beforeAll(() => setExitGhostsEnabled(true));
  afterAll(() => setExitGhostsEnabled(false));
  beforeEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width }));
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    vi.useRealTimers();
  });

  it('opens with an animation', () => {
    render(routed(kind.render(vi.fn())));
    expect(kind.openAnimation(kind.opened())).toBe(true);
  });

  it('closes on a click outside', async () => {
    const close = vi.fn();
    render(routed(kind.render(close)));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    kind.pressOutside();
    expect(close).toHaveBeenCalled();
  });

  it('closes with the phone back button', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const close = vi.fn();
    render(routed(kind.render(close)));
    await act(async () => { await Promise.resolve(); });
    act(() => screen.getByText('system back').click());
    expect(close).toHaveBeenCalled();
  });

  it('plays a closing animation even when it is removed at once', () => {
    vi.useFakeTimers();
    const earlier = new Set(document.body.querySelectorAll('[data-exit-ghost]'));
    const view = render(routed(kind.render(vi.fn())));
    view.rerender(routed(null));
    const ghosts = [...document.body.querySelectorAll<HTMLElement>('[data-exit-ghost]')].filter((ghost) => !earlier.has(ghost));
    expect(ghosts.length).toBeGreaterThan(0);
    expect(ghosts.every((ghost) => ghost.getAttribute('data-state') === 'closed' || ghost.classList.contains('exit-ghost'))).toBe(true);
    act(() => { vi.advanceTimersByTime(EXIT_GHOST_MS); });
    expect(ghosts.every((ghost) => !ghost.isConnected)).toBe(true);
  });
});
